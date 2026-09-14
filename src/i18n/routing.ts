// src/i18n/routing.ts
import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES } from "@/domains/core/config/locales";

/**
 * Bilingual routing, English by default.
 *
 * localePrefix "as-needed"  -> "/" is English, "/es" is Spanish, "/en" 307s to "/".
 * localeDetection false     -> "/" is always English, whatever Accept-Language says.
 * localeCookie false        -> next-intl writes no NEXT_LOCALE cookie. It writes one even
 *                              when localeDetection is off, so this line is what keeps
 *                              the site down to the single cookie /cookies declares.
 * alternateLinks false      -> no Link headers; the language alternates are declared
 *                              once, in the HTML.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "as-needed",
  localeDetection: false,
  localeCookie: false,
  alternateLinks: false,
});
