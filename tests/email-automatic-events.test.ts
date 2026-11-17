import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as blockedEmails from '../lib/security/blocked-emails';

// Fixture emails use the reserved `.test` TLD — `example.*` domains are blocked
// from signing in at all (lib/security/blocked-emails.ts).
function authFixture(existing: boolean, providerFails = false, email = 'test@donor.test') {
  const sent: unknown[] = [];
  let creates = 0;
  const prisma = { user: {
    findUnique: async () => existing ? { id: 'existing-user', email: 'test@donor.test', preferredLang: 'en' } : null,
    update: async () => ({}),
    create: async () => { creates++; return { id: 'new-user', email: 'test@donor.test', name: 'Test', role: 'DONOR' }; },
  } };
  const mocks: Record<string, unknown> = {
    '@auth/prisma-adapter': { PrismaAdapter: () => ({}) }, '@/lib/prisma': { prisma },
    'next-auth/providers/google': (config: unknown) => config,
    'next-auth/providers/facebook': (config: unknown) => config,
    'next-auth/providers/credentials': (config: unknown) => config,
    'bcryptjs': {}, 'next/headers': { cookies: async () => ({ get: () => ({ value: 'en' }) }) },
    'google-auth-library': { OAuth2Client: class {
      async verifyIdToken() { return { getPayload: () => ({ email, email_verified: true, name: 'Test' }) }; }
    } },
    // The real module, so these tests exercise the actual blocking rules.
    '@/lib/security/blocked-emails': blockedEmails,
    '@/lib/otp': {}, '@/lib/locales': { isValidLocale: () => true, DEFAULT_LOCALE: 'ar' },
    '@/lib/events/dispatch': { dispatchEvent: async (...args: unknown[]) => { sent.push(args); if (providerFails) throw new Error('provider unavailable'); } },
  };
  const fixture = { exports: {} as { authOptions: any } };
  const output = ts.transpileModule(readFileSync('app/api/auth/[...nextauth]/options.ts','utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  runInNewContext(output, { module: fixture, exports: fixture.exports, process: { env: { GOOGLE_CLIENT_ID: "test-only", GOOGLE_CLIENT_SECRET: "test-only", NEXTAUTH_SECRET: "test-only" } },
    Date, console: { error() {} }, require: (name: string) => {
      if (!(name in mocks)) throw new Error(`Unexpected dependency: ${name}`);
      return mocks[name];
    },
  });
  return { options: fixture.exports.authOptions, sent, getCreates: () => creates };
}

test('new OAuth account dispatches welcome once after persistence; existing account does not', async () => {
  for (const existing of [false, true]) {
    const fixture = authFixture(existing);
    const ok = await fixture.options.callbacks.signIn({ user: { email:'test@donor.test', name:'Test' }, account:{type:'oauth'}, profile:{} });
    assert.equal(ok, true);
    assert.equal(fixture.getCreates(), existing ? 0 : 1);
    assert.equal(fixture.sent.length, existing ? 0 : 1);
    if (!existing) assert.equal(JSON.stringify(fixture.sent[0]), JSON.stringify(['USER_REGISTERED', {userId:'new-user'}]));
  }
});

test('Google One Tap dispatches welcome only for a newly created account', async () => {
  for (const existing of [false, true]) {
    const fixture = authFixture(existing);
    const provider = fixture.options.providers.find((p: any) => p.id === 'google-onetap');
    const user = await provider.authorize({ idToken:'test-only' });
    assert.ok(user);
    assert.equal(fixture.sent.length, existing ? 0 : 1);
  }
});

test('blocked example.* emails cannot sign in or create an account by any provider', async () => {
  for (const email of ['spam@example.com', 'spam@EXAMPLE.net', 'spam@mail.example.org']) {
    const oauth = authFixture(false, false, email);
    assert.equal(await oauth.options.callbacks.signIn({ user:{ email, name:'Spam' }, account:{type:'oauth'}, profile:{} }), false);
    assert.equal(oauth.getCreates(), 0);
    assert.equal(oauth.sent.length, 0);

    const oneTap = authFixture(false, false, email);
    const provider = oneTap.options.providers.find((p: any) => p.id === 'google-onetap');
    assert.equal(await provider.authorize({ idToken:'test-only' }), null);
    assert.equal(oneTap.getCreates(), 0);

    const credentials = authFixture(true, false, email);
    const password = credentials.options.providers.find((p: any) => p.id === 'credentials');
    assert.equal(await password.authorize({ email, password:'x' }), null);

    await assert.rejects(() => credentials.options.callbacks.jwt({ token:{ email, sub:'existing-user' } }));
  }
});

test('notification provider failure never blocks successful account creation', async () => {
  const fixture = authFixture(false, true);
  assert.equal(await fixture.options.callbacks.signIn({ user:{email:'test@donor.test',name:'Test'}, account:{type:'oauth'}, profile:{} }), true);
});
