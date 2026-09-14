// src/domains/experience/types/index.ts
import type { LocalizedList, LocalizedText, Slug, YearMonth } from "@/domains/core/types";

export interface ExperienceEntry {

  /** Stable, human-readable slug. React key, anchor id and logo file name at once. */
  readonly id: Slug;

  /** Proper noun. Never translated. */
  readonly company: string;

  /** Employer website, or null when there is no link to render. */
  readonly companyUrl: string | null;

  /** Path under /public, or null to fall back to the typographic initials tile. */
  readonly logo: string | null;
  readonly role: LocalizedText;
  readonly startDate: YearMonth;

  /** `null` means the position is ongoing. At most one entry may be null. */
  readonly endDate: YearMonth | null;

  /** One sentence. Shown above the bullets, and alone when they are collapsed on mobile. */
  readonly summary: LocalizedText;

  /** The achievement bullets. The list has the same length in every locale. */
  readonly highlights: LocalizedList;

  /** Technologies, as proper nouns. Never translated. */
  readonly stack: readonly string[];
}

/** An experience entry already localized and formatted, with nothing left to derive. */
export interface LocalizedExperience {
  readonly id: Slug;
  readonly company: string;
  readonly companyUrl: string | null;
  readonly logo: string | null;
  readonly role: string;

  /** "Feb 2026 – Present" */
  readonly periodLabel: string;

  /** "8 months" */
  readonly durationLabel: string;
  readonly isCurrent: boolean;
  readonly summary: string;
  readonly highlights: string[];
  readonly stack: readonly string[];
}
