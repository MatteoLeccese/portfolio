// src/domains/skills/content/icons.ts

/**
 * The brand glyphs the site renders, as Simple Icons slugs. `npm run icons:skills`
 * regenerates public/icons/icon-<slug>.svg from this list and MANUAL_ICON_SLUGS.
 */
export const SIMPLE_ICON_SLUGS = [
  // frontend
  "typescript", "javascript", "react", "nextdotjs", "angular",
  "reactivex", "redux", "reacthookform", "tailwindcss", "sass",
  // backend
  "nodedotjs", "nestjs", "express", "php", "laravel", "python",
  // data
  "postgresql", "mysql", "sqlite",
  // platform
  "digitalocean", "git", "github",
] as const;

/**
 * Slugs Simple Icons does not ship. Their SVG is committed by hand under public/icons/ and
 * the generator asserts the file exists instead of writing it.
 */
export const MANUAL_ICON_SLUGS = [ "linkedin" ] as const;

export type IconSlug =
  | (typeof SIMPLE_ICON_SLUGS)[ number ]
  | (typeof MANUAL_ICON_SLUGS)[ number ];
