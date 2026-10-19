import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function authFixture(existing: boolean, providerFails = false) {
  const sent: unknown[] = [];
  let creates = 0;
  const prisma = { user: {
    findUnique: async () => existing ? { id: 'existing-user', email: 'test@example.org', preferredLang: 'en' } : null,
    update: async () => ({}),
    create: async () => { creates++; return { id: 'new-user', email: 'test@example.org', name: 'Test', role: 'DONOR' }; },
  } };
  const mocks: Record<string, unknown> = {
    '@auth/prisma-adapter': { PrismaAdapter: () => ({}) }, '@/lib/prisma': { prisma },
    'next-auth/providers/google': (config: unknown) => config,
    'next-auth/providers/facebook': (config: unknown) => config,
    'next-auth/providers/credentials': (config: unknown) => config,
    'bcryptjs': {}, 'next/headers': { cookies: async () => ({ get: () => ({ value: 'en' }) }) },
    'google-auth-library': { OAuth2Client: class {
      async verifyIdToken() { return { getPayload: () => ({ email: 'test@example.org', email_verified: true, name: 'Test' }) }; }
    } },
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
    const ok = await fixture.options.callbacks.signIn({ user: { email:'test@example.org', name:'Test' }, account:{type:'oauth'}, profile:{} });
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

test('notification provider failure never blocks successful account creation', async () => {
  const fixture = authFixture(false, true);
  assert.equal(await fixture.options.callbacks.signIn({ user:{email:'test@example.org',name:'Test'}, account:{type:'oauth'}, profile:{} }), true);
});
