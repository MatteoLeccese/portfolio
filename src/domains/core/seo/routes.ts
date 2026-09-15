// src/domains/core/seo/routes.ts
import { DEFAULT_LOCALE, LOCALES } from "@/domains/core/config/locales";
import { SITE } from "@/domains/core/config/site";
import type { IsoDate, Locale } from "@/domains/core/types";

/**
 * The URL surface of the site: the path of every indexable route in every locale, its
 * absolute form and its hreflang map. The sitemap, the three generateMetadata and the
 * JSON-LD graphs read from here.
 */

/** Every indexable route of the site, in sitemap order. */
export const SITE_ROUTES = [ "/", "/privacy", "/cookies" ] as const;

export type SiteRoute = (typeof SITE_ROUTES)[ number ];

/** The routes that render a legal document. */
export type LegalRoute = Extract<SiteRoute, "/privacy" | "/cookies">;

/**
 * The date the content of the site last changed. The sitemap prints it as lastmod and the
 * graphs as dateModified.
 */
export const CONTENT_LAST_MODIFIED: IsoDate = "2026-09-10";

/**
 * The path of a route in one locale, prefixed the way localePrefix "as-needed" prefixes
 * it: the default locale carries no prefix.
 *
 * localizedPath("/privacy", "en") -> "/privacy"
 * localizedPath("/privacy", "es") -> "/es/privacy"
 * localizedPath("/", "es")        -> "/es"
 */
export function localizedPath (route: SiteRoute, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return route;

  return route === "/" ? `/${locale}` : `/${locale}${route}`;
}

/** The absolute URL of a site path. No trailing slash except on the root. */
export function absoluteUrl (path: string): string {
  return path === "/" ? `${SITE.url}/` : `${SITE.url}${path}`;
}

/** The hreflang map of a route: every locale plus an x-default on the default locale. */
export function languageAlternates (route: SiteRoute): Record<string, string> {
  const languages: Record<string, string> = {};

  for (const locale of LOCALES) {
    languages[ locale ] = absoluteUrl(localizedPath(route, locale));
  }

  languages[ "x-default" ] = absoluteUrl(localizedPath(route, DEFAULT_LOCALE));

  return languages;
}
