// src/domains/experience/queries/getExperienceTimeline.test.ts
import { describe, expect, it } from "vitest";

import { experience } from "@/domains/experience/content/experience";
import { getExperienceTimeline } from "@/domains/experience/queries/getExperienceTimeline";
import type { LocalizedExperience } from "@/domains/experience/types";

/**
 * Pins everything the query derives — the period label, the duration label and `isCurrent` —
 * against a fixed clock, so no assertion changes with the month it runs in.
 */

/** The pinned "today", the same anchor `period.test.ts` uses. */
const TODAY = new Date("2026-09-14T00:00:00Z");

/** What `t("Common.present")` returns in each locale. */
const PRESENT = { en: "Present", es: "Presente" };

/** Reverse chronological, exactly as the content array is written. */
const ORDER = [ "flusso-dynamics-group", "bitnat", "soustitreur", "servieduca" ];

const find = (entries: readonly LocalizedExperience[], id: string): LocalizedExperience => {
  const entry = entries.find((candidate) => candidate.id === id);
  if (entry === undefined) throw new Error(`the timeline has no entry "${id}"`);
  return entry;
};

describe("getExperienceTimeline", () => {
  it("keeps the order of the content array and never sorts", () => {
    expect(getExperienceTimeline("en", PRESENT.en, TODAY).map((entry) => entry.id)).toEqual(ORDER);
    expect(getExperienceTimeline("es", PRESENT.es, TODAY).map((entry) => entry.id)).toEqual(ORDER);
    expect(experience.map((entry) => entry.id)).toEqual(ORDER);
  });

  it("derives isCurrent from the missing end date, for exactly one position", () => {
    const timeline = getExperienceTimeline("en", PRESENT.en, TODAY);
    expect(timeline.filter((entry) => entry.isCurrent).map((entry) => entry.id))
      .toEqual([ "flusso-dynamics-group" ]);
  });

  it("formats the period and the duration of every position, in English", () => {
    const timeline = getExperienceTimeline("en", PRESENT.en, TODAY);
    expect(find(timeline, "flusso-dynamics-group").periodLabel).toBe("Feb 2026 – Present");
    expect(find(timeline, "flusso-dynamics-group").durationLabel).toBe("8 months");
    expect(find(timeline, "bitnat").periodLabel).toBe("Dec 2023 – Jul 2025");
    expect(find(timeline, "bitnat").durationLabel).toBe("1 year and 8 months");
    expect(find(timeline, "soustitreur").periodLabel).toBe("Feb 2023 – Aug 2023");
    expect(find(timeline, "soustitreur").durationLabel).toBe("7 months");
    expect(find(timeline, "servieduca").periodLabel).toBe("Oct 2021 – Feb 2023");
    expect(find(timeline, "servieduca").durationLabel).toBe("1 year and 5 months");
  });

  it("formats the period and the duration of every position, in Spanish", () => {
    const timeline = getExperienceTimeline("es", PRESENT.es, TODAY);
    expect(find(timeline, "flusso-dynamics-group").periodLabel).toBe("Feb 2026 – Presente");
    expect(find(timeline, "flusso-dynamics-group").durationLabel).toBe("8 meses");
    expect(find(timeline, "bitnat").periodLabel).toBe("Dic 2023 – Jul 2025");
    expect(find(timeline, "bitnat").durationLabel).toBe("1 año y 8 meses");
    expect(find(timeline, "soustitreur").periodLabel).toBe("Feb 2023 – Ago 2023");
    expect(find(timeline, "soustitreur").durationLabel).toBe("7 meses");
    expect(find(timeline, "servieduca").periodLabel).toBe("Oct 2021 – Feb 2023");
    expect(find(timeline, "servieduca").durationLabel).toBe("1 año y 5 meses");
  });

  it("uses the injected present label and nothing else", () => {
    const timeline = getExperienceTimeline("en", "STILL HERE", TODAY);
    const current = find(timeline, "flusso-dynamics-group");
    expect(current.periodLabel).toBe("Feb 2026 – STILL HERE");

    // Only the ongoing position may carry the label.
    for (const entry of timeline.filter((candidate) => !candidate.isCurrent)) {
      expect(entry.periodLabel, `"${entry.id}" leaked the present label`).not.toContain("STILL HERE");
    }
  });

  it("localizes the prose and leaves no localized object behind", () => {
    const english = getExperienceTimeline("en", PRESENT.en, TODAY);
    const spanish = getExperienceTimeline("es", PRESENT.es, TODAY);

    expect(find(english, "servieduca").role).toBe("Frontend Developer");
    expect(find(spanish, "servieduca").role).toBe("Desarrollador Frontend");
    expect(find(english, "flusso-dynamics-group").role).toBe("Full Stack Developer");
    expect(find(spanish, "flusso-dynamics-group").role).toBe("Desarrollador Full Stack");

    for (const entry of english) {
      const other = find(spanish, entry.id);
      expect(typeof entry.role).toBe("string");
      expect(typeof entry.summary).toBe("string");
      expect(entry.summary, `"${entry.id}" is not translated`).not.toBe(other.summary);
      expect(entry.highlights.length).toBe(other.highlights.length);
      for (const highlight of entry.highlights) expect(typeof highlight).toBe("string");
    }
  });

  it("carries the untranslated fields through untouched", () => {
    const timeline = getExperienceTimeline("es", PRESENT.es, TODAY);
    for (const entry of timeline) {
      const source = experience.find((candidate) => candidate.id === entry.id);
      expect(source, `"${entry.id}" is not in the content`).toBeDefined();
      expect(entry.company).toBe(source?.company);
      expect(entry.companyUrl).toBe(source?.companyUrl);
      expect(entry.logo).toBe(source?.logo);
      expect(entry.stack).toEqual(source?.stack);
      expect(entry.highlights).toEqual(source?.highlights.es);
    }
  });

  it("is pure: same arguments, same result, and the content is never touched", () => {
    const before = JSON.stringify(experience);
    const first = getExperienceTimeline("en", PRESENT.en, TODAY);
    const second = getExperienceTimeline("en", PRESENT.en, TODAY);
    expect(first).toEqual(second);
    expect(JSON.stringify(experience)).toBe(before);
  });

  it("only lets `now` move the ongoing position", () => {
    // `now` defaults to the real clock, so the default is asserted only on finished
    // positions, which carry both endpoints in the data.
    const pinned = getExperienceTimeline("en", PRESENT.en, TODAY);
    const ambient = getExperienceTimeline("en", PRESENT.en);

    for (const entry of ambient.filter((candidate) => !candidate.isCurrent)) {
      expect(entry, `"${entry.id}" moved with the clock`).toEqual(find(pinned, entry.id));
    }

    const later = getExperienceTimeline("en", PRESENT.en, new Date("2027-01-14T00:00:00Z"));
    expect(find(later, "flusso-dynamics-group").durationLabel).toBe("1 year");
    expect(find(later, "flusso-dynamics-group").periodLabel).toBe("Feb 2026 – Present");
  });
});
