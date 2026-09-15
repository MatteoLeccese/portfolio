// src/domains/skills/components/skills-section.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { skillCategories } from "@/domains/skills/content/skills";
import { STAGGER_MAX_ITEMS } from "@/lib/motion/tokens";

/**
 * Guards for the four files of the skill section.
 *
 * Vitest runs on the `node` environment and all four are Server Components, so nothing
 * here mounts them: what is checked is the markup contract the section shares with
 * SectionHeading, Stagger and the message catalogue, read from the source text, plus the
 * two invariants that are pure data.
 */
const ROOT = process.cwd();

const SECTION = "src/domains/skills/components/SkillsSection.tsx";
const CATEGORY = "src/domains/skills/components/SkillCategory.tsx";
const BADGE = "src/domains/skills/components/SkillBadge.tsx";
const PANEL = "src/domains/skills/components/AiWorkflowPanel.tsx";
const FILES = [ SECTION, CATEGORY, BADGE, PANEL ];

/**
 * The client directive, written as a pattern instead of a literal so that counting the
 * islands with `grep -rl` over src/ does not count this file among them.
 */
const CLIENT_DIRECTIVE = new RegExp(`^"use\\s+client"`, "m");

/** Source with comments stripped, so a guard matches code and not the prose around it. */
function code (path: string): string {
  return readFileSync(join(ROOT, path), "utf8")
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .replaceAll(/^\s*\/\/.*$/gm, "");
}

/** The same source with the import block dropped, to read what the file renders. */
function body (path: string): string {
  return code(path).replaceAll(/^import\s[\s\S]*?;$/gm, "");
}

interface Catalogue {
  readonly Skills: Record<string, string>;
}

const catalogue = JSON.parse(
  readFileSync(join(ROOT, "messages", "en.json"), "utf8"),
) as Catalogue;

/** A whole-word matcher for a proper noun, so "React" does not match "ReactNode". */
function wholeWord (name: string): RegExp {
  return new RegExp(`(?<!\\w)${name.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?!\\w)`);
}

/** "frontend" -> "categoryFrontend", the heading key of a category. */
function categoryKey (id: string): string {
  return `category${id.charAt(0).toUpperCase()}${id.slice(1)}`;
}

describe("the skill section", () => {
  it("adds no client island", () => {
    for (const file of FILES) {
      expect(code(file), file).not.toMatch(CLIENT_DIRECTIVE);
    }
  });

  it("lets SectionHeading own the anchor id", () => {
    const source = code(SECTION);

    expect(source).toContain(`from "@/components/common/SectionHeading"`);
    expect(source).toContain("<SectionHeading");
    // The <section> is named by the heading and never repeats its id.
    expect(source).toContain("aria-labelledby={`${SECTION_ID}-title`}");
    expect(source).not.toMatch(/<section[^>]*\sid=/);
    expect(source).not.toContain("aria-label=");
  });

  it("adds no second scroll margin", () => {
    for (const file of FILES) {
      expect(code(file), file).not.toContain("scroll-mt");
    }
  });

  it("puts the AI panel before the chip rows", () => {
    const source = code(SECTION);
    const panel = source.search(/<AiWorkflowPanel[\s/>]/);
    const rows = source.search(/<SkillCategory[\s/>]/);

    expect(panel).toBeGreaterThan(-1);
    expect(rows).toBeGreaterThan(-1);
    expect(panel).toBeLessThan(rows);
  });

  it("reads the categories from the content file instead of repeating them", () => {
    const source = code(SECTION);

    expect(source).toContain(`from "@/domains/skills/content/skills"`);
    expect(source).toContain("skillCategories.map");

    // Skill names are proper nouns: they live in skills.ts and nowhere else.
    for (const file of FILES) {
      const rendered = body(file);

      for (const category of skillCategories) {
        for (const skill of category.skills) {
          expect(rendered, `${file} hardcodes ${skill.name}`).not.toMatch(wholeWord(skill.name));
        }
      }
    }
  });

  it("names every category through a key both catalogues carry", () => {
    const source = code(SECTION);
    const keys = Object.keys(catalogue.Skills);

    for (const category of skillCategories) {
      const key = categoryKey(category.id);

      expect(keys, `Skills.${key} is missing`).toContain(key);
      expect(source, `${key} is not wired`).toContain(key);
    }
  });
});

describe("the chip rows", () => {
  it("wraps and never scrolls sideways", () => {
    const source = code(CATEGORY);

    expect(source).toContain("flex-wrap");
    expect(source).not.toContain("overflow-");
    expect(source).not.toContain("snap-");
  });

  it("hands the stagger children that are already hidden from the server", () => {
    const source = code(CATEGORY);

    expect(source).toContain(`from "@/components/motion/Stagger"`);
    expect(source).toContain(`step="tight"`);
    // Stagger observes the group; a direct child without the attribute never hides.
    expect(source).toMatch(/<li[^>]*data-reveal="hidden"/);
  });

  it("keeps every category inside the stagger budget of the CSS", () => {
    for (const category of skillCategories) {
      expect(category.skills.length, category.id).toBeLessThanOrEqual(STAGGER_MAX_ITEMS);
    }
  });

  it("leaves nothing invisible when the script never runs", () => {
    for (const file of FILES) {
      const source = code(file);

      expect(source, file).not.toContain("opacity-0");
      expect(source, file).not.toContain("opacity:");
      expect(source, file).not.toContain("visibility");
    }
  });
});

describe("the chip", () => {
  it("is the patched badge in its hairline variant", () => {
    const source = code(BADGE);

    expect(source).toContain(`from "@/components/ui/badge"`);
    expect(source).toContain(`variant="hairline"`);
  });

  it("draws the brand glyph as a mask and never as an image", () => {
    const source = code(BADGE);

    expect(source).toContain(`from "@/domains/profile/components/BrandGlyph"`);
    expect(source).toContain("<BrandGlyph");
    expect(source).not.toContain("<img");
    expect(source).not.toContain("next/image");
  });

  it("paints a 16 px glyph with a semantic token and not with the brand colour", () => {
    const source = code(BADGE);

    expect(source).toContain("size-4");
    expect(source).not.toContain("text-brand-");
  });
});

describe("the AI panel", () => {
  it("carries no logos", () => {
    const source = code(PANEL);

    expect(source).not.toContain("BrandGlyph");
    expect(source).not.toContain("SocialIcon");
    expect(source).not.toContain("<img");
    expect(source).not.toContain("next/image");
    expect(source).not.toContain("/icons/");
  });

  it("is an h3 with its own anchor and its own accessible name", () => {
    const source = code(PANEL);

    expect(source).toContain("<h3");
    expect(source).not.toContain("<h2");
    expect(source).not.toContain("<h1");
    expect(source).toContain(`id="ai-workflow"`);
    expect(source).toContain(`id="ai-workflow-title"`);
    expect(source).toContain(`aria-labelledby="ai-workflow-title"`);
  });

  it("takes its six strings from the Skills namespace", () => {
    const source = code(PANEL);
    const keys = Object.keys(catalogue.Skills);

    for (const key of [
      "categoryAi",
      "aiIntro",
      "aiPracticeOne",
      "aiPracticeTwo",
      "aiPracticeThree",
      "aiTooling",
    ]) {
      expect(keys, `Skills.${key} is missing`).toContain(key);
      expect(source, `Skills.${key} is not read`).toContain(`"${key}"`);
    }
  });

  it("renders the name of each practice through the rich tag of its own key", () => {
    const source = code(PANEL);

    expect(source.match(/t\.rich\(/g)).toHaveLength(3);
    expect(source).toContain("{ term }");
    expect(source).toContain("<strong");
  });
});
