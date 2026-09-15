// src/domains/skills/components/SkillCategory.tsx
import { Stagger } from "@/components/motion/Stagger";
import { SkillBadge } from "@/domains/skills/components/SkillBadge";
import type { SkillCategory as SkillCategoryContent } from "@/domains/skills/types";

interface SkillCategoryProps {
  readonly category: SkillCategoryContent;

  /** Already translated. This component never calls getTranslations. */
  readonly title: string;
}

/**
 * One category of the skill list: its label and the chips of its technologies.
 *
 * The chips are a wrapping row and never a horizontal scroller. Each one is a direct child
 * of <Stagger> and carries `data-reveal="hidden"` from the server, which is what the group
 * observer and the nth-child delay of the CSS need; without JavaScript no chip is hidden.
 */
export function SkillCategory ({ category, title }: SkillCategoryProps) {
  return (
    <div className="py-6 first:pt-0 last:pb-0 md:grid md:grid-cols-[11rem_1fr] md:gap-8 md:py-8">
      <h3 className="text-meta font-semibold text-foreground">{title}</h3>
      <Stagger
        as="ul"
        className="mt-4 flex flex-wrap gap-2 md:mt-0"
        step="tight"
      >
        {category.skills.map((skill) => (
          <li data-reveal="hidden" key={skill.name}>
            <SkillBadge skill={skill} />
          </li>
        ))}
      </Stagger>
    </div>
  );
}
