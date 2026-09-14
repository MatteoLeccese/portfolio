// src/domains/experience/queries/getExperienceTimeline.ts
import type { Locale } from "@/domains/core/types";
import { localize, localizeList } from "@/domains/core/utils/localize";
import { durationOf, formatDuration, formatPeriod } from "@/domains/core/utils/period";
import { experience } from "@/domains/experience/content/experience";
import type { LocalizedExperience } from "@/domains/experience/types";

/**
 * Localizes and formats every experience entry for rendering, in content order. Nothing
 * is sorted here.
 *
 * @param locale The locale to render the prose in.
 * @param presentLabel The wording used for an ongoing position.
 * @param now The instant an ongoing duration is measured against.
 */
export function getExperienceTimeline (
  locale: Locale,
  presentLabel: string,
  now: Date = new Date(),
): LocalizedExperience[] {
  return experience.map((entry) => ({
    id: entry.id,
    company: entry.company,
    companyUrl: entry.companyUrl,
    logo: entry.logo,
    role: localize(entry.role, locale),
    periodLabel: formatPeriod(entry.startDate, entry.endDate, locale, presentLabel),
    durationLabel: formatDuration(durationOf(entry.startDate, entry.endDate, now), locale),
    isCurrent: entry.endDate === null,
    summary: localize(entry.summary, locale),
    highlights: localizeList(entry.highlights, locale),
    stack: entry.stack,
  }));
}
