// src/app/robots.ts
import type { MetadataRoute } from "next";
import { SITE, isIndexable } from "@/domains/core/config/site";

/**
 * /robots.txt.
 *
 * Outside an indexable deployment the whole site is disallowed and nothing else is
 * emitted. On an indexable one every path but /api/ is allowed, and the sitemap and the
 * canonical host are declared.
 *
 * No crawler is named: there is no AI-crawler block list.
 */
export default function robots (): MetadataRoute.Robots {
  if (!isIndexable()) {
    return { rules: [ { userAgent: "*", disallow: "/" } ] };
  }

  return {
    rules: [ { userAgent: "*", allow: "/", disallow: [ "/api/" ] } ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
