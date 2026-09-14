// src/domains/core/utils/period.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Locale, YearMonth } from "@/domains/core/types";
import {
  durationOf,
  formatDuration,
  formatPeriod,
  formatYearMonth,
  monthsBetween,
  parseYearMonth,
  yearsOfExperienceAt,
} from "@/domains/core/utils/period";

/**
 * Every date in this file is pinned and no assertion reads the system clock, so the suite
 * cannot change its answer with the month it runs in.
 *
 * `CAREER_START` is a literal rather than `SITE.careerStart`, so editing the content
 * cannot move the anchor; the test that the literal and the content agree lives in
 * `domains/profile`.
 */

const CAREER_START = "2021-10" satisfies YearMonth;

/** The instant every clock-derived assertion is pinned to. */
const TODAY = new Date("2026-09-14T00:00:00Z");

const at = (isoDay: string): Date => new Date(`${isoDay}T00:00:00Z`);

describe("parseYearMonth", () => {
  it("lands on the first day of the month, in UTC", () => {
    expect(parseYearMonth("2021-10").toISOString()).toBe("2021-10-01T00:00:00.000Z");
    expect(parseYearMonth("2026-02").toISOString()).toBe("2026-02-01T00:00:00.000Z");
  });

  it("reads December as month 12, not as month 13", () => {
    expect(parseYearMonth("2023-12").getUTCFullYear()).toBe(2023);
    expect(parseYearMonth("2023-12").getUTCMonth()).toBe(11);
  });
});

describe("monthsBetween", () => {
  it("is exclusive: it counts boundaries crossed, not months occupied", () => {
    expect(monthsBetween(parseYearMonth("2026-02"), parseYearMonth("2026-02"))).toBe(0);
    expect(monthsBetween(parseYearMonth("2021-10"), parseYearMonth("2026-09"))).toBe(59);
  });

  it("crosses the year boundary without a jump", () => {
    expect(monthsBetween(parseYearMonth("2023-12"), parseYearMonth("2024-01"))).toBe(1);
    expect(monthsBetween(parseYearMonth("2023-11"), parseYearMonth("2024-02"))).toBe(3);
    expect(monthsBetween(parseYearMonth("2023-01"), parseYearMonth("2024-01"))).toBe(12);
  });

  it("ignores the day of the month of the right-hand date", () => {
    expect(monthsBetween(parseYearMonth("2026-02"), at("2026-09-01"))).toBe(7);
    expect(monthsBetween(parseYearMonth("2026-02"), at("2026-09-30"))).toBe(7);
  });

  it("goes negative when the arguments run backwards", () => {
    expect(monthsBetween(parseYearMonth("2026-09"), parseYearMonth("2021-10"))).toBe(-59);
  });
});

describe("durationOf", () => {
  it("counts both endpoints: Oct 2021 -> Feb 2023 is 17 months of work, not 16", () => {
    expect(durationOf("2021-10", "2023-02", TODAY)).toEqual({ years: 1, months: 5 });
  });

  it("calls a contract that starts and ends in the same month one month, not zero", () => {
    expect(durationOf("2023-02", "2023-02", TODAY)).toEqual({ years: 0, months: 1 });
  });

  it("reports exactly twelve months as one year and no months", () => {
    expect(durationOf("2024-01", "2024-12", TODAY)).toEqual({ years: 1, months: 0 });
    expect(durationOf("2024-01", "2025-01", TODAY)).toEqual({ years: 1, months: 1 });
  });

  /* A null end date means ongoing, and the open end is measured against the injected `now`. */
  it("measures an ongoing position against the injected now", () => {
    expect(durationOf("2026-02", null, TODAY)).toEqual({ years: 0, months: 8 });
    expect(durationOf("2026-02", null, at("2027-02-01"))).toEqual({ years: 1, months: 1 });
  });

  it("reads one month for a position that has not completed a month yet", () => {
    expect(durationOf("2026-09", null, TODAY)).toEqual({ years: 0, months: 1 });
    expect(durationOf("2026-09", null, at("2026-09-01"))).toEqual({ years: 0, months: 1 });
  });

  it("ignores `now` entirely once the position has an end date", () => {
    const closed = durationOf("2021-10", "2023-02", at("2099-01-01"));
    expect(closed).toEqual(durationOf("2021-10", "2023-02", at("2023-02-01")));
  });

  it("reproduces the four durations the CV implies", () => {
    expect(durationOf("2026-02", null, TODAY)).toEqual({ years: 0, months: 8 });
    expect(durationOf("2023-12", "2025-07", TODAY)).toEqual({ years: 1, months: 8 });
    expect(durationOf("2023-02", "2023-08", TODAY)).toEqual({ years: 0, months: 7 });
    expect(durationOf("2021-10", "2023-02", TODAY)).toEqual({ years: 1, months: 5 });
  });
});

describe("yearsOfExperienceAt", () => {
  it("matches the CV at the pinned date", () => {
    // 2021-10 to 2026-09 is 59 months (4 y 11 m), which rounds to 5.
    expect(yearsOfExperienceAt(CAREER_START, TODAY)).toBe(5);
    expect(yearsOfExperienceAt(CAREER_START, at("2026-09-11"))).toBe(5);
  });

  it("would contradict the CV if it floored instead of rounding", () => {
    const months = monthsBetween(parseYearMonth(CAREER_START), TODAY);
    expect(months).toBe(59);
    expect(Math.floor(months / 12)).toBe(4);
    expect(Math.round(months / 12)).toBe(5);
  });

  it("rounds up at the half-year, deliberately", () => {
    expect(yearsOfExperienceAt(CAREER_START, at("2027-03-01"))).toBe(5);
    expect(yearsOfExperienceAt(CAREER_START, at("2027-04-01"))).toBe(6);
  });

  it("is already showing the new number on the anniversary month and the one before it", () => {
    expect(yearsOfExperienceAt(CAREER_START, at("2026-09-01"))).toBe(5);
    expect(yearsOfExperienceAt(CAREER_START, at("2026-10-01"))).toBe(5);
    expect(monthsBetween(parseYearMonth(CAREER_START), at("2026-10-01"))).toBe(60);
  });

  it("does not jump when the calendar year changes", () => {
    expect(yearsOfExperienceAt(CAREER_START, at("2026-12-31"))).toBe(5);
    expect(yearsOfExperienceAt(CAREER_START, at("2027-01-01"))).toBe(5);
  });

  it("floors at one year on day one, so the copy never renders a zero", () => {
    expect(yearsOfExperienceAt("2026-09", TODAY)).toBe(1);
    expect(yearsOfExperienceAt("2026-09", at("2026-09-01"))).toBe(1);
    expect(yearsOfExperienceAt("2027-01", TODAY)).toBe(1);
  });

  it("never runs backwards", () => {
    const timeline = [
      "2021-10-01", "2022-04-01", "2023-01-01", "2024-06-30", "2025-12-31",
      "2026-09-14", "2027-03-01", "2027-04-01", "2028-09-14",
    ];

    const values = timeline.map((day) => yearsOfExperienceAt(CAREER_START, at(day)));
    expect([ ...values ].sort((a, b) => a - b)).toEqual(values);
    expect(values.at(-1)).toBe(7);
  });
});

describe("formatYearMonth", () => {
  it("capitalises the Spanish abbreviation and keeps the four-letter September", () => {
    expect(formatYearMonth("2026-02", "en")).toBe("Feb 2026");
    expect(formatYearMonth("2026-02", "es")).toBe("Feb 2026");
    expect(formatYearMonth("2023-12", "es")).toBe("Dic 2023");
    expect(formatYearMonth("2026-09", "es")).toBe("Sept 2026");
    expect(formatYearMonth("2026-09", "en")).toBe("Sep 2026");
  });

  it("renders the five months the CV actually uses, in both locales", () => {
    expect(formatYearMonth("2026-02", "en")).toBe("Feb 2026");
    expect(formatYearMonth("2023-12", "en")).toBe("Dec 2023");
    expect(formatYearMonth("2025-07", "en")).toBe("Jul 2025");
    expect(formatYearMonth("2023-08", "en")).toBe("Aug 2023");
    expect(formatYearMonth("2021-10", "en")).toBe("Oct 2021");

    expect(formatYearMonth("2026-02", "es")).toBe("Feb 2026");
    expect(formatYearMonth("2023-12", "es")).toBe("Dic 2023");
    expect(formatYearMonth("2025-07", "es")).toBe("Jul 2025");
    expect(formatYearMonth("2023-08", "es")).toBe("Ago 2023");
    expect(formatYearMonth("2021-10", "es")).toBe("Oct 2021");
  });

  /*
   * The month abbreviations as Node 22.22.0 / ICU 77.1 produces them. A runtime that
   * abbreviates differently fails here rather than changing a date badge silently.
   */
  it("abbreviates all twelve months as this runtime does", () => {
    const year = (locale: Locale): string[] =>
      Array.from({ length: 12 }, (_unused, index) => {
        const month = String(index + 1).padStart(2, "0");
        return formatYearMonth(`2026-${month}` as YearMonth, locale);
      });

    expect(year("en")).toEqual([
      "Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026", "May 2026", "Jun 2026",
      "Jul 2026", "Aug 2026", "Sep 2026", "Oct 2026", "Nov 2026", "Dec 2026",
    ]);
    expect(year("es")).toEqual([
      "Ene 2026", "Feb 2026", "Mar 2026", "Abr 2026", "May 2026", "Jun 2026",
      "Jul 2026", "Ago 2026", "Sept 2026", "Oct 2026", "Nov 2026", "Dic 2026",
    ]);
  });

  it("never leaves a trailing period or a lowercase first letter", () => {
    for (const locale of [ "en", "es" ] satisfies Locale[]) {
      for (let index = 1; index <= 12; index += 1) {
        const month = String(index).padStart(2, "0");
        const label = formatYearMonth(`2024-${month}` as YearMonth, locale);
        expect(label).not.toContain(".");
        expect(label.charAt(0)).toBe(label.charAt(0).toUpperCase());
      }
    }
  });

  it("is unaffected by the day of the month, because there is no day to be affected by", () => {
    expect(formatYearMonth("2026-01", "es")).toBe("Ene 2026");
    expect(formatYearMonth("2025-12", "es")).toBe("Dic 2025");
  });
});

describe("formatPeriod", () => {
  it("uses the injected present label and both endpoints", () => {
    expect(formatPeriod("2026-02", null, "es", "Presente")).toBe("Feb 2026 – Presente");
    expect(formatPeriod("2026-02", null, "en", "Present")).toBe("Feb 2026 – Present");
    expect(formatPeriod("2021-10", "2023-02", "en", "Present")).toBe("Oct 2021 – Feb 2023");
    expect(formatPeriod("2021-10", "2023-02", "es", "Presente")).toBe("Oct 2021 – Feb 2023");
  });

  it("writes back whatever label it is given, and invents none", () => {
    expect(formatPeriod("2026-02", null, "en", "still there")).toBe("Feb 2026 – still there");
    expect(formatPeriod("2026-02", null, "es", "")).toBe("Feb 2026 – ");
  });

  it("joins with an en dash, not a hyphen", () => {
    expect(formatPeriod("2021-10", "2023-02", "en", "Present")).toContain("–");
    expect(formatPeriod("2021-10", "2023-02", "en", "Present")).not.toContain("-");
  });
});

describe("formatDuration", () => {
  it("drops the empty unit", () => {
    expect(formatDuration({ years: 0, months: 7 }, "en")).toBe("7 months");
    expect(formatDuration({ years: 4, months: 0 }, "es")).toBe("4 años");
    expect(formatDuration({ years: 1, months: 8 }, "es")).toBe("1 año y 8 meses");
    expect(formatDuration({ years: 1, months: 8 }, "en")).toBe("1 year and 8 months");
  });

  it("gets the singular right in both locales", () => {
    expect(formatDuration({ years: 1, months: 1 }, "es")).toBe("1 año y 1 mes");
    expect(formatDuration({ years: 1, months: 1 }, "en")).toBe("1 year and 1 month");
    expect(formatDuration({ years: 0, months: 1 }, "es")).toBe("1 mes");
  });

  it("says zero months rather than an empty string", () => {
    expect(formatDuration({ years: 0, months: 0 }, "en")).toBe("0 months");
    expect(formatDuration({ years: 0, months: 0 }, "es")).toBe("0 meses");
  });

  it("labels the four CV positions in both locales", () => {
    expect(formatDuration(durationOf("2026-02", null, TODAY), "en")).toBe("8 months");
    expect(formatDuration(durationOf("2026-02", null, TODAY), "es")).toBe("8 meses");
    expect(formatDuration(durationOf("2023-12", "2025-07", TODAY), "en")).toBe("1 year and 8 months");
    expect(formatDuration(durationOf("2023-02", "2023-08", TODAY), "en")).toBe("7 months");
    expect(formatDuration(durationOf("2021-10", "2023-02", TODAY), "en")).toBe("1 year and 5 months");
  });
});

/*
 * Fake timers replace Date and Date.now wholesale and move the system clock decades away,
 * so an implementation that read the ambient clock instead of its `now` parameter could
 * not return these values.
 */

describe("purity", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the same answers with the system clock moved seventy years away", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-06-30T12:00:00Z"));

    expect(yearsOfExperienceAt(CAREER_START, TODAY)).toBe(5);
    expect(durationOf("2026-02", null, TODAY)).toEqual({ years: 0, months: 8 });
    expect(durationOf("2021-10", "2023-02", TODAY)).toEqual({ years: 1, months: 5 });
    expect(formatPeriod("2026-02", null, "es", "Presente")).toBe("Feb 2026 – Presente");
    expect(formatYearMonth("2021-10", "es")).toBe("Oct 2021");
    expect(monthsBetween(parseYearMonth(CAREER_START), TODAY)).toBe(59);
  });

  it("returns the same answers with the system clock moved into the past", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("1999-01-01T00:00:00Z"));

    expect(yearsOfExperienceAt(CAREER_START, TODAY)).toBe(5);
    expect(durationOf("2026-02", null, TODAY)).toEqual({ years: 0, months: 8 });
    expect(formatDuration(durationOf("2026-02", null, TODAY), "en")).toBe("8 months");
  });
});
