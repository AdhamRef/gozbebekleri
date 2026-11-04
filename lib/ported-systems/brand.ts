import { SITE_NAME, SITE_URL } from "@/lib/seo";
export const SYSTEM_BRAND_NAME = SITE_NAME;
const configuredOrigin = process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || SITE_URL;
export const SYSTEM_ORIGIN = new URL(configuredOrigin).origin;
export const SYSTEM_LOGO_PATH = process.env.NEXT_PUBLIC_SYSTEM_LOGO_PATH || "/logo.png";
export const SYSTEM_HOSTS = new Set([
  new URL(SYSTEM_ORIGIN).hostname,
  new URL(SYSTEM_ORIGIN).hostname.replace(/^www\./i, ""),
  "www." + new URL(SYSTEM_ORIGIN).hostname.replace(/^www\./i, ""),
]);
export const SYSTEM_ORG = {
  orgLegalName: process.env.SYSTEM_ORG_LEGAL_NAME || SYSTEM_BRAND_NAME,
  taxNo: process.env.SYSTEM_ORG_TAX_NUMBER || "",
  orgAddress: process.env.SYSTEM_ORG_ADDRESS || "",
  orgContact: process.env.SYSTEM_ORG_CONTACT || "",
};
