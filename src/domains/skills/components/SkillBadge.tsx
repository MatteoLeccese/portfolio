// src/domains/skills/components/SkillBadge.tsx
import { Badge } from "@/components/ui/badge";
import { BrandGlyph } from "@/domains/profile/components/BrandGlyph";
import type { Skill } from "@/domains/skills/types";

interface SkillBadgeProps {
  readonly skill: Skill;
}

/**
 * One technology chip: the brand glyph of the skill and its name.
 *
 * The glyph is a CSS mask over `currentColor`, so it takes the colour of the chip in both
 * themes, and it is hidden from assistive technology: the name next to it carries the
 * information. The chip is not a control and has no hover or focus state of its own.
 */
export function SkillBadge ({ skill }: SkillBadgeProps) {
  return (
    <Badge className="gap-2 px-3 py-1.5" variant="hairline">
      <BrandGlyph className="size-4" icon={skill.icon} />
      {skill.name}
    </Badge>
  );
}
