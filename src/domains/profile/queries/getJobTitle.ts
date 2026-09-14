// src/domains/profile/queries/getJobTitle.ts
import type { Locale } from "@/domains/core/types";
import { FALLBACK_JOB_TITLE } from "@/domains/profile/content/profile";
import type { PositionLike } from "@/domains/profile/queries/getCurrentPosition";

/**
 * The localized job title of the current position, or FALLBACK_JOB_TITLE when there is
 * none. Every surface that names the role reads it from here.
 *
 * @param current The ongoing position, or `null` when between roles.
 * @param locale The locale to return the title in.
 */
export function getJobTitle (current: PositionLike | null, locale: Locale): string {
  return current === null ? FALLBACK_JOB_TITLE[ locale ] : current.role[ locale ];
}
