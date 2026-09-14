// src/domains/education/types/index.ts
import type { LocalizedText, Slug } from "@/domains/core/types";

export interface EducationEntry {
  readonly id: Slug;

  readonly degree: LocalizedText;

  /** Proper noun. Never translated. */
  readonly institution: string;

  /** The common abbreviation, shown as a secondary label. */
  readonly institutionShort: string;

  readonly location: string;

  /** Year of completion. */
  readonly year: number;
}
