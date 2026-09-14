// src/domains/skills/types/index.ts
import type { IconSlug } from "@/domains/skills/content/icons";

export type SkillCategoryId = "ai" | "frontend" | "backend" | "data" | "platform";

export interface Skill {

  /** Proper noun, written exactly as the vendor writes it. Never translated. */
  readonly name: string;

  /** Simple Icons slug, or one of the hand-committed slugs. Checked at compile time. */
  readonly icon: IconSlug;
}

export interface SkillCategory {
  readonly id: SkillCategoryId;
  readonly skills: readonly Skill[];
}
