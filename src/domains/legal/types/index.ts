// src/domains/legal/types/index.ts
import type { IsoDate, LocalizedList, LocalizedText, Slug } from "@/domains/core/types";

/**
 * The legal documents the site publishes. Each one lives in its own content file with
 * both languages inside, and each route imports its document directly.
 */
export type LegalSlug = "privacy" | "cookies";

export interface LegalSection {
  id: Slug;
  heading: LocalizedText;
  body: LocalizedList;
  bullets?: LocalizedList;

  /** Inserts a structured block at this exact point of the document. */
  block?: "cookie-table";
}

export interface LegalDocument {
  slug: LegalSlug;
  title: LocalizedText;

  /** ISO-8601. Formatted with useFormatter(), never printed raw. */
  updatedAt: IsoDate;
  intro: LocalizedList;
  sections: LegalSection[];
}
