// src/domains/profile/queries/getJobTitle.test.ts
import { describe, expect, it } from "vitest";
import { LOCALES } from "@/domains/core/config/locales";
import { SITE } from "@/domains/core/config/site";
import { localize } from "@/domains/core/utils/localize";
import { yearsOfExperienceAt } from "@/domains/core/utils/period";
import { cvProfile, FALLBACK_JOB_TITLE } from "@/domains/profile/content/profile";
import { socials } from "@/domains/profile/content/socials";
import { getCurrentPosition, type PositionLike } from "@/domains/profile/queries/getCurrentPosition";
import { getJobTitle } from "@/domains/profile/queries/getJobTitle";

// Every clock-derived assertion in this file is pinned to a literal instant.
const TODAY = new Date("2026-09-14T00:00:00Z");

const ongoing = {
  role: { en: "Full Stack Developer", es: "Desarrollador Full Stack" },
  company: "Flusso Dynamics Group",
  endDate: null,
} satisfies PositionLike;

const finished = {
  role: { en: "Frontend Developer", es: "Desarrollador Frontend" },
  company: "Servieduca",
  endDate: "2023-02",
} satisfies PositionLike;

describe("getCurrentPosition", () => {
  it("is the entry with no end date", () => {
    expect(getCurrentPosition([ ongoing, finished ])).toBe(ongoing);
  });

  it("is null when every position has ended, which is what 'between roles' means", () => {
    expect(getCurrentPosition([ finished ])).toBeNull();
    expect(getCurrentPosition([])).toBeNull();
  });
});

describe("getJobTitle", () => {
  it("derives the title from the ongoing position", () => {
    expect(getJobTitle(getCurrentPosition([ ongoing, finished ]), "es"))
      .toBe("Desarrollador Full Stack");
    expect(getJobTitle(getCurrentPosition([ ongoing, finished ]), "en"))
      .toBe("Full Stack Developer");
  });

  it("falls back when there is no ongoing position", () => {
    expect(getCurrentPosition([ finished ])).toBeNull();
    expect(getJobTitle(null, "en")).toBe("Full Stack Developer");
    expect(getJobTitle(null, "es")).toBe("Desarrollador Full Stack");
  });

  it("has a spare title in every locale", () => {
    for (const locale of LOCALES) expect(FALLBACK_JOB_TITLE[ locale ].trim()).not.toBe("");
  });
});

describe("years of experience", () => {
  // Checks the value the site ships, SITE.careerStart, rather than the literal anchored
  // inside core.
  it("agrees with the CV at a pinned date", () => {
    expect(SITE.careerStart).toBe("2021-10");
    expect(yearsOfExperienceAt(SITE.careerStart, TODAY)).toBe(5);
  });

  it("reaches the copy through the placeholder and never through a literal", () => {
    const years = String(yearsOfExperienceAt(SITE.careerStart, TODAY));
    expect(localize(cvProfile, "en").replaceAll("{years}", years))
      .toContain("5 years of experience");
    expect(localize(cvProfile, "es").replaceAll("{years}", years))
      .toContain("5 años de experiencia");
  });
});

describe("cvProfile", () => {
  it("carries the {years} placeholder in every locale", () => {
    for (const locale of LOCALES) expect(cvProfile[ locale ]).toContain("{years}");
  });

  it("writes no number at all, so the '4+ years' bug cannot come back", () => {
    for (const locale of LOCALES) {
      expect(cvProfile[ locale ]).not.toMatch(/\d/);
      expect(cvProfile[ locale ]).not.toMatch(/\d+\s*(?:years of experience|años de experiencia)/);
    }
  });

  it("is present and non-empty in every locale", () => {
    for (const locale of LOCALES) expect(cvProfile[ locale ].trim().length).toBeGreaterThan(0);
  });
});

describe("socials", () => {
  it("lists each platform exactly once", () => {
    const ids = socials.map((link) => link.id);
    expect(ids).toEqual([ "github", "linkedin", "email" ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("reads every URL from SITE instead of writing it twice", () => {
    expect(socials.find((link) => link.id === "github")?.href).toBe(SITE.github);
    expect(socials.find((link) => link.id === "linkedin")?.href).toBe(SITE.linkedin);
    expect(socials.find((link) => link.id === "email")?.href).toBe(`mailto:${SITE.email}`);
  });

  it("never publishes the phone number", () => {
    const serialised = JSON.stringify(socials);
    const digits = SITE.phone.replace(/\D/g, "");
    expect(serialised).not.toContain(SITE.phone);
    expect(serialised).not.toContain(digits);
    for (const link of socials) expect(link.href.startsWith("tel:")).toBe(false);
  });

  it("labels every link with a non-empty proper noun", () => {
    for (const link of socials) expect(link.label.trim()).not.toBe("");
  });
});
