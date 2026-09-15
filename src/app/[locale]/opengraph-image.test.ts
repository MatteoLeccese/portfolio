// src/app/[locale]/opengraph-image.test.ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { LOCALES } from "@/domains/core/config/locales";
import { PALETTE_SRGB } from "@/lib/palette-srgb";

/**
 * What the Open Graph card is allowed to be made of, and the URL its route is allowed to
 * have.
 *
 * The card is read as TEXT and never imported: it is an async module that builds an
 * ImageResponse out of two font files, the way src/app/[locale]/home-page.test.ts reads the
 * home page.
 */
const CARD = fileURLToPath(new URL("./opengraph-image.tsx", import.meta.url));
const PROXY = fileURLToPath(new URL("../../proxy.ts", import.meta.url));
const FONT_DIR = fileURLToPath(new URL("../../lib/assets/fonts/", import.meta.url));

/** The two static instances of Montserrat the card passes to satori. */
const STATIC_FONTS = [ "Montserrat-Regular.ttf", "Montserrat-Bold.ttf" ];

/** First four bytes of a TrueType file, per the OpenType spec. */
const TRUETYPE_SIGNATURE = 0x00010000;

/** The matcher array of the proxy, as the single string it holds. */
const MATCHER = /matcher:\s*\[\s*"((?:[^"\\]|\\.)*)"/;

/** Properties that would paint the card with something other than a flat colour. */
const FORBIDDEN_PROPERTIES = [
  "backgroundImage",
  "backgroundClip",
  "WebkitBackgroundClip",
  "maskImage",
  "boxShadow",
  "textShadow",
];

/** The four-character tags of the tables in a TrueType file, in directory order. */
function tableTags (bytes: Buffer): string[] {
  const count = bytes.readUInt16BE(4);
  const tags: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const offset = 12 + index * 16;
    tags.push(bytes.toString("ascii", offset, offset + 4));
  }

  return tags;
}

/**
 * The proxy matcher as a regular expression anchored over a whole path. Next compiles the
 * string itself, and it holds no `:param` token, so the pattern is used verbatim.
 */
async function proxyMatcher (): Promise<RegExp> {
  const source = await readFile(PROXY, "utf8");
  const pattern = MATCHER.exec(source)?.[ 1 ];
  if (pattern === undefined) throw new Error("src/proxy.ts declares no matcher");

  return new RegExp(`^${pattern.replaceAll("\\\\", "\\")}$`);
}

describe("open graph card", () => {
  it("is 1200 x 630 and a PNG", async () => {
    const source = await readFile(CARD, "utf8");

    expect(source).toContain("const SIZE = { width: 1200, height: 630 }");
    expect(source).toContain(`const CONTENT_TYPE = "image/png"`);
  });

  it("declares its size, type and alt as constants", async () => {
    const source = await readFile(CARD, "utf8");

    expect(source).toMatch(/export const size = SIZE;/);
    expect(source).toMatch(/export const contentType = CONTENT_TYPE;/);
    expect(source).toMatch(/export const alt = /);
  });

  it("prerenders one card per locale", async () => {
    const source = await readFile(CARD, "utf8");

    expect(source).toContain("export function generateStaticParams");
    expect(source).toContain("routing.locales.map");
  });

  it("paints with flat colour only", async () => {
    const source = await readFile(CARD, "utf8");

    for (const property of FORBIDDEN_PROPERTIES) {
      expect(source, `${property} would take the card off flat colour`).not.toContain(property);
    }
    // An <img> would carry whatever the file it points at is painted with, gradients included.
    expect(source).not.toMatch(/<img[\s/>]/);
  });

  it("takes every colour from the light palette", async () => {
    const source = await readFile(CARD, "utf8");
    const used = [ ...source.matchAll(/COLOR\.([a-zA-Z]+)/g) ].map(([ , key ]) => key ?? "");

    expect(used.length).toBeGreaterThan(0);
    expect(source).toContain("const COLOR = PALETTE_SRGB.light");

    for (const key of new Set(used)) {
      expect(Object.keys(PALETTE_SRGB.light)).toContain(key);
    }
  });

  it("reads the two fonts satori can parse", async () => {
    const source = await readFile(CARD, "utf8");

    for (const file of STATIC_FONTS) expect(source).toContain(`loadFont("${file}")`);
    expect(source).not.toMatch(/loadFont\("Montserrat-Variable/);
  });
});

describe("the fonts the card ships", () => {
  it("are TrueType files on disk", async () => {
    for (const file of STATIC_FONTS) {
      const bytes = await readFile(join(FONT_DIR, file));
      expect(bytes.readUInt32BE(0), `${file} is not TrueType`).toBe(TRUETYPE_SIGNATURE);
    }
  });

  it("are static instances, which is the only kind satori parses", async () => {
    for (const file of STATIC_FONTS) {
      const bytes = await readFile(join(FONT_DIR, file));
      // satori throws on `fvar`, so a variable build put back here fails here first.
      expect(tableTags(bytes), `${file} still carries a variation table`).not.toContain("fvar");
    }
  });

  it("carry the weights the card asks for", async () => {
    const source = await readFile(CARD, "utf8");
    const weights = [ ...source.matchAll(/weight: (\d+), style: "normal"/g) ]
      .map(([ , value ]) => Number(value));

    expect(weights).toEqual([ 400, 700 ]);
  });
});

describe("the card's own URL", () => {
  it("is excluded from the locale proxy in every locale", async () => {
    const matcher = await proxyMatcher();

    for (const locale of LOCALES) {
      expect(matcher.test(`/${locale}/opengraph-image`), `${locale} card is proxied`).toBe(false);
    }
  });

  it("would be proxied, and so redirected, if the image id were in the path", async () => {
    const matcher = await proxyMatcher();

    // What generateImageMetadata produces. The exclusion is anchored with `$`, so this path
    // reaches the proxy and /en/… answers 307 instead of 200.
    expect(matcher.test("/en/opengraph-image/card")).toBe(true);
  });

  it("leaves the pages themselves to the proxy", async () => {
    const matcher = await proxyMatcher();

    expect(matcher.test("/en")).toBe(true);
    expect(matcher.test("/es/privacy")).toBe(true);
  });
});
