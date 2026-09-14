// src/domains/projects/types/index.ts
import type { LocalizedText, Slug } from "@/domains/core/types";

export type ProjectStatus = "live" | "archived" | "wip";

export interface ProjectImage {

  /** Path under /public. */
  readonly src: string;

  /** Intrinsic pixel size. Required: it is what reserves the space and prevents layout shift. */
  readonly width: number;
  readonly height: number;

  /** Alt text describing the screenshot, not the project. */
  readonly alt: LocalizedText;
}

export interface ProjectLinks {
  readonly repo?: string;
  readonly live?: string;
  readonly caseStudy?: string;
}

export interface Project {

  /** Stable slug. React key and image basename. */
  readonly slug: Slug;

  /** Proper noun. Never translated. */
  readonly name: string;

  /** Year shipped. */
  readonly year: number;

  /** Lifecycle state. Metadata only: it is never rendered and never orders anything. */
  readonly status: ProjectStatus;

  /** One or two sentences: what it is and why it exists. */
  readonly summary: LocalizedText;

  /** What Matteo did, when the project was not solo work. */
  readonly role?: LocalizedText;

  /** Proper nouns. Six or fewer. */
  readonly tech: readonly string[];

  /** `null` renders the card without a media area. */
  readonly cover: ProjectImage | null;

  readonly links: ProjectLinks;

  /** Featured projects render first, in array order. */
  readonly featured: boolean;
}
