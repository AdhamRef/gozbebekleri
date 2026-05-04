/**
 * Server-side USD conversion using the same ExchangeRate-API v6 "latest/USD"
 * feed as the web app (1 USD = rate[currency] units of foreign currency).
 */

const BASE = "USD";
const CACHE_MS = 60 * 60 * 1000;

type RatesCache = { rates: Record<string, number>; fetchedAt: number };

let memoryCache: RatesCache | null = null;

function apiKey(): string {
  return process.env.EXCHANGE_RATE_API_KEY?.trim() || "db9e1f2395aac69fe3648487";
}

export function normalizeDonationCurrencyCode(currency: string): string {
  const c = String(currency || "")
    .trim()
    .toUpperCase();
  if (!c || c === "DEFAULT") return "USD";
  return c;
}

async function fetchLatestRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (memoryCache && now - memoryCache.fetchedAt < CACHE_MS) {
    return memoryCache.rates;
  }

  const url = `https://v6.exchangerate-api.com/v6/${apiKey()}/latest/${BASE}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Exchange rate API HTTP ${res.status}`);
  }
  const data = (await res.json()) as { result?: string; conversion_rates?: Record<string, number> };
  if (data.result !== "success" || !data.conversion_rates) {
    throw new Error("Exchange rate API returned invalid payload");
  }

  memoryCache = { rates: data.conversion_rates, fetchedAt: now };
  return data.conversion_rates;
}

/**
 * Converts an amount expressed in `currency` (donation/payment currency) to USD.
 * Uses the same convention as `useConvetToUSD`: amount_foreign / rate = USD.
 */
export async function convertAmountInCurrencyToUsd(
  amount: number,
  currency: string
): Promise<number> {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  const code = normalizeDonationCurrencyCode(currency);
  if (code === "USD") return n;

  const rates = await fetchLatestRates();
  const rate = rates[code];
  if (!rate || !Number.isFinite(rate) || rate <= 0) {
    throw new Error(`No exchange rate for currency: ${code}`);
  }
  return n / rate;
}
