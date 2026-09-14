// src/app/[locale]/_components/SectionNav.tsx
"use client";

import type { SectionId } from "@/domains/core/config/navigation";
import { useScrollSpy } from "@/hooks/useScrollSpy";

/**
 * One navigation entry: a section id, its translated label and the anchor that reaches it.
 * The shape MobileNav receives too, so both menus render the same list.
 */
export interface NavItem {
  id: SectionId;

  /** Already translated. This component never calls useTranslations. */
  label: string;

  /** In-page anchor, "#" plus the section id. */
  href: string;
}

interface SectionNavProps {
  items: readonly NavItem[];

  /** Accessible name of the <nav>, already translated. */
  label: string;
}

/**
 * The section navigation of the header, from the `md` breakpoint up.
 *
 * Every entry is a real anchor and works with JavaScript disabled. The scroll spy adds
 * nothing but `aria-current="location"` on the entry whose section sits under the header,
 * and globals.css draws the `.nav-link` underline from that attribute.
 */
export function SectionNav ({ items, label }: SectionNavProps) {
  const activeId = useScrollSpy();

  return (
    <nav aria-label={label} className="hidden md:block">
      <ul className="flex items-center gap-0.5">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={item.href}
              aria-current={item.id === activeId ? "location" : undefined}
              className="nav-link inline-flex h-10 items-center rounded-md px-3 text-meta font-medium whitespace-nowrap text-muted-foreground hover:text-foreground aria-[current=location]:text-foreground"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
