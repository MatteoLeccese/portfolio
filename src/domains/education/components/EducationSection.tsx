// src/domains/education/components/EducationSection.tsx
import { getTranslations } from "next-intl/server";

import { SectionHeading } from "@/components/common/SectionHeading";
import { Stagger } from "@/components/motion/Stagger";
import type { Locale } from "@/domains/core/types";
import { EducationItem } from "@/domains/education/components/EducationItem";
import { education } from "@/domains/education/content/education";

interface EducationSectionProps {
  readonly locale: Locale;
}

/**
 * The Education section: the heading and one card per entry of the content file, stacked
 * in a single column at every width.
 *
 * The list is a <ul> driven by the content array, so a second entry lands as another card
 * under the first one and changes nothing here. The anchor id lives on SectionHeading; the
 * <section> names itself after the heading instead of repeating the id.
 */
export async function EducationSection ({ locale }: EducationSectionProps) {
  const t = await getTranslations("Education");

  return (
    <section aria-labelledby="education-title" className="container-page section-y">
      <SectionHeading id="education" subtitle={t("subtitle")} title={t("title")} />

      <Stagger as="ul" className="mt-10 flex flex-col gap-4" step="base">
        {education.map((entry) => (
          <EducationItem key={entry.id} entry={entry} locale={locale} />
        ))}
      </Stagger>
    </section>
  );
}
