// src/domains/profile/components/profile-sections.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";

import en from "../../../../messages/en.json";
import es from "../../../../messages/es.json";

import { YEARS_SLOT, splitAroundSlot } from "./AboutSection";

/**
 * Guards for the hero and the About section.
 *
 * Vitest runs on the `node` environment, so nothing here mounts a component: what is
 * covered is the pure formatting helper, the ICU round trip against the real catalogues,
 * and the markup contracts that globals.css, the scroll spy and the reveal observer
 * depend on — all of which are readable from the source text. Anything that needs a
 * browser is declared as a manual check.
 */
const ROOT = process.cwd();

const HERO = "src/domains/profile/components/HeroSection.tsx";
const ABOUT = "src/domains/profile/components/AboutSection.tsx";
const DOWNLOAD_CV = "src/domains/profile/components/DownloadCvButton.tsx";
const BRAND_GLYPH = "src/domains/profile/components/BrandGlyph.tsx";

const OWNED = [ HERO, ABOUT, DOWNLOAD_CV, BRAND_GLYPH ];

/**
 * The client directive, written as a pattern instead of a literal so that counting the
 * islands with `grep -rl` over src/ does not count this file among them.
 */
const CLIENT_DIRECTIVE = new RegExp(`^"use\\s+client"`, "m");

const CATALOGUES = [ { locale: "en", messages: en }, { locale: "es", messages: es } ] as const;

type Catalogue = (typeof CATALOGUES)[ number ][ "messages" ];

/** Source with comments stripped, so a guard matches code and not the prose around it. */
function code (path: string): string {
  return readFileSync(join(ROOT, path), "utf8")
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .replaceAll(/^\s*\/\/.*$/gm, "");
}

function occurrences (source: string, pattern: RegExp): number {
  return (source.match(pattern) ?? []).length;
}

/** The opening tag of the first `<tag` in the source, attributes included. */
function openingTag (source: string, tag: string): string {
  const match = new RegExp(`<${tag}[\\s\\S]*?>`).exec(source);

  return match === null ? "" : match[ 0 ];
}

describe("profile sections", () => {
  it("are Server Components", () => {
    for (const path of OWNED) {
      expect(code(path), `${path} ships to the browser`).not.toMatch(CLIENT_DIRECTIVE);
    }
  });

  it("leave scroll-mt-header to SectionHeading", () => {
    for (const path of OWNED) {
      expect(code(path), `${path} declares its own scroll margin`).not.toContain("scroll-mt-header");
    }
  });
});

describe("HeroSection", () => {
  const source = code(HERO);

  it("takes translated strings and never translates on its own", () => {
    expect(source).not.toContain("next-intl");
    expect(source).not.toContain("useTranslations");
  });

  it("carries the h1 itself instead of a SectionHeading", () => {
    // SectionHeading emits an h2, and the hero is the one section with the h1.
    expect(source).not.toContain("SectionHeading");
    expect(source).toContain("<h1");
  });

  it("names the region from its own visible title", () => {
    expect(source).toContain("aria-labelledby={`${SECTION_ID}-title`}");
    expect(source).toContain("id={`${SECTION_ID}-title`}");
    expect(source).toContain("id={SECTION_ID}");
    expect(source).toContain(`const SECTION_ID: SectionId = "hero"`);
  });

  it("sits inside the one horizontal container of the page", () => {
    expect(source).toContain("container-page");
    expect(source).toContain("section-y");
  });

  it("keeps the h1 out of the staggered sequence", () => {
    const h1 = openingTag(source, "h1");

    expect(h1).toContain("hero-title");
    expect(h1).not.toContain("hero-item");
    expect(h1).not.toContain("--hero-index");
  });

  it("indexes the six sequenced elements from 0 to 5, with no gaps", () => {
    const indices = [ ...source.matchAll(/"--hero-index": (\d+)/g) ].map((match) => match[ 1 ]);

    expect(indices).toEqual([ "0", "1", "2", "3", "4", "5" ]);
    expect(occurrences(source, /hero-item/g)).toBe(indices.length);
  });

  it("writes no millisecond value of its own", () => {
    // The delay is --hero-index times --motion-stagger-loose, resolved in CSS.
    expect(source).not.toMatch(/animationDelay|transitionDelay|setTimeout/);
  });

  it("splits the role line into words with the space outside the clipped box", () => {
    expect(source).toContain("role.split(\" \")");
    expect(source).toContain("hero-words");
    expect(source).toContain("hero-word-clip");
    expect(source).toContain(`"--word-index": index`);
    expect(source).toContain(`{index < words.length - 1 ? " " : null}`);
  });

  it("animates the scroll cue on the icon and not on its container", () => {
    const icon = openingTag(source, "ArrowDown");

    expect(icon).toContain("scroll-cue-icon");
    expect(icon).toContain(`aria-hidden="true"`);
  });

  it("points its two calls to action away from the empty Projects section", () => {
    expect(source).toContain(`href="#contact"`);
    expect(source).toContain(`href="#experience"`);
    expect(source).not.toContain(`href="#projects"`);
  });

  it("turns the two buttons into real anchors", () => {
    // Base UI has no asChild: `render` plus nativeButton={false} renders an anchor.
    expect(occurrences(source, /nativeButton=\{false\}/g)).toBe(2);
  });
});

describe("AboutSection", () => {
  const source = code(ABOUT);

  it("leaves its id to SectionHeading", () => {
    expect(openingTag(source, "section")).not.toContain("id=");
    expect(source).toContain("aria-labelledby={`${SECTION_ID}-title`}");
    expect(source).toContain("<SectionHeading id={SECTION_ID}");
    expect(source).toContain(`const SECTION_ID: SectionId = "about"`);
  });

  it("hides every direct child of the stagger group from the start", () => {
    // Stagger observes the group, not the children.
    const items = occurrences(source, /<li\b/g);

    expect(items).toBeGreaterThan(0);
    expect(occurrences(source, /data-reveal="hidden"/g)).toBe(items);
  });

  it("counts the years figure instead of printing a written number", () => {
    expect(source).toContain("<CountUp to={years}>{years}</CountUp>");
    expect(source).toContain("countedYears(t(\"factExperience\", { years: YEARS_SLOT }), years)");
    expect(source).not.toMatch(/factExperience", \{ years: \d/);
  });

  it("derives the place from SITE rather than writing it twice", () => {
    expect(source).toContain("SITE.location.region");
    expect(source).toContain("SITE.location.countryName");
  });

  it("falls back to the between-roles line when there is no employer", () => {
    expect(source).toContain(`company === null ? t("factRoleNone") : t("factRole", { role })`);
  });

  it("hides the decorative icon of every fact", () => {
    const icons = occurrences(source, /<Icon\b/g);

    expect(icons).toBe(1);
    expect(openingTag(source, "Icon")).toContain(`aria-hidden="true"`);
  });

  it("keeps the fact strip out of Prose", () => {
    // Prose styles links and lists through descendant selectors.
    const prose = (/<Prose>([\s\S]*?)<\/Prose>/).exec(source);

    expect(prose?.[ 1 ]).toBeDefined();
    expect(prose?.[ 1 ]).not.toContain("<li");
    expect(occurrences(source, /<p\b/g)).toBe(3);
  });
});

describe("splitAroundSlot", () => {
  it("returns the halves around a single slot", () => {
    expect(splitAroundSlot("a|b", "|")).toEqual([ "a", "b" ]);
  });

  it("keeps an empty half when the slot opens or closes the text", () => {
    expect(splitAroundSlot("|b", "|")).toEqual([ "", "b" ]);
    expect(splitAroundSlot("a|", "|")).toEqual([ "a", "" ]);
  });

  it("refuses a text with no slot", () => {
    expect(splitAroundSlot("ab", "|")).toBeNull();
  });

  it("refuses a text with more than one slot", () => {
    expect(splitAroundSlot("a|b|c", "|")).toBeNull();
  });
});

describe("the years slot", () => {
  it("is a character no message uses", () => {
    for (const { locale, messages } of CATALOGUES) {
      expect(JSON.stringify(messages), `${locale} contains the slot`).not.toContain(YEARS_SLOT);
    }
  });

  it("isolates the figure of About.factExperience in every locale", () => {
    for (const { locale, messages } of CATALOGUES) {
      const t = createTranslator({ locale, messages });
      const parts = splitAroundSlot(t("About.factExperience", { years: YEARS_SLOT }), YEARS_SLOT);

      expect(parts, `${locale} does not interpolate {years} exactly once`).not.toBeNull();
      expect(`${parts?.[ 0 ] ?? ""}5${parts?.[ 1 ] ?? ""}`)
        .toBe(t("About.factExperience", { years: "5" }));
    }
  });
});

describe("DownloadCvButton", () => {
  const source = code(DOWNLOAD_CV);

  it("saves the file instead of navigating to it", () => {
    expect(source).toContain("download={SITE.cvFileName(locale)}");
    expect(source).toContain("href={SITE.cvPath(locale)}");
    expect(source).toContain("hrefLang={locale}");
  });

  it("takes both paths from SITE and writes none of its own", () => {
    expect(source).not.toContain(".pdf");
    expect(source).not.toContain("/cv/");
  });

  it("names the format and the language", () => {
    expect(source).toContain(`t("downloadCvAria", { language: tLocale(locale) })`);
    expect(source).toContain(`t("downloadCv")`);
  });
});

describe("BrandGlyph", () => {
  const source = code(BRAND_GLYPH);

  it("paints the glyph as a mask over the current text colour", () => {
    expect(source).toContain("maskImage: `url(/icons/icon-${slug}.svg)`");
    expect(source).toContain("bg-current");
  });

  it("is never an image element", () => {
    expect(source).not.toContain("<img");
    expect(source).not.toContain("next/image");
  });

  it("is hidden from assistive technology", () => {
    expect(source).toContain(`aria-hidden="true"`);
  });
});

describe("the message keys these sections interpolate", () => {
  interface Placeholders {
    readonly key: string;
    readonly read: (messages: Catalogue) => string;
    readonly names: readonly string[];
  }

  const PLACEHOLDERS: readonly Placeholders[] = [
    { key: "About.factExperience", read: (m) => m.About.factExperience, names: [ "years" ] },
    { key: "About.factLocation", read: (m) => m.About.factLocation, names: [ "location" ] },
    { key: "About.factRole", read: (m) => m.About.factRole, names: [ "role" ] },
    { key: "About.paragraphOne", read: (m) => m.About.paragraphOne, names: [ "role", "years" ] },
    { key: "About.paragraphThree", read: (m) => m.About.paragraphThree, names: [ "location" ] },
    { key: "Common.downloadCvAria", read: (m) => m.Common.downloadCvAria, names: [ "language" ] },
    { key: "Hero.currentRole", read: (m) => m.Hero.currentRole, names: [ "role" ] },
    { key: "Hero.summary", read: (m) => m.Hero.summary, names: [ "years" ] },
  ];

  it("declare every placeholder the components fill, in both locales", () => {
    for (const { locale, messages } of CATALOGUES) {
      for (const { key, read, names } of PLACEHOLDERS) {
        for (const name of names) {
          expect(read(messages), `${locale}: ${key} lost {${name}}`).toContain(`{${name}}`);
        }
      }
    }
  });
});
