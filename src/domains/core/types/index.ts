// src/domains/core/types/index.ts
import type { LOCALES } from "@/domains/core/config/locales";

/** Supported locales. */
export type Locale = (typeof LOCALES)[ number ];

/** A string that must exist in every locale. A missing locale is a compile error. */
export type LocalizedText = Record<Locale, string>;

/** A list of strings that must exist in every locale. */
export type LocalizedList = Record<Locale, string[]>;

/** Zero-padded month, "01" through "12". */
export type Month =
  | "01" | "02" | "03" | "04" | "05" | "06"
  | "07" | "08" | "09" | "10" | "11" | "12";

/** `YYYY-MM`. Month precision: there is no day component. */
export type YearMonth = `${number}-${Month}`;

/** `YYYY-MM-DD`. Used by LegalDocument.updatedAt and CONTENT_LAST_MODIFIED. */
export type IsoDate = `${number}-${Month}-${string}`;

/** Human-readable kebab-case identifier. React key, URL anchor and logo file name at once. */
export type Slug = string;
