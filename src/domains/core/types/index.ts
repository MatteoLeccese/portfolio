// src/domains/core/types/index.ts
import type { LOCALES } from "@/domains/core/config/locales";

/** Supported locales. Derived from LOCALES so next-intl stays out of the content type chain. */
export type Locale = (typeof LOCALES)[ number ];

/** A string that must exist in every locale. A missing locale is a compile error. */
export type LocalizedText = Record<Locale, string>;

/** A list of strings that must exist in every locale. */
export type LocalizedList = Record<Locale, string[]>;

/** Zero-padded month, so "2026-2" fails to compile. */
export type Month =
  | "01" | "02" | "03" | "04" | "05" | "06"
  | "07" | "08" | "09" | "10" | "11" | "12";

/** `YYYY-MM`. Month precision is the precision the CV states. Never store a day we do not know. */
export type YearMonth = `${number}-${Month}`;

/** `YYYY-MM-DD`. Only for LegalDocument.updatedAt and CONTENT_LAST_MODIFIED, which do have a day. */
export type IsoDate = `${number}-${Month}-${string}`;

/** Human-readable kebab-case identifier. React key, URL anchor and logo file name at once. */
export type Slug = string;
