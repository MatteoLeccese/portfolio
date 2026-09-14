// src/components/common/ExternalLink.tsx
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Schemes that hand the URL to another application instead of opening a tab. */
const IN_PLACE_SCHEMES = [ "mailto:", "tel:" ] as const;

/** Whether `href` is followed in a new browsing context. */
export function opensInNewTab (href: string): boolean {
  return !IN_PLACE_SCHEMES.some((scheme) => href.toLowerCase().startsWith(scheme));
}

interface ExternalLinkProps {
  readonly href: string;

  /** Visible text. Icon-only links leave it out and name themselves with `label`. */
  readonly children?: ReactNode;
  readonly className?: string;

  /** Accessible name for a link with no visible text. */
  readonly label?: string;

  /** Renders the trailing arrow glyph. Ignored by links that open no tab. */
  readonly showIcon?: boolean;
}

/**
 * A link that leaves the site.
 *
 * It opens a new tab, sets `rel` accordingly and adds the translated "opens in a new tab"
 * suffix to its accessible name: as a visually hidden span when the link has visible text,
 * and inside the aria-label when it does not. A mailto: or tel: href gets none of the
 * three, and no arrow.
 */
export function ExternalLink ({
  href,
  children,
  className,
  label,
  showIcon = true,
}: ExternalLinkProps) {
  const t = useTranslations("Common");
  const newTab = opensInNewTab(href);
  const suffix = t("externalLink");

  function accessibleName (): string | undefined {
    if (label === undefined) return undefined;

    return newTab ? `${label} (${suffix})` : label;
  }

  return (
    <a
      aria-label={accessibleName()}
      className={cn(
        "external-link inline-flex items-center gap-1 underline-offset-4",
        "transition-colors duration-fast ease-standard hover:underline",
        className,
      )}
      href={href}
      rel={newTab ? "noopener noreferrer" : undefined}
      target={newTab ? "_blank" : undefined}
    >
      {children}
      {newTab && label === undefined
        ? <span className="sr-only"> ({suffix})</span>
        : null}
      {newTab && showIcon
        ? <ArrowUpRight aria-hidden="true" className="external-link-icon size-4" />
        : null}
    </a>
  );
}
