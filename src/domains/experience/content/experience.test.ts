// src/domains/experience/content/experience.test.ts
import { describe, expect, it } from "vitest";

import { LOCALES } from "@/domains/core/config/locales";
import { parseYearMonth } from "@/domains/core/utils/period";
import { experience } from "@/domains/experience/content/experience";

/**
 * Content invariants the type system cannot check, such as two locales carrying a different
 * number of bullets, which compiles and renders without complaint.
 *
 * Nothing here reads the system clock: every date lives in the content as data and is
 * compared against other data.
 */

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** `YearMonth` at runtime. The template literal type accepts `${number}`, which is wider. */
const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Logos are paths under `public/`, never imported modules. */
const LOGO_PATH = /^\/companies\/[a-z0-9]+(-[a-z0-9]+)*\.png$/;

/**
 * The id and bullet count of every position in the CV. Pinned as a whole object, so a
 * dropped entry, a renamed id and a lost bullet all fail in the same assertion.
 */
const CV_BULLETS = {
  "flusso-dynamics-group": 6,
  bitnat: 8,
  soustitreur: 4,
  servieduca: 4,
};

/** Every localized string a card renders as prose, in every locale. */
const prose = (): string[] => experience.flatMap((entry) => LOCALES.flatMap((locale) => [
  entry.role[ locale ],
  entry.summary[ locale ],
  ...entry.highlights[ locale ],
]));

describe("experience", () => {
  it("uses kebab-case slugs and never repeats one", () => {
    const ids = experience.map((entry) => entry.id);
    for (const id of ids) expect(id).toMatch(SLUG);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("stores every date as YYYY-MM data, never as a formatted string", () => {
    for (const entry of experience) {
      expect(entry.startDate, `startDate of "${entry.id}"`).toMatch(YEAR_MONTH);
      if (entry.endDate === null) continue;
      expect(entry.endDate, `endDate of "${entry.id}"`).toMatch(YEAR_MONTH);
    }
  });

  it("has the same number of highlights in every locale", () => {
    for (const entry of experience) {
      const counts = LOCALES.map((locale) => entry.highlights[ locale ].length);
      expect(new Set(counts).size, `highlight count mismatch in "${entry.id}"`).toBe(1);
    }
  });

  it("keeps the four positions and the bullet counts the CV states", () => {
    for (const locale of LOCALES) {
      const counts = Object.fromEntries(
        experience.map((entry) => [ entry.id, entry.highlights[ locale ].length ]),
      );
      expect(counts, `bullet counts in "${locale}"`).toEqual(CV_BULLETS);
    }
  });

  it("has no empty localized string anywhere", () => {
    for (const entry of experience) {
      for (const locale of LOCALES) {
        expect(entry.role[ locale ].trim()).not.toBe("");
        expect(entry.summary[ locale ].trim()).not.toBe("");
        for (const highlight of entry.highlights[ locale ]) expect(highlight.trim()).not.toBe("");
      }
    }
  });

  it("has no untrimmed or truncated prose", () => {
    for (const line of prose()) {
      expect(line, `"${line}" is padded`).toBe(line.trim());
      expect(line.includes("  "), `"${line}" has a double space`).toBe(false);
    }

    for (const entry of experience) {
      for (const locale of LOCALES) {
        for (const highlight of entry.highlights[ locale ]) {
          expect(highlight.endsWith("."), `unfinished bullet in "${entry.id}" (${locale})`).toBe(true);
        }
      }
    }
  });

  it("never repeats a bullet inside the same position", () => {
    for (const entry of experience) {
      for (const locale of LOCALES) {
        const bullets = entry.highlights[ locale ];
        expect(new Set(bullets).size, `duplicated bullet in "${entry.id}" (${locale})`)
          .toBe(bullets.length);
      }
    }
  });

  it("writes no date, no period and no present label into the prose", () => {
    // Period labels are derived from startDate and endDate by formatPeriod, so a year, an
    // en dash or the present label in a bullet means the same fact is written twice.
    for (const line of prose()) {
      expect(line, `"${line}" contains a year`).not.toMatch(/\d{4}/);
      expect(line, `"${line}" contains a period separator`).not.toContain("–");
      expect(line, `"${line}" writes the present label`).not.toMatch(/\bpresent(e|s|es)?\b/i);
    }
  });

  it("never writes the years of experience by hand", () => {
    // The years of experience come from yearsOfExperienceAt(); copy carries {years}.
    for (const line of prose()) {
      expect(line, `"${line}" hard-codes an experience count`)
        .not.toMatch(/\d+\s*\+?\s*(years?|años?)\b/i);
    }
  });

  it("is ordered newest first", () => {
    const starts = experience.map((entry) => parseYearMonth(entry.startDate).getTime());
    expect([ ...starts ].sort((a, b) => b - a)).toEqual(starts);
  });

  it("has at most one ongoing position", () => {
    expect(experience.filter((entry) => entry.endDate === null).length).toBeLessThanOrEqual(1);
  });

  it("puts the ongoing position first when there is one", () => {
    // The job title is read from the ongoing entry, so it is the newest entry's role only
    // while the ongoing entry is also the first one.
    const ongoing = experience.findIndex((entry) => entry.endDate === null);
    if (ongoing === -1) return;
    expect(ongoing).toBe(0);
  });

  it("never ends before it starts", () => {
    for (const entry of experience) {
      if (entry.endDate === null) continue;
      expect(parseYearMonth(entry.endDate).getTime())
        .toBeGreaterThan(parseYearMonth(entry.startDate).getTime());
    }
  });

  it("names a company and a stack of proper nouns in every entry", () => {
    for (const entry of experience) {
      expect(entry.company.trim(), `company of "${entry.id}"`).not.toBe("");
      expect(entry.stack.length, `empty stack in "${entry.id}"`).toBeGreaterThan(0);
      for (const technology of entry.stack) expect(technology.trim()).not.toBe("");
      expect(new Set(entry.stack).size, `duplicated technology in "${entry.id}"`)
        .toBe(entry.stack.length);
    }
  });

  it("points every logo at a kebab-case PNG under /companies", () => {
    // Shape only: whether the file exists on disk is not checked here.
    for (const entry of experience) {
      if (entry.logo === null) continue;
      expect(entry.logo, `logo of "${entry.id}"`).toMatch(LOGO_PATH);
    }
  });

  it("links only to absolute https company URLs", () => {
    for (const entry of experience) {
      if (entry.companyUrl === null) continue;
      expect(entry.companyUrl, `companyUrl of "${entry.id}"`).toMatch(/^https:\/\//);
    }
  });
});
