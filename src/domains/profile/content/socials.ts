// src/domains/profile/content/socials.ts
import { SITE } from "@/domains/core/config/site";
import type { SocialLink } from "@/domains/profile/types";

/**
 * The social links the site renders. Every label is a proper noun, so nothing here is
 * localized, and every href is read from SITE. The phone number is never listed: it
 * belongs to the CV PDF only.
 */
export const socials: readonly SocialLink[] = [
  { id: "github", label: "GitHub", href: SITE.github, icon: "github" },
  { id: "linkedin", label: "LinkedIn", href: SITE.linkedin, icon: "linkedin" },
  { id: "email", label: "Email", href: `mailto:${SITE.email}`, icon: "mail" },
];
