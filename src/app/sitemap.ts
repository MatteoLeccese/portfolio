// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { LOCALES } from "@/domains/core/config/locales";
import {
  CONTENT_LAST_MODIFIED,
  SITE_ROUTES,
  absoluteUrl,
  languageAlternates,
  localizedPath,
} from "@/domains/core/seo/routes";

/**
 * /sitemap.xml. One entry per route and locale — six URLs — each carrying the same
 * lastmod and the same three hreflang alternates (`en`, `es`, `x-default`) that the
 * corresponding page declares in its head.
 *
 * No priority and no changeFrequency.
 */
export default function sitemap (): MetadataRoute.Sitemap {
  return SITE_ROUTES.flatMap((route) => {
    const languages = languageAlternates(route);

    return LOCALES.map((locale) => ({
      url: absoluteUrl(localizedPath(route, locale)),
      lastModified: CONTENT_LAST_MODIFIED,
      alternates: { languages },
    }));
  });
}
