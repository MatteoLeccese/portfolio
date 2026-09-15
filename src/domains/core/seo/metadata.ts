// src/domains/core/seo/metadata.ts
import type { Metadata } from "next";
import { LOCALES } from "@/domains/core/config/locales";
import { SITE } from "@/domains/core/config/site";
import type { Locale } from "@/domains/core/types";
import { absoluteUrl, languageAlternates, localizedPath, type SiteRoute } from "./routes";

/**
 * The Metadata object of a page: title, description, canonical, hreflang map, robots
 * directives, Open Graph and Twitter card. It takes its copy already translated and its
 * indexability already resolved, and reads no request state.
 */

/** Open Graph locale codes, keyed by app locale. */
const OG_LOCALE: Record<Locale, string> = { en: "en_US", es: "es_ES" };

export type PageMetadataInput = {
  locale: Locale;
  route: SiteRoute;

  /** Already translated. This function never calls getTranslations. */
  title: string;
  description: string;

  /** The result of isIndexable(). */
  indexable: boolean;

  /** When given, the title is emitted as { default, template } instead of a plain string. */
  titleTemplate?: string;

  /** The Open Graph type. The home is a profile; the legal pages are articles. */
  ogType?: "profile" | "article";
};

function robotsFor (indexable: boolean): Metadata[ "robots" ] {
  if (!indexable) return { index: false, follow: false, nocache: true };

  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  };
}

export function buildPageMetadata (input: PageMetadataInput): Metadata {
  const { locale, route, title, description, indexable, titleTemplate, ogType = "article" } = input;
  const canonical = absoluteUrl(localizedPath(route, locale));
  const alternateLocale = LOCALES
    .filter((other) => other !== locale)
    .map((other) => OG_LOCALE[ other ]);

  return {
    title: titleTemplate === undefined ? title : { default: title, template: titleTemplate },
    description,
    applicationName: SITE.name,
    authors: [ { name: SITE.name, url: absoluteUrl("/") } ],
    generator: null,
    formatDetection: { email: false, address: false, telephone: false },
    alternates: { canonical, languages: languageAlternates(route) },
    robots: robotsFor(indexable),
    openGraph: {
      type: ogType,
      siteName: SITE.name,
      title,
      description,
      url: canonical,
      locale: OG_LOCALE[ locale ],
      alternateLocale,
      ...(ogType === "profile" ? { firstName: "Matteo", lastName: "Leccese" } : {}),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}
