import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import {
  ALLOWED_URL_CURRENCIES,
  normalizeCurrencyParamToCookie,
} from '@/lib/currency-link';

const intl = createIntlMiddleware({
  locales: ['ar', 'en', 'fr', 'tr', 'id', 'pt', 'es', 'de'],
  defaultLocale: 'ar',
  localePrefix: 'always',
});

const CURRENCY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Runs before SSR so the page renders with `currency` already in cookies —
// otherwise scripts/pixels would fire with the default (USD) before the
// client-side `?currency=` sync catches up.
export default function middleware(req: NextRequest) {
  const currencyParam = req.nextUrl.searchParams.get('currency');
  let normalized: string | null = null;
  if (currencyParam) {
    const upper = currencyParam.toUpperCase();
    if (ALLOWED_URL_CURRENCIES.has(upper)) {
      normalized = normalizeCurrencyParamToCookie(upper);
      // Update the request cookies so anything that reads cookies() during SSR
      // (e.g. server-side currency helpers) sees the new value immediately.
      req.cookies.set('currency', normalized);
    }
  }

  const response = intl(req) ?? NextResponse.next();

  if (normalized) {
    response.cookies.set('currency', normalized, {
      maxAge: CURRENCY_COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
    });
  }

  return response;
}

export const config = {
  // Skip all paths that should not be internationalized. This example skips the
  // folders "api", "_next" and all files with an extension (e.g. favicon.ico)
  matcher: ['/', '/(ar|en|fr|tr|id|pt|es|de)/:path*']
};
