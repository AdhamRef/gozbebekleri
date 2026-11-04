import { routeForPathname } from "../minbar/routes";
import { SYSTEM_ORIGIN, SYSTEM_HOSTS } from "@/lib/ported-systems/brand";
const DONATION_PAGES = new Set(["projects", "projectDetail", "zakat", "waqf", "recurring"]);
export function publicDonationUrl(value: string): URL | null {
  try {
    const url = new URL(value, SYSTEM_ORIGIN);
    if (url.protocol !== "https:" || !SYSTEM_HOSTS.has(url.hostname) || url.username || url.password) return null;
    if (/\/(?:api|dashboard|auth|login|receipt|certificates?|success|failure)(?:\/|$)/i.test(url.pathname)) return null;
    if ([...url.searchParams.keys()].some(key => /^(?:t|token|accessToken|signature|orderId|donationId)$/i.test(key))) return null;
    const page = routeForPathname(decodeURIComponent(url.pathname));
    if ((!page || !DONATION_PAGES.has(page)) && !/\/(?:projeler|projects|bagislar|donate|donations|campaigns|campaign)(?:\/|$)/i.test(url.pathname)) return null;
    return url;
  } catch { return null; }
}
