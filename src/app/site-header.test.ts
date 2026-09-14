// src/app/site-header.test.ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { NAV_SECTION_IDS, SECTION_IDS } from "@/domains/core/config/navigation";

import en from "../../messages/en.json";
import es from "../../messages/es.json";

/**
 * The header, the skip link and the section navigation, checked from the source side.
 *
 * The three files are read as TEXT and never imported: SiteHeader and SkipLink are React
 * Server Components calling next-intl's useTranslations, and SectionNav is a client
 * island. Importing any of them outside the Next compiler throws, so
 * src/app/document-shell.test.ts reads its two shells the same way.
 */
const APP_DIR = fileURLToPath(new URL("./", import.meta.url));
const CHROME_DIR = join(APP_DIR, "[locale]", "_components");

const SITE_HEADER = join(CHROME_DIR, "SiteHeader.tsx");
const SKIP_LINK = join(CHROME_DIR, "SkipLink.tsx");
const SECTION_NAV = join(CHROME_DIR, "SectionNav.tsx");

function read (path: string): Promise<string> {
  return readFile(path, "utf8");
}

/** Source with every comment stripped, so prose about the code cannot satisfy a check. */
function code (source: string): string {
  return source
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .replaceAll(/^\s*\/\/.*$/gm, "");
}

/* ────────────────────────────────────────────────────────────────────────────
   1. Every navigable section has a label, in both languages.
   ──────────────────────────────────────────────────────────────────────────── */

describe("the labels the header builds its entries from", () => {
  it("has a Nav key for every section that gets an entry", () => {
    // SiteHeader maps NAV_SECTION_IDS straight onto t(id). A section id without a key
    // would render the literal id in production instead of failing.
    for (const id of NAV_SECTION_IDS) {
      expect(Object.keys(en.Nav), `Nav.${id} is missing from en.json`).toContain(id);
      expect(Object.keys(es.Nav), `Nav.${id} is missing from es.json`).toContain(id);
    }
  });

  it("leaves the hero out of the entries and keeps it in the spied sections", () => {
    // The hero's heading is the owner's name, not a section title, so it gets no link;
    // the scroll spy still watches it, which is what leaves the nav unmarked at the top.
    expect(NAV_SECTION_IDS).not.toContain("hero");
    expect(SECTION_IDS).toContain("hero");
    expect(NAV_SECTION_IDS.length).toBe(SECTION_IDS.length - 1);
  });
});

/* ────────────────────────────────────────────────────────────────────────────
   2. The skip link.
   ──────────────────────────────────────────────────────────────────────────── */

describe("the skip link", () => {
  it("targets the main landmark and carries the id the keyboard spec selects it by", async () => {
    const source = code(await read(SKIP_LINK));

    expect(source).toContain(`href="#main"`);
    expect(source).toContain(`data-testid="skip-link"`);
  });

  it("is invisible until it takes focus, and fully visible then", async () => {
    const source = code(await read(SKIP_LINK));

    expect(source).toContain("sr-only");
    expect(source).toContain("focus-visible:not-sr-only");
    // Without a z-index above the header it would be revealed underneath it.
    expect(source).toContain("focus-visible:z-50");
  });

  it("takes its text from the catalogue instead of spelling it out", async () => {
    const source = code(await read(SKIP_LINK));

    expect(source).toContain(`useTranslations("Nav")`);
    expect(source).toContain(`t("skipToContent")`);
  });

  it("is a Server Component", async () => {
    expect(code(await read(SKIP_LINK))).not.toContain("use client");
  });
});

/* ────────────────────────────────────────────────────────────────────────────
   3. The section navigation.
   ──────────────────────────────────────────────────────────────────────────── */

describe("the section navigation", () => {
  it("renders real anchors, so it works with JavaScript disabled", async () => {
    const source = code(await read(SECTION_NAV));

    expect(source).toContain("<a");
    expect(source).toContain("href={item.href}");
    expect(source, "a div with an onClick is not a link").not.toContain("onClick");
  });

  it("marks the visible section with aria-current=\"location\"", async () => {
    const source = code(await read(SECTION_NAV));

    // "location" and not "true": the generic token would say "this is the current page".
    expect(source).toMatch(/aria-current=\{[^}]*"location"[^}]*\}/);
    expect(source).not.toContain(`aria-current="true"`);
  });

  it("emits the class the underline is drawn on", async () => {
    // globals.css styles `.nav-link[aria-current="location"]::after`, and that CSS is
    // inert if the anchor does not carry the class.
    expect(code(await read(SECTION_NAV))).toContain("nav-link");
  });

  it("reuses the shared scroll spy instead of listening to scroll", async () => {
    const source = code(await read(SECTION_NAV));

    expect(source).toContain(`import { useScrollSpy } from "@/hooks/useScrollSpy"`);
    expect(source).toContain("useScrollSpy()");
    expect(source).not.toContain("addEventListener");
    expect(source).not.toContain("IntersectionObserver");
  });

  it("receives resolved strings and never the translator", async () => {
    const source = code(await read(SECTION_NAV));

    expect(source, "an island calling t() drags a namespace into the browser")
      .not.toContain("useTranslations");
    expect(source, "a client island may not read content/").not.toContain("/content/");
  });
});

/* ────────────────────────────────────────────────────────────────────────────
   4. The header itself.
   ──────────────────────────────────────────────────────────────────────────── */

describe("the site header", () => {
  it("is a Server Component and mounts the four pieces of chrome", async () => {
    const source = code(await read(SITE_HEADER));

    expect(source).not.toContain("use client");
    expect(source).toContain("<SectionNav");
    expect(source).toContain("<LocaleSwitcher />");
    expect(source).toContain("<ThemeToggle />");
    expect(source).toContain("<MobileNav");
  });

  it("emits the class its scroll state is styled from", async () => {
    const source = code(await read(SITE_HEADER));

    expect(source).toContain("site-header");
    // The state comes from html[data-scrolled], written by ScrollSentinel: a class of its
    // own would mean the header re-renders on every scroll.
    expect(source).not.toContain("data-scrolled");
    expect(source).not.toContain("useState");
  });

  it("takes its height from --header-height and not from a copy of the number", async () => {
    // The same token drives scroll-padding-top, scroll-mt-header and the scroll spy's
    // rootMargin. A literal here desyncs the anchors from the header the day it changes.
    const source = code(await read(SITE_HEADER));

    expect(source).toContain("h-[var(--header-height)]");
    expect(source).not.toMatch(/h-(?:16|\[4rem\]|\[64px\])/);
  });

  it("hides the projects entry while there is no project to read", async () => {
    const source = code(await read(SITE_HEADER));

    expect(source).toContain(`import { projects } from "@/domains/projects/content/projects"`);
    expect(source).toMatch(/id !== "projects" \|\| projects\.length > 0/);
  });

  it("passes resolved strings to the islands, never the translator", async () => {
    const source = code(await read(SITE_HEADER));

    expect(source).toMatch(/label=\{t\("primaryLabel"\)\}/);
    expect(source).toMatch(/menuLabel=\{t\("mobileLabel"\)\}/);
    expect(source).not.toMatch(/\bt=\{t\}/);
  });

  it("never reads a cookie or a header, which is what keeps / and /es prerendered", async () => {
    const source = code(await read(SITE_HEADER));

    expect(source).not.toContain("next/headers");
    expect(source).not.toMatch(/\bcookies\(\)/);
    expect(source).not.toMatch(/\bheaders\(\)/);
  });
});
