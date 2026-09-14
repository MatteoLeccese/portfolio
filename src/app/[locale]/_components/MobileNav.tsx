// src/app/[locale]/_components/MobileNav.tsx
"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import type { NavItem } from "./SectionNav";

interface MobileNavProps {
  items: readonly NavItem[];

  /** Accessible name of the panel and of the <nav> inside it, already translated. */
  menuLabel: string;

  /** Accessible name of the trigger, already translated. */
  openLabel: string;

  /** Accessible name of the close button, already translated. */
  closeLabel: string;
}

/** Id of the panel, referenced by the trigger's aria-controls. */
const PANEL_ID = "mobile-nav-panel";

/**
 * The menu behind the hamburger button, below the `md` breakpoint.
 *
 * A Base UI dialog rendered through the patched Sheet: it traps focus, closes on Escape
 * and on an outside press, returns focus to the trigger and locks the page scroll while
 * it is open. Every entry is a real anchor that closes the panel on click; a middle click
 * leaves it open.
 */
export function MobileNav ({ items, menuLabel, openLabel, closeLabel }: MobileNavProps) {
  const [ open, setOpen ] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={(
          <Button
            variant="ghost"
            size="icon"
            data-testid="mobile-nav-trigger"
            aria-controls={PANEL_ID}
            className="md:hidden"
          />
        )}
      >
        <Menu aria-hidden="true" className="size-5" />
        <span className="sr-only">{openLabel}</span>
      </SheetTrigger>

      <SheetContent
        id={PANEL_ID}
        side="right"
        showCloseButton={false}
        className="gap-6 data-[side=right]:w-[min(20rem,85vw)]"
      >
        <SheetHeader className="flex-row items-center justify-end">
          <SheetTitle className="sr-only">{menuLabel}</SheetTitle>
          <SheetClose render={(<Button variant="ghost" size="icon" className="-mt-1 -mr-1" />)}>
            <X aria-hidden="true" className="size-5" />
            <span className="sr-only">{closeLabel}</span>
          </SheetClose>
        </SheetHeader>

        <nav aria-label={menuLabel}>
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={item.href}
                  onClick={() => {
                    setOpen(false);
                  }}
                  className={cn(
                    "flex min-h-11 items-center rounded-lg px-3 text-base font-medium text-foreground",
                    "transition-colors duration-fast ease-standard hover:bg-muted active:bg-secondary",
                    "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring focus-visible:outline-offset-2",
                  )}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
