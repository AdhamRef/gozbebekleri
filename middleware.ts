
import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  // A list of all locales that are supported
  locales: ['ar'],
  
  // Used when no locale matches
  defaultLocale: 'ar', // Ensure Arabic is the default
  localePrefix: 'always'
  
  // Optional: Specify domains with different locales
  // domains: [
  //   {
  //     domain: 'example.com',
  //     defaultLocale: 'en'
  //   },
  //   {
  //     domain: 'example.fr',
  //     defaultLocale: 'fr'
  //   }
  // ]
});
 
export const config = {
  // Skip all paths that should not be internationalized. This example skips the
  // folders "api", "_next" and all files with an extension (e.g. favicon.ico)
  matcher: ['/', '/(ar)/:path*']
};