// src/domains/experience/components/ExperienceSection.tsx
import { getTranslations } from "next-intl/server";

import { SectionHeading } from "@/components/common/SectionHeading";
import type { SectionId } from "@/domains/core/config/navigation";
import { SITE } from "@/domains/core/config/site";
import type { Locale } from "@/domains/core/types";
import { yearsOfExperienceAt } from "@/domains/core/utils/period";
import { ExperienceTimeline } from "@/domains/experience/components/ExperienceTimeline";
import { getExperienceTimeline } from "@/domains/experience/queries/getExperienceTimeline";

interface ExperienceSectionProps {
  readonly locale: Locale;
}

const SECTION_ID: SectionId = "experience";

/**
 * The Experience section: the heading and the timeline of every position in the content
 * file, newest first.
 *
 * The years of the subtitle come from SITE.careerStart and the number of teams from the
 * timeline itself, so neither number is written by hand. "Present" reaches the query as an
 * argument, which keeps that wording in the message catalogue. The anchor id belongs to
 * SectionHeading; the <section> names itself after the heading instead of repeating it.
 */
export async function ExperienceSection ({ locale }: ExperienceSectionProps) {
  const t = await getTranslations("Experience");
  const common = await getTranslations("Common");
  const entries = getExperienceTimeline(locale, common("present"));

  return (
    <section aria-labelledby={`${SECTION_ID}-title`} className="container-page section-y">
      <SectionHeading
        id={SECTION_ID}
        subtitle={t("subtitle", {
          companies: entries.length,
          years: yearsOfExperienceAt(SITE.careerStart, new Date()),
        })}
        title={t("title")}
      />

      <ExperienceTimeline
        className="mt-10 md:mt-12"
        currentLabel={t("current")}
        entries={entries}
        responsibilitiesLabel={t("responsibilities")}
      />
    </section>
  );
}
