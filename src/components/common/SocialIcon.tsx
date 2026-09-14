// src/components/common/SocialIcon.tsx
import { Mail } from "lucide-react";
import type { CSSProperties } from "react";

import type { SocialIconName } from "@/domains/profile/types";
import { cn } from "@/lib/utils";

interface SocialIconProps {
  readonly icon: SocialIconName;
  readonly className?: string;
}

/** The mask that paints the generated SVG of one brand slug. */
function brandMask (slug: Exclude<SocialIconName, "mail">): CSSProperties {
  const source = `url(/icons/icon-${slug}.svg)`;

  return {
    maskImage: source,
    maskRepeat: "no-repeat",
    maskPosition: "center",
    maskSize: "contain",
  };
}

/**
 * The glyph of a social link, hidden from assistive technology: the link that wraps it
 * carries the accessible name.
 *
 * `mail` is a lucide icon. Every other name is a Simple Icons slug painted as a CSS mask
 * over `background-color: currentColor`, so the glyph follows the current text colour in
 * both themes.
 */
export function SocialIcon ({ icon, className }: SocialIconProps) {
  if (icon === "mail") {
    return <Mail aria-hidden="true" className={cn("size-5", className)} />;
  }

  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-5 shrink-0 bg-current", className)}
      style={brandMask(icon)}
    />
  );
}
