// src/domains/core/utils/localize.ts
import type { Locale, LocalizedList, LocalizedText } from "@/domains/core/types";

/**
 * Picks one locale out of a localized string.
 *
 * @param text The string in every locale.
 * @param locale The locale to read.
 */
export function localize (text: LocalizedText, locale: Locale): string {
  return text[ locale ];
}

/** Picks one locale out of a localized list. Same contract as `localize`. */
export function localizeList (list: LocalizedList, locale: Locale): string[] {
  return list[ locale ];
}
