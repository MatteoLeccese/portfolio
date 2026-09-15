// src/domains/core/seo/routes.test.ts
import { describe, expect, it } from "vitest";

import { DEFAULT_LOCALE, LOCALES } from "@/domains/core/config/locales";
import type { Locale } from "@/domains/core/types";

/**
 * The origin every assertion is written against. site.ts reads NEXT_PUBLIC_SITE_URL once,
 * at module load, so it is assigned before the dynamic imports below.
 */
const ORIGIN = "https://matteoleccese.com";

process.env.NEXT_PUBLIC_SITE_URL = ORIGIN;

const {
  absoluteUrl,
  CONTENT_LAST_MODIFIED,
  languageAlternates,
  localizedPath,
  SITE_ROUTES,
} = await import("@/domains/core/seo/routes");

const { buildPageMetadata } = await import("@/domains/core/seo/metadata");

/** Every route in every locale: the six URLs the sitemap and the hreflang maps cover. */
const EVERY_PAGE = SITE_ROUTES.flatMap((route) => LOCALES.map((locale) => ({ route, locale })));

describe("SITE_ROUTES", () => {
  it("lists the three indexable routes in sitemap order", () => {
    expect([ ...SITE_ROUTES ]).toEqual([ "/", "/privacy", "/cookies" ]);
  });

  it("covers six pages once each", () => {
    expect(EVERY_PAGE).toHaveLength(6);
    expect(new Set(EVERY_PAGE.map((page) => `${page.locale}${page.route}`)).size).toBe(6);
  });
});

describe("localizedPath", () => {
  it("prefixes as-needed: the default locale has no prefix", () => {
    expect(localizedPath("/", "en")).toBe("/");
    expect(localizedPath("/privacy", "en")).toBe("/privacy");
    expect(localizedPath("/cookies", "en")).toBe("/cookies");
  });

  it("prefixes every other locale, root included", () => {
    expect(localizedPath("/", "es")).toBe("/es");
    expect(localizedPath("/privacy", "es")).toBe("/es/privacy");
    expect(localizedPath("/cookies", "es")).toBe("/es/cookies");
  });

  it("never emits an /en segment", () => {
    for (const { route, locale } of EVERY_PAGE) {
      expect(localizedPath(route, locale)).not.toMatch(/^\/en(?:\/|$)/);
    }
  });

  it("gives every page a distinct path", () => {
    const paths = EVERY_PAGE.map(({ route, locale }) => localizedPath(route, locale));

    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe("absoluteUrl", () => {
  it("keeps the trailing slash of the root and of nothing else", () => {
    expect(absoluteUrl("/")).toBe(`${ORIGIN}/`);
    expect(absoluteUrl("/es")).toBe(`${ORIGIN}/es`);
    expect(absoluteUrl("/es/privacy")).toBe(`${ORIGIN}/es/privacy`);
  });

  it("produces no double slash in the path of any page", () => {
    for (const { route, locale } of EVERY_PAGE) {
      const url = absoluteUrl(localizedPath(route, locale));

      expect(url.startsWith(`${ORIGIN}/`)).toBe(true);
      expect(url.slice(ORIGIN.length)).not.toMatch(/\/\//);
    }
  });

  it("parses as an absolute https URL", () => {
    for (const { route, locale } of EVERY_PAGE) {
      const url = new URL(absoluteUrl(localizedPath(route, locale)));

      expect(url.protocol).toBe("https:");
      expect(url.host).toBe("matteoleccese.com");
    }
  });
});

describe("languageAlternates", () => {
  it("declares every locale plus x-default, and nothing else", () => {
    for (const route of SITE_ROUTES) {
      expect(Object.keys(languageAlternates(route)).sort()).toEqual([ "en", "es", "x-default" ]);
    }
  });

  it("points x-default at the default locale", () => {
    for (const route of SITE_ROUTES) {
      const languages = languageAlternates(route);

      expect(languages[ "x-default" ]).toBe(languages[ DEFAULT_LOCALE ]);
    }
  });

  it("gives each locale the absolute URL of its own path", () => {
    for (const route of SITE_ROUTES) {
      const languages = languageAlternates(route);

      for (const locale of LOCALES) {
        expect(languages[ locale ]).toBe(absoluteUrl(localizedPath(route, locale)));
      }
    }
  });

  it("names the English home as / and never as /en", () => {
    const home = languageAlternates("/");

    expect(home.en).toBe(`${ORIGIN}/`);
    expect(home[ "x-default" ]).toBe(`${ORIGIN}/`);
    expect(home.es).toBe(`${ORIGIN}/es`);
  });
});

describe("CONTENT_LAST_MODIFIED", () => {
  it("is a calendar day the sitemap can print", () => {
    expect(CONTENT_LAST_MODIFIED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(`${CONTENT_LAST_MODIFIED}T00:00:00Z`).toISOString())
      .toBe(`${CONTENT_LAST_MODIFIED}T00:00:00.000Z`);
  });
});

/** The fixed copy every metadata assertion is built from. */
const COPY = { title: "Title", description: "Description" };

function metadataFor (route: (typeof SITE_ROUTES)[ number ], locale: Locale) {
  return buildPageMetadata({ locale, route, ...COPY, indexable: true });
}

describe("buildPageMetadata", () => {
  it("emits the canonical absoluteUrl(localizedPath()) produces", () => {
    for (const { route, locale } of EVERY_PAGE) {
      expect(metadataFor(route, locale).alternates?.canonical)
        .toBe(absoluteUrl(localizedPath(route, locale)));
    }
  });

  it("emits the same hreflang map as languageAlternates", () => {
    for (const { route, locale } of EVERY_PAGE) {
      expect(metadataFor(route, locale).alternates?.languages).toEqual(languageAlternates(route));
    }
  });

  it("gives Open Graph the canonical URL", () => {
    for (const { route, locale } of EVERY_PAGE) {
      const metadata = metadataFor(route, locale);

      expect(metadata.openGraph).toMatchObject({ url: metadata.alternates?.canonical });
    }
  });

  it("mentions no /en URL anywhere in its output", () => {
    for (const { route, locale } of EVERY_PAGE) {
      expect(JSON.stringify(metadataFor(route, locale))).not.toContain(`${ORIGIN}/en`);
    }
  });

  it("is pure: the same input gives the same output", () => {
    expect(metadataFor("/privacy", "es")).toEqual(metadataFor("/privacy", "es"));
  });

  it("opens the site to robots only when it is indexable", () => {
    const open = buildPageMetadata({ locale: "en", route: "/", ...COPY, indexable: true });
    const closed = buildPageMetadata({ locale: "en", route: "/", ...COPY, indexable: false });

    expect(open.robots).toMatchObject({
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    });
    expect(closed.robots).toEqual({ index: false, follow: false, nocache: true });
  });

  it("emits a title template only when one is given", () => {
    expect(metadataFor("/privacy", "en").title).toBe(COPY.title);
    expect(
      buildPageMetadata({
        locale: "en",
        route: "/",
        ...COPY,
        indexable: true,
        titleTemplate: "%s · Matteo Leccese",
      }).title,
    ).toEqual({ default: COPY.title, template: "%s · Matteo Leccese" });
  });

  it("types the home as a profile and everything else as an article", () => {
    expect(metadataFor("/privacy", "en").openGraph).toMatchObject({ type: "article" });
    expect(
      buildPageMetadata({ locale: "en", route: "/", ...COPY, indexable: true, ogType: "profile" })
        .openGraph,
    ).toMatchObject({ type: "profile", firstName: "Matteo", lastName: "Leccese" });
  });

  it("declares the other locales as Open Graph alternates", () => {
    expect(metadataFor("/", "en").openGraph).toMatchObject({
      locale: "en_US",
      alternateLocale: [ "es_ES" ],
    });
    expect(metadataFor("/", "es").openGraph).toMatchObject({
      locale: "es_ES",
      alternateLocale: [ "en_US" ],
    });
  });

  it("drops the generator meta and asks for a large Twitter card", () => {
    const metadata = metadataFor("/", "en");

    expect(metadata.generator).toBeNull();
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image", title: COPY.title });
    expect(metadata.formatDetection).toEqual({ email: false, address: false, telephone: false });
  });
});
