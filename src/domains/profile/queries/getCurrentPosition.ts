// src/domains/profile/queries/getCurrentPosition.ts
import type { LocalizedText } from "@/domains/core/types";

/**
 * The minimum shape this domain reads from a position. Declared structurally so `profile`
 * never imports `experience`: an ExperienceEntry satisfies it without an import.
 */
export interface PositionLike {
  readonly role: LocalizedText;
  readonly company: string;
  readonly endDate: string | null;
}

/** The position with no end date, or `null` when every position has ended. */
export function getCurrentPosition<T extends PositionLike> (positions: readonly T[]): T | null {
  return positions.find((position) => position.endDate === null) ?? null;
}
