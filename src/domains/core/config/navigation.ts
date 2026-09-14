// src/domains/core/config/navigation.ts

/**
 * The seven sections of the one-page, in render order. The array IS the order: the
 * scroll-spy, the nav and the section headings all read it instead of repeating the list.
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

/** Everything but the hero: the hero is reached with the home link, not with a nav entry. */
export const NAV_SECTION_IDS = SECTION_IDS.filter(
  (id): id is Exclude<SectionId, "hero"> => id !== "hero",
);
