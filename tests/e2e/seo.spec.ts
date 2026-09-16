// tests/e2e/seo.spec.ts
import { expect, test } from "@playwright/test";

/**
 * What a crawler is handed: the canonical and the hreflang set of every indexable page,
 * the Open Graph image behind the URL those pages advertise, the sitemap, robots.txt,
 * the JSON-LD block, the two prefixed redirects and the 404.
 */

/** One indexable page, with the head it has to declare. `alternates` is keyed by hreflang. */
interface PageContract {
  path: string;
  canonical: string;
  alternates: Record<string, string>;
}

const HOME_ALTERNATES = { en: "/", es: "/es", "x-default": "/" };
const PRIVACY_ALTERNATES = { en: "/privacy", es: "/es/privacy", "x-default": "/privacy" };
const COOKIES_ALTERNATES = { en: "/cookies", es: "/es/cookies", "x-default": "/cookies" };

/** The six pages of the site, in sitemap order. */
const PAGES: readonly PageContract[] = [
  { path: "/", canonical: "/", alternates: HOME_ALTERNATES },
  { path: "/es", canonical: "/es", alternates: HOME_ALTERNATES },
  { path: "/privacy", canonical: "/privacy", alternates: PRIVACY_ALTERNATES },
  { path: "/es/privacy", canonical: "/es/privacy", alternates: PRIVACY_ALTERNATES },
  { path: "/cookies", canonical: "/cookies", alternates: COOKIES_ALTERNATES },
  { path: "/es/cookies", canonical: "/es/cookies", alternates: COOKIES_ALTERNATES },
];

/** The hreflang values every page has to carry, and nothing else. */
const EXPECTED_HREFLANGS = [ "en", "es", "x-default" ];

/** The prefixed English routes, and the unprefixed path each one sends a crawler to. */
const PREFIXED_ROUTES = [
  { from: "/en", to: "/" },
  { from: "/en/privacy", to: "/privacy" },
];

/** A path no route and no static file answers. */
const UNKNOWN_PATH = "/this-path-is-not-a-route";

/** The shape of the JSON-LD block, as far as this spec reads it. */
interface JsonLdDocument {
  "@context"?: string;
  "@graph"?: { url?: string; }[];
}

const URL_BLOCK = /<url>([\s\S]*?)<\/url>/g;
const SITEMAP_LOC = /<loc>([^<]+)<\/loc>/;
const SITEMAP_ALTERNATE = /<xhtml:link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\s*\/>/g;
const DISALLOW_EVERYTHING = /^Disallow: \/$/m;
const ABSOLUTE_HTTP = /^https?:\/\//;

/** One <url> entry of the sitemap. */
interface SitemapEntry {
  loc: string;
  alternates: Record<string, string>;
}

function parseSitemap (xml: string): SitemapEntry[] {
  const entries: SitemapEntry[] = [];

  for (const block of xml.matchAll(URL_BLOCK)) {
    const body = block[ 1 ] ?? "";
    const alternates: Record<string, string> = {};

    for (const link of body.matchAll(SITEMAP_ALTERNATE)) {
      const hreflang = link[ 1 ];
      const href = link[ 2 ];

      if (hreflang !== undefined && href !== undefined) alternates[ hreflang ] = href;
    }

    entries.push({ loc: SITEMAP_LOC.exec(body)?.[ 1 ] ?? "", alternates });
  }

  return entries;
}

/** The absolute URL of a site path, on the origin under test. */
function absolute (origin: string, path: string): string {
  return new URL(path, origin).href;
}

/**
 * The comparable form of a URL a page declares: it throws on a relative one, which is
 * what makes "absolute" an assertion rather than a hope, and it settles the trailing
 * slash of the root so `https://host` and `https://host/` compare equal.
 */
function comparable (value: string): string {
  return new URL(value).href;
}

/** Whether a URL sits under the `/en` prefix the default locale never uses. */
function carriesEnglishPrefix (value: string): boolean {
  const { pathname } = new URL(value);

  return pathname === "/en" || pathname.startsWith("/en/");
}

for (const entry of PAGES) {
  test(`${entry.path} declares an absolute canonical and the full hreflang set`, async ({
    page,
    baseURL,
  }) => {
    const origin = baseURL ?? "";

    await page.goto(entry.path);

    const canonical = await page.locator(`link[rel="canonical"]`).getAttribute("href");

    expect(canonical, "no canonical link").not.toBeNull();
    expect(canonical ?? "").toMatch(ABSOLUTE_HTTP);
    expect(comparable(canonical ?? "")).toBe(absolute(origin, entry.canonical));

    const links = page.locator(`link[rel="alternate"][hreflang]`);

    await expect(links).toHaveCount(EXPECTED_HREFLANGS.length);

    const declared = await links.evaluateAll((nodes) => nodes.map((node) => ({
      hreflang: node.getAttribute("hreflang") ?? "",
      href: node.getAttribute("href") ?? "",
    })));

    expect(declared.map((link) => link.hreflang).sort()).toEqual([ ...EXPECTED_HREFLANGS ].sort());

    for (const link of declared) {
      const expected = entry.alternates[ link.hreflang ];

      expect(expected, `unexpected hreflang ${link.hreflang}`).toBeDefined();
      expect(link.href).toMatch(ABSOLUTE_HTTP);
      expect(comparable(link.href)).toBe(absolute(origin, expected ?? ""));
      expect(carriesEnglishPrefix(link.href), `${link.href} carries an /en prefix`).toBe(false);
    }
  });

  test(`${entry.path} carries exactly one JSON-LD block, and it parses`, async ({
    page,
    baseURL,
  }) => {
    await page.goto(entry.path);

    const blocks = page.locator(`script[type="application/ld+json"]`);

    await expect(blocks).toHaveCount(1);

    const raw = await blocks.textContent();

    expect(raw ?? "").not.toBe("");

    const payload = JSON.parse(raw ?? "") as JsonLdDocument;

    expect(payload[ "@context" ]).toBe("https://schema.org");
    expect(Array.isArray(payload[ "@graph" ])).toBe(true);
    expect((payload[ "@graph" ] ?? []).length).toBeGreaterThan(0);

    const urls = (payload[ "@graph" ] ?? [])
      .map((node) => node.url)
      .filter((url): url is string => typeof url === "string")
      .map(comparable);

    expect(urls).toContain(absolute(baseURL ?? "", entry.canonical));
  });
}

test("every Open Graph image answers 200 and is not a redirect", async ({ page, request }) => {
  for (const entry of PAGES) {
    await page.goto(entry.path);

    const source = await page.locator(`meta[property="og:image"]`).getAttribute("content");

    expect(source, `${entry.path} declares no og:image`).not.toBeNull();

    const response = await request.get(source ?? "", { maxRedirects: 0 });

    expect(response.status(), `og:image of ${entry.path}`).toBe(200);
    expect(response.headers()[ "content-type" ]).toBe("image/png");
  }
});

test("/opengraph-image answers 200 and is not a redirect", async ({ request }) => {
  const response = await request.get("/opengraph-image", { maxRedirects: 0 });

  expect(response.status()).toBe(200);
  expect(response.headers()[ "location" ]).toBeUndefined();
  expect(response.headers()[ "content-type" ]).toBe("image/png");
});

test("/sitemap.xml lists the six pages with their alternates", async ({ request, baseURL }) => {
  const origin = baseURL ?? "";
  const response = await request.get("/sitemap.xml");

  expect(response.status()).toBe(200);

  const entries = parseSitemap(await response.text());

  expect(entries.map((sitemapEntry) => comparable(sitemapEntry.loc)))
    .toEqual(PAGES.map((contract) => absolute(origin, contract.canonical)));

  for (const [ index, sitemapEntry ] of entries.entries()) {
    const expected = PAGES[ index ];

    expect(expected).toBeDefined();
    expect(Object.keys(sitemapEntry.alternates).sort()).toEqual([ ...EXPECTED_HREFLANGS ].sort());

    for (const [ hreflang, href ] of Object.entries(sitemapEntry.alternates)) {
      expect(comparable(href)).toBe(absolute(origin, expected?.alternates[ hreflang ] ?? ""));
    }
  }
});

test("/robots.txt says what the pages say about indexing", async ({ page, request, baseURL }) => {
  const origin = (baseURL ?? "").replace(/\/+$/, "");

  await page.goto("/");

  const directives = await page.locator(`meta[name="robots"]`).getAttribute("content");

  expect(directives, "the home declares no robots meta").not.toBeNull();

  const indexable = !(directives ?? "").includes("noindex");
  const response = await request.get("/robots.txt");

  expect(response.status()).toBe(200);

  const body = await response.text();

  if (indexable) {
    expect(body).toContain("Allow: /");
    expect(body).toContain("Disallow: /api/");
    expect(body).toContain(`Sitemap: ${origin}/sitemap.xml`);
    expect(body).toContain(`Host: ${origin}`);
    expect(body).not.toMatch(DISALLOW_EVERYTHING);
  } else {
    expect(body).toMatch(DISALLOW_EVERYTHING);
    expect(body).not.toContain("Allow:");
    expect(body).not.toContain("Sitemap:");
  }
});

test("the prefixed English routes answer 307 to their unprefixed path", async ({
  request,
  baseURL,
}) => {
  for (const route of PREFIXED_ROUTES) {
    const response = await request.get(route.from, { maxRedirects: 0 });

    expect(response.status(), route.from).toBe(307);

    const location = response.headers()[ "location" ];

    expect(location, `${route.from} sends no Location`).toBeDefined();
    expect(new URL(location ?? "", baseURL ?? "").pathname).toBe(route.to);
  }
});

test("an unknown path answers a real 404 with an HTML document", async ({ page, request }) => {
  const response = await request.get(UNKNOWN_PATH, { maxRedirects: 0 });

  expect(response.status()).toBe(404);
  expect(response.headers()[ "content-type" ]).toContain("text/html");

  const visit = await page.goto(UNKNOWN_PATH);

  expect(visit?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Page not found");
});
