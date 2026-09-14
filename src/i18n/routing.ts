// src/i18n/routing.ts
import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES } from "@/domains/core/config/locales";

/**
 * Bilingual routing, English by default.
 *
 * localePrefix "as-needed"  -> "/" is English, "/es" is Spanish, "/en" 307s to "/".
 * localeDetection false     -> "/" is ALWAYS English. With detection on, the same URL
 *                              returns two different documents depending on an HTTP
 *                              header, which breaks canonicality and CDN caching.
 * localeCookie false        -> MANDATORY. next-intl writes NEXT_LOCALE even when
 *                              localeDetection is off: syncCookie() only reads
 *                              routing.localeCookie. This line is what keeps the cookie
 *                              policy true. Do not remove without updating /cookies and
 *                              re-running tests/e2e/cookies.spec.ts.
 * alternateLinks false      -> language alternates are declared once, in the HTML.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "as-needed",
  localeDetection: false,
  localeCookie: false,
  alternateLinks: false,
});
