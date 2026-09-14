// src/domains/profile/components/SocialLinks.tsx
import { ExternalLink } from "@/components/common/ExternalLink";
import { SocialIcon } from "@/components/common/SocialIcon";
import { socials } from "@/domains/profile/content/socials";
import { cn } from "@/lib/utils";

interface SocialLinksProps {
  readonly className?: string;
}

/**
 * The social links of socials.ts, as icon-only anchors.
 *
 * Each anchor is named by ExternalLink from the proper noun in the content file plus the
 * translated "opens in a new tab" suffix, and the glyph inside it is aria-hidden. The
 * 24 px gap holds the 44 px touch areas of two neighbours apart.
 */
export function SocialLinks ({ className }: SocialLinksProps) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-6", className)}>
      {socials.map((social) => (
        <li key={social.id}>
          <ExternalLink
            className="touch-target text-muted-foreground hover:text-primary hover:no-underline"
            href={social.href}
            label={social.label}
            showIcon={false}
          >
            <SocialIcon icon={social.icon} />
          </ExternalLink>
        </li>
      ))}
    </ul>
  );
}
