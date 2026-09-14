// src/domains/core/config/navigation.ts

/**
 * The sections of the one-page site, in render order. The scroll-spy, the nav and the
 * section headings all read this array.
 */
export const SECTION_IDS = [
  "hero",
  "about",
  "skills",
  "experience",
  "education",
  "projects",
  "contact",
] as const;

export type SectionId = (typeof SECTION_IDS)[ number ];

/** The section ids that get a nav entry: every section except the hero. */
export const NAV_SECTION_IDS = SECTION_IDS.filter(
  (id): id is Exclude<SectionId, "hero"> => id !== "hero",
);
