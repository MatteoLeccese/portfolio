// src/domains/experience/components/CompanyLogo.tsx
import Image from "next/image";

interface CompanyLogoProps {

  /** Proper noun. Names the tile when there is no logo file. */
  readonly company: string;

  /** Path under `public/`, or `null` to render the initials tile. */
  readonly logo: string | null;
}

/**
 * The plate both variants share: one square, one radius, one surface. It stays a light
 * surface in dark mode.
 *
 * The two variants append their own classes with a template literal and not with `cn()`:
 * `twMerge` files a custom type-scale utility such as `text-lead` in the same conflict
 * group as `text-foreground` and drops it.
 */
const PLATE = "flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted dark:bg-foreground";

/** The first character of each of the first two words of `company`, in upper case. */
export function monogram (company: string): string {
  return company
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .slice(0, 2)
    .map((word) => Array.from(word)[ 0 ] ?? "")
    .join("")
    .toUpperCase();
}

/**
 * The mark of one employer: the logo file when there is one, and the initials of the
 * company otherwise.
 *
 * Both variants are decorative and hidden from assistive technology: the company name is
 * written next to them as text. The logo file keeps its own colours and is never re-tinted,
 * and the plate under it is a light surface in both themes.
 */
export function CompanyLogo ({ company, logo }: CompanyLogoProps) {
  if (logo === null) {
    return (
      <span
        aria-hidden="true"
        className={`${PLATE} text-lead font-semibold text-foreground dark:text-background`}
      >
        {monogram(company)}
      </span>
    );
  }

  return (
    <span className={`${PLATE} relative overflow-hidden`}>
      {/* A filled image takes its inset from its own padding, not from the plate's. */}
      <Image alt="" className="object-contain p-1.5" fill sizes="48px" src={logo} />
    </span>
  );
}
