// src/domains/profile/components/BrandGlyph.tsx
import type { CSSProperties } from "react";

import type { SocialIconName } from "@/domains/profile/types";
import { cn } from "@/lib/utils";

/** A glyph name with a committed SVG under public/icons/: SocialIconName without `mail`. */
export type BrandGlyphName = Exclude<SocialIconName, "mail">;

interface BrandGlyphProps {

  /** Slug of the file to paint, as public/icons/icon-<slug>.svg. */
  readonly icon: BrandGlyphName;

  /** Size and colour. Both reach the glyph: the mask paints in the current text colour. */
  readonly className?: string;
}

/** The mask declarations that paint one generated SVG. */
function glyphMask (slug: BrandGlyphName): CSSProperties {
  return {
    maskImage: `url(/icons/icon-${slug}.svg)`,
    maskRepeat: "no-repeat",
    maskPosition: "center",
    maskSize: "contain",
  };
}

/**
 * A brand mark painted as a CSS mask over `background-color: currentColor`, so one file
 * serves both themes.
 *
 * Hidden from assistive technology: the badge or link around it carries the name.
 */
export function BrandGlyph ({ icon, className }: BrandGlyphProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-5 shrink-0 bg-current", className)}
      style={glyphMask(icon)}
    />
  );
}
