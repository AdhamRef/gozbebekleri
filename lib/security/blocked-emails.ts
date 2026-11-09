/**
 * Email domains that may never sign up, sign in, donate or perform any other
 * action on the platform.
 *
 * Built-in rule: any domain whose registrable label is `example` — i.e.
 * `example.com`, `example.net`, `example.org`, `example.co.uk`, … and every
 * subdomain of those (`mail.example.com`). These are reserved documentation
 * domains (RFC 2606) that no real donor can own, and were used to spam
 * donations.
 *
 * Extra domains can be added without a deploy via the comma-separated
 * `BLOCKED_EMAIL_DOMAINS` env var (each entry also blocks its subdomains).
 */

/** Matches `example.<tld>` / `example.<sld>.<tld>` and any subdomain of them. */
const EXAMPLE_DOMAIN_RE = /(^|\.)example\.[a-z]{2,}(\.[a-z]{2,})?$/;

function extraBlockedDomains(): string[] {
  return (process.env.BLOCKED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, "").replace(/\.$/, ""))
    .filter(Boolean);
}

/** Returns the normalized domain part of an email, or null if there is none. */
function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase()
    .replace(/\.+$/, ""); // trailing-dot FQDN form: "example.com."
  return domain || null;
}

export function isBlockedEmail(email: unknown): boolean {
  if (typeof email !== "string") return false;
  const domain = emailDomain(email);
  if (!domain) return false;
  if (EXAMPLE_DOMAIN_RE.test(domain)) return true;
  return extraBlockedDomains().some((d) => domain === d || domain.endsWith(`.${d}`));
}

export const BLOCKED_EMAIL_ERROR = "EMAIL_NOT_ALLOWED";

export class BlockedEmailError extends Error {
  constructor() {
    super(BLOCKED_EMAIL_ERROR);
    this.name = "BlockedEmailError";
  }
}
