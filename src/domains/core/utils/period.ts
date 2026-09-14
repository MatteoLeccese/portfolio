// src/domains/core/utils/period.ts
import type { Locale, YearMonth } from "@/domains/core/types";

/**
 * Date helpers for the `YYYY-MM` content model. Every function here is pure and receives
 * the current instant as a parameter; nothing reads the ambient clock.
 */

/** Parses a `YYYY-MM` into the first day of that month, at midnight UTC. */
export function parseYearMonth (value: YearMonth): Date {
  const [ year, month ] = value.split("-");
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1));
}

/** Exclusive: 2021-10 -> 2026-09 is 59 months. */
export function monthsBetween (from: Date, to: Date): number {
  return (to.getUTCFullYear() - from.getUTCFullYear()) * 12
    + (to.getUTCMonth() - from.getUTCMonth());
}

/**
 * Formats a `YYYY-MM` as an abbreviated month and year, such as "Feb 2026". The first
 * letter is capitalised and any trailing period is stripped, so the Spanish "feb. 2026"
 * comes back as "Feb 2026". Abbreviations longer than three letters, such as the Spanish
 * "Sept", are kept whole.
 */
export function formatYearMonth (value: YearMonth, locale: Locale): string {
  const formatted = new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseYearMonth(value));

  const cleaned = formatted.replaceAll(".", "");
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Formats a start and an end month as a range joined by an en dash, such as
 * "Feb 2026 – Present".
 *
 * @param start The first month of the period.
 * @param end The last month, or `null` when the period is ongoing.
 * @param locale The locale to format the months in.
 * @param presentLabel The wording used in place of an end month when `end` is `null`.
 */
export function formatPeriod (
  start: YearMonth,
  end: YearMonth | null,
  locale: Locale,
  presentLabel: string,
): string {
  const from = formatYearMonth(start, locale);
  const to = end === null ? presentLabel : formatYearMonth(end, locale);
  return `${from} – ${to}`;
}

export interface Duration {
  readonly years: number;
  readonly months: number;
}

/**
 * The length of a period in years and months, counting both endpoints: Oct 2021 to
 * Feb 2023 is 17 months, and a period that starts and ends in the same month is one
 * month. A `null` end is measured against `now`.
 */
export function durationOf (start: YearMonth, end: YearMonth | null, now: Date): Duration {
  const total = monthsBetween(parseYearMonth(start), end === null ? now : parseYearMonth(end)) + 1;
  return { years: Math.floor(total / 12), months: total % 12 };
}

/**
 * Formats a duration as localized prose, such as "1 year and 8 months". A unit with a
 * value of zero is dropped, except that a zero duration still renders as zero months.
 * The plural forms and the conjunction come from Intl, not from the message catalog.
 */
export function formatDuration (duration: Duration, locale: Locale): string {
  const unit = (value: number, name: "year" | "month"): string =>
    new Intl.NumberFormat(locale, { style: "unit", unit: name, unitDisplay: "long" }).format(value);

  const parts: string[] = [];
  if (duration.years > 0) parts.push(unit(duration.years, "year"));
  if (duration.months > 0) parts.push(unit(duration.months, "month"));
  if (parts.length === 0) parts.push(unit(0, "month"));

  return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(parts);
}

/**
 * Whole years of professional experience between `start` and `now`, rounded to the
 * nearest year and never below 1.
 */
export function yearsOfExperienceAt (start: YearMonth, now: Date): number {
  return Math.max(1, Math.round(monthsBetween(parseYearMonth(start), now) / 12));
}
