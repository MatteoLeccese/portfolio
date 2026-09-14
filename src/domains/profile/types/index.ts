// src/domains/profile/types/index.ts
import type { IconSlug } from "@/domains/skills/content/icons";

export type SocialPlatform = "github" | "linkedin" | "email";

/** A brand glyph slug, or the name of a lucide glyph. */
export type SocialIconName = IconSlug | "mail";

export interface SocialLink {
  readonly id: SocialPlatform;

  /** Proper noun. Never translated. */
  readonly label: string;
  readonly href: string;

  /** The glyph name, not a component, so the object stays serialisable across the RSC boundary. */
  readonly icon: SocialIconName;
}
