// src/domains/skills/components/SkillsSection.tsx
import { getTranslations } from "next-intl/server";

import { SectionHeading } from "@/components/common/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import type { SectionId } from "@/domains/core/config/navigation";
import { AiWorkflowPanel } from "@/domains/skills/components/AiWorkflowPanel";
import { SkillCategory } from "@/domains/skills/components/SkillCategory";
import { skillCategories } from "@/domains/skills/content/skills";
import type { SkillCategoryId } from "@/domains/skills/types";

const SECTION_ID: SectionId = "skills";

/**
 * The heading key of each category. `ai` belongs to AiWorkflowPanel, which reads it
 * itself: that category is a panel and not a row of chips, so it is absent from
 * skillCategories.
 */
const CATEGORY_TITLE_KEY = {
  ai: "categoryAi",
  frontend: "categoryFrontend",
  backend: "categoryBackend",
  data: "categoryData",
  platform: "categoryPlatform",
} as const satisfies Record<SkillCategoryId, string>;

/**
 * The skill section: the AI panel first, then one row of chips per category.
 *
 * The section carries no id of its own; SectionHeading writes it, and the accessible name
 * of the region is the <h2> it renders. Category labels come from the message catalogue
 * and skill names are proper nouns that are never translated.
 */
export async function SkillsSection () {
  const t = await getTranslations("Skills");

  return (
    <section aria-labelledby={`${SECTION_ID}-title`} className="container-page section-y">
      <SectionHeading id={SECTION_ID} subtitle={t("subtitle")} title={t("title")} />

      <Reveal className="mt-10 md:mt-12">
        <AiWorkflowPanel />
      </Reveal>

      <div className="mt-12 divide-y divide-hairline md:mt-16">
        {skillCategories.map((category) => (
          <SkillCategory
            category={category}
            key={category.id}
            title={t(CATEGORY_TITLE_KEY[ category.id ])}
          />
        ))}
      </div>
    </section>
  );
}
