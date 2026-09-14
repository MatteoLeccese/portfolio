// src/app/[locale]/layout-chrome.test.ts
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Where the chrome sits inside the localized layout: which pieces it mounts, and in what
 * order relative to <main> and to each other.
 *
 * The layout is read as TEXT and never imported: it is an async React Server Component
 * that pulls in next/font/local, a build-time transform that throws outside the Next
 * compiler. src/app/document-shell.test.ts and src/lib/fonts.test.ts do the same.
 */
const LOCALE_LAYOUT = fileURLToPath(new URL("./layout.tsx", import.meta.url));

/** Source with every comment stripped, so prose about the code cannot satisfy an assertion. */
function code (source: string): string {
  return source
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .replaceAll(/^\s*\/\/.*$/gm, "");
}

function layout (): Promise<string> {
  return readFile(LOCALE_LAYOUT, "utf8").then(code);
}

describe("the localized layout mounts the chrome", () => {
  it("imports the three pieces from the chrome folder", async () => {
    const source = await layout();

    expect(source).toContain(`import { SkipLink } from "./_components/SkipLink"`);
    expect(source).toContain(`import { SiteHeader } from "./_components/SiteHeader"`);
    expect(source).toContain(`import { SiteFooter } from "./_components/SiteFooter"`);
  });

  it("renders each of them exactly once", async () => {
    const source = await layout();

    for (const element of [ "<SkipLink />", "<SiteHeader />", "<SiteFooter />" ]) {
      expect(source.split(element)).toHaveLength(2);
    }
  });
});

describe("the order of the chrome in the document", () => {
  it("puts the skip link ahead of the header, so it is the first focusable element", async () => {
    const source = await layout();

    expect(source.indexOf("<SkipLink />")).toBeGreaterThan(-1);
    expect(source.indexOf("<SkipLink />")).toBeLessThan(source.indexOf("<SiteHeader />"));
  });

  it("puts the header before <main> and the footer after it", async () => {
    const source = await layout();
    const header = source.indexOf("<SiteHeader />");
    const main = source.indexOf(`<main id="main"`);
    const mainEnd = source.indexOf("</main>");
    const footer = source.indexOf("<SiteFooter />");

    expect(header).toBeLessThan(main);
    expect(footer).toBeGreaterThan(mainEnd);
  });

  it("keeps the skip link below ScrollSentinel, which renders no node", async () => {
    const source = await layout();

    expect(source.indexOf("<ScrollSentinel />")).toBeLessThan(source.indexOf("<SkipLink />"));
  });

  it("mounts the header and the footer inside the message provider", async () => {
    // LocaleSwitcher and ThemeToggle are client islands that read the Locale and Theme
    // namespaces at runtime.
    const source = await layout();
    const providerOpen = source.indexOf("<NextIntlClientProvider");
    const providerClose = source.indexOf("</NextIntlClientProvider>");

    for (const element of [ "<SiteHeader />", "<SiteFooter />" ]) {
      expect(source.indexOf(element)).toBeGreaterThan(providerOpen);
      expect(source.indexOf(element)).toBeLessThan(providerClose);
    }
  });
});

describe("what the chrome is not allowed to make the layout do", () => {
  it("keeps the font variable on <html>", async () => {
    const source = await layout();

    expect(source).toContain("className={sans.variable}");
  });

  it("reads no request state, which is what keeps / and /es prerendered", async () => {
    const source = await layout();

    expect(source).not.toContain("next/headers");
    expect(source).not.toMatch(/\bcookies\(\)/);
    expect(source).not.toMatch(/\bheaders\(\)/);
    expect(source).not.toMatch(/\bconnection\(\)/);
  });
});
