// src/app/[locale]/home-page.test.ts
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { SECTION_IDS, type SectionId } from "@/domains/core/config/navigation";

/**
 * What the home page composes, and what it refuses to do while composing it.
 *
 * The page is read as TEXT and never imported: it is an async React Server Component whose
 * section tree pulls in the whole component library. src/app/document-shell.test.ts and
 * src/app/[locale]/layout-chrome.test.ts read their subjects the same way.
 */
const HOME_PAGE = fileURLToPath(new URL("./page.tsx", import.meta.url));
const SRC_DIR = fileURLToPath(new URL("../../", import.meta.url));

/** The client directive as a pattern, so counting the islands over src/ skips this file. */
const CLIENT_DIRECTIVE = new RegExp(`^"use\\s+client"`, "m");

/** The component that renders each section, and the module it comes from. */
const SECTIONS = {
  hero: { component: "HeroSection", module: "@/domains/profile/components/HeroSection" },
  about: { component: "AboutSection", module: "@/domains/profile/components/AboutSection" },
  skills: { component: "SkillsSection", module: "@/domains/skills/components/SkillsSection" },
  experience: {
    component: "ExperienceSection",
    module: "@/domains/experience/components/ExperienceSection",
  },
  education: {
    component: "EducationSection",
    module: "@/domains/education/components/EducationSection",
  },
  projects: {
    component: "ProjectsSection",
    module: "@/domains/projects/components/ProjectsSection",
  },
  contact: { component: "ContactSection", module: "@/domains/contact/components/ContactSection" },
} as const satisfies Record<SectionId, { component: string; module: string; }>;

/** The sections whose props include the locale resolved by the page. */
const LOCALE_AWARE: readonly SectionId[] = [ "hero", "experience", "education", "projects" ];

/** Source with every comment stripped, so prose about the code cannot satisfy an assertion. */
function code (source: string): string {
  return source
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .replaceAll(/^\s*\/\/.*$/gm, "");
}

function read (path: string): Promise<string> {
  return readFile(path, "utf8");
}

function page (): Promise<string> {
  return read(HOME_PAGE).then(code);
}

function occurrences (source: string, pattern: RegExp): number {
  return (source.match(pattern) ?? []).length;
}

/**
 * Every value a source writes into an `id` attribute, whether spelled as a literal or as
 * an identifier declared in the same file.
 */
function idsWritten (source: string): Set<string> {
  const written = new Set<string>();

  for (const match of source.matchAll(/\bid=(?:"([^"]*)"|\{(\w+)\})/g)) {
    const literal = match[ 1 ];
    const identifier = match[ 2 ];

    if (literal !== undefined) {
      written.add(literal);
      continue;
    }

    if (identifier === undefined) continue;

    const declared = new RegExp(`\\b${identifier}\\b[^=\\n]*=\\s*"([^"]*)"`).exec(source);
    const value = declared?.[ 1 ];

    if (value !== undefined) written.add(value);
  }

  return written;
}

/** The whole `<Name ... />` element of the first `Name` rendered, attributes included. */
function element (source: string, name: string): string {
  const match = new RegExp(`<${name}[\\s\\S]*?/>`).exec(source);

  return match === null ? "" : match[ 0 ];
}

/* ────────────────────────────────────────────────────────────────────────────
   1. The seven sections, in the order of SECTION_IDS.
   ──────────────────────────────────────────────────────────────────────────── */

describe("the home page composes the seven sections", () => {
  it("imports every one of them from its own domain", async () => {
    const source = await page();

    for (const id of SECTION_IDS) {
      const { component, module } = SECTIONS[ id ];

      expect(source, `${id} is not imported`).toContain(`import { ${component} } from "${module}"`);
    }
  });

  it("renders each of them exactly once", async () => {
    const source = await page();

    for (const id of SECTION_IDS) {
      const { component } = SECTIONS[ id ];

      expect(occurrences(source, new RegExp(`<${component}[\\s/>]`, "g")), `${id} is not rendered once`)
        .toBe(1);
    }
  });

  it("renders them in the order SECTION_IDS declares", async () => {
    const source = await page();
    const positions = SECTION_IDS.map((id) => source.indexOf(`<${SECTIONS[ id ].component}`));

    expect(positions.every((position) => position > -1)).toBe(true);
    expect([ ...positions ].sort((a, b) => a - b)).toEqual(positions);
  });

  it("renders no section the navigation does not know about", async () => {
    const source = await page();
    const rendered = [ ...source.matchAll(/<(\w+Section)\b/g) ].map((match) => match[ 1 ]);
    const known = SECTION_IDS.map((id) => SECTIONS[ id ].component);

    expect([ ...rendered ].sort()).toEqual([ ...known ].sort());
  });
});

/* ────────────────────────────────────────────────────────────────────────────
   2. One anchor per section, on one element.
   ──────────────────────────────────────────────────────────────────────────── */

describe("the anchors the navigation and the scroll spy read", () => {

  /** Every .tsx under src/, as [relative path, comment-free source]. */
  async function components (): Promise<[ string, string ][]> {
    const entries = await readdir(SRC_DIR, { recursive: true });
    const files: [ string, string ][] = [];

    for (const entry of entries) {
      const name = entry.replaceAll("\\", "/");

      if (!name.endsWith(".tsx")) continue;

      files.push([ name, code(await read(join(SRC_DIR, entry))) ]);
    }

    return files;
  }

  it("finds the project's components, so an empty walk cannot pass as a clean result", async () => {
    expect((await components()).length).toBeGreaterThan(20);
  });

  it("has exactly one file writing each of the seven ids", async () => {
    const files = await components();

    for (const id of SECTION_IDS) {
      const writers = files
        .filter(([ , source ]) => idsWritten(source).has(id))
        .map(([ name ]) => name);

      expect(writers, `${id} is written by ${writers.length} files instead of one`).toHaveLength(1);
    }
  });

  it("writes none of them in the page itself", async () => {
    expect(await page()).not.toMatch(/\bid=/);
  });
});

/* ────────────────────────────────────────────────────────────────────────────
   3. Nothing derived from the clock is allowed to freeze at build time.
   ──────────────────────────────────────────────────────────────────────────── */

describe("the home page's revalidation", () => {
  it("is exported, so the prerender is not the last render", async () => {
    expect(await page()).toMatch(/^export const revalidate = /m);
  });

  it("is one day, in seconds", async () => {
    const match = (/export const revalidate = ([\d_]+)/).exec(await page());

    expect(match).not.toBeNull();
    expect(Number((match?.[ 1 ] ?? "").replaceAll("_", ""))).toBe(24 * 60 * 60);
  });

  it("reads the clock in one place and hands the figure down", async () => {
    const source = await page();

    expect(source).toContain("yearsOfExperienceAt(SITE.careerStart, new Date())");
    expect(occurrences(source, /new Date\(\)/g)).toBe(1);
  });
});

/* ────────────────────────────────────────────────────────────────────────────
   4. Static rendering, and a single resolution of the locale.
   ──────────────────────────────────────────────────────────────────────────── */

describe("the home page stays static", () => {
  it("is a Server Component", async () => {
    expect(await page()).not.toMatch(CLIENT_DIRECTIVE);
  });

  it("reads no request state", async () => {
    const source = await page();

    for (const forbidden of [ "next/headers", "cookies(", "headers(", "draftMode", "connection(" ]) {
      expect(source, `the page calls ${forbidden}`).not.toContain(forbidden);
    }
  });

  it("prerenders both locales", async () => {
    const source = await page();

    expect(source).toContain("export function generateStaticParams ()");
    expect(source).toContain("routing.locales.map");
  });

  it("declares no metadata of its own, so the layout's is the home's", async () => {
    const source = await page();

    expect(source).not.toContain("export const metadata");
    expect(source).not.toContain("generateMetadata");
  });
});

describe("the home page resolves the locale once", () => {
  it("awaits params a single time and fixes the request locale with it", async () => {
    const source = await page();

    expect(occurrences(source, /await params/g)).toBe(1);
    expect(source).toContain("setRequestLocale(locale)");
  });

  it("never asks next-intl which locale it is in", async () => {
    expect(await page()).not.toContain("getLocale(");
  });

  it("passes it to every section that takes one", async () => {
    const source = await page();

    for (const id of LOCALE_AWARE) {
      expect(element(source, SECTIONS[ id ].component), `${id} resolves its own locale`)
        .toContain("locale={locale}");
    }
  });
});

/* ────────────────────────────────────────────────────────────────────────────
   5. The hero strings and the Contact reveal, which are the page's own work.
   ──────────────────────────────────────────────────────────────────────────── */

describe("the hero strings the page resolves", () => {
  it("fills every prop the hero declares", async () => {
    const hero = element(await page(), "HeroSection");

    for (const prop of [
      "greeting", "headline", "locale", "name", "primaryCta", "role", "scrollCue",
      "secondaryCta", "summary",
    ]) {
      expect(hero, `HeroSection is missing ${prop}`).toContain(`${prop}=`);
    }
  });

  it("takes the name from SITE instead of the catalogue", async () => {
    const source = await page();

    expect(element(source, "HeroSection")).toContain("name={SITE.name}");
    expect(source).not.toContain("Hi, I'm");
  });

  it("falls back to the between-roles line on the same condition About does", async () => {
    const source = await page();

    expect(source).toContain("company === null");
    expect(source).toContain(`t("betweenRoles")`);
    expect(source).toContain(`t("currentRole", { role, company })`);
  });

  it("gives About the figures rather than a second derivation", async () => {
    expect(element(await page(), "AboutSection"))
      .toContain("company={company} role={role} years={years}");
  });
});

describe("the Contact reveal", () => {
  it("is declared here, since the section carries no animation of its own", async () => {
    const source = await page();

    expect(source).toContain(`import { Reveal } from "@/components/motion/Reveal"`);
    expect(source).toMatch(/<Reveal>\s*<ContactSection \/>\s*<\/Reveal>/);
  });

  it("wraps nothing else, so the other six keep the reveals they declare", async () => {
    expect(occurrences(await page(), /<Reveal\b/g)).toBe(1);
  });
});
