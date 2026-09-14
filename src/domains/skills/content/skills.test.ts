// src/domains/skills/content/skills.test.ts
import { describe, expect, it } from "vitest";

import en from "../../../../messages/en.json";
import es from "../../../../messages/es.json";
import { LOCALES } from "@/domains/core/config/locales";
import { MANUAL_ICON_SLUGS, SIMPLE_ICON_SLUGS } from "@/domains/skills/content/icons";
import { skillCategories } from "@/domains/skills/content/skills";
import type { SkillCategoryId } from "@/domains/skills/types";

/**
 * Invariants of the skills model. Whether a committed SVG exists for every declared slug is
 * not asserted here: that is the `--check` mode of `scripts/generate-skill-icons.ts`.
 */

/** The AI category, which renders as a prose panel with a heading and copy, not a logo grid. */
const AI_CATEGORY: SkillCategoryId = "ai";

const CATEGORY_KEY_PREFIX = "category";

/** `frontend` -> `categoryFrontend`, which is the key SkillsSection reads. */
function categoryKey (id: SkillCategoryId): string {
  return `${CATEGORY_KEY_PREFIX}${id.charAt(0).toUpperCase()}${id.slice(1)}`;
}

const catalogs: Record<string, Record<string, string>> = { en: en.Skills, es: es.Skills };

describe("skills", () => {
  it("only references icons the generator knows about", () => {
    const known = new Set<string>([ ...SIMPLE_ICON_SLUGS, ...MANUAL_ICON_SLUGS ]);

    for (const category of skillCategories) {
      for (const skill of category.skills) {
        expect(known.has(skill.icon), `unknown icon "${skill.icon}"`).toBe(true);
      }
    }
  });

  it("declares no icon slug twice", () => {
    const slugs = [ ...SIMPLE_ICON_SLUGS, ...MANUAL_ICON_SLUGS ];
    expect(new Set<string>(slugs).size).toBe(slugs.length);
  });

  it("lists no skill twice across categories", () => {
    const names = skillCategories.flatMap((category) => category.skills.map((s) => s.name));
    expect(new Set(names).size).toBe(names.length);
  });

  it("has no empty category and no empty skill name", () => {
    for (const category of skillCategories) {
      expect(category.skills.length, `category "${category.id}" is empty`).toBeGreaterThan(0);
      for (const skill of category.skills) expect(skill.name.trim()).not.toBe("");
    }
  });

  it("gives every category a distinct id", () => {
    const ids = skillCategories.map((category) => category.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps the AI category out of the logo grids", () => {
    expect(skillCategories.some((category) => category.id === AI_CATEGORY)).toBe(false);
  });

  it("has a heading in both catalogs for every category name it uses", () => {
    for (const category of skillCategories) {
      for (const locale of LOCALES) {
        const heading = catalogs[ locale ]?.[ categoryKey(category.id) ];
        expect(heading, `missing Skills.${categoryKey(category.id)} in ${locale}.json`)
          .toBeTypeOf("string");
        expect(heading?.trim()).not.toBe("");
      }
    }
  });

  it("leaves no category heading in the catalog without a consumer", () => {
    const rendered = new Set<string>([
      ...skillCategories.map((category) => categoryKey(category.id)),
      categoryKey(AI_CATEGORY),
    ]);
    const declared = Object.keys(en.Skills).filter((key) => key.startsWith(CATEGORY_KEY_PREFIX));

    expect([ ...declared ].sort()).toEqual([ ...rendered ].sort());
  });
});
