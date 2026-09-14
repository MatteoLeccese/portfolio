// src/app/[locale]/_components/LocaleSwitcher.tsx
"use client";

import { useLocale, useTranslations } from "next-intl";
import type { KeyboardEvent, PointerEvent } from "react";

import { getPathname, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type SupportedLocale = (typeof routing.locales)[ number ];

/** The visible label of each locale. The same two characters in both languages. */
export const SHORT_LABELS: Record<SupportedLocale, string> = { en: "EN", es: "ES" };

/** `base` followed by the query string and the hash of `location`. */
export function localeHref (base: string, location: { search: string; hash: string; }): string {
  return `${base}${location.search}${location.hash}`;
}

/**
 * Language switcher: one anchor per locale, pointing at the current path in that locale.
 *
 * The rendered href is the bare locale URL. Each anchor rewrites its own href with the
 * live query string and hash right before it navigates — on pointerdown, and on the Enter
 * key — so the visitor lands on the section they were reading. The anchor of the active
 * locale carries aria-current="page".
 */
export function LocaleSwitcher () {
  const activeLocale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("Locale");

  return (
    <nav
      aria-label={t("label")}
      data-testid="locale-switcher"
      className="inline-flex items-center rounded-lg border border-border p-0.5 text-meta"
    >
      {routing.locales.map((locale) => {
        const isActive = locale === activeLocale;
        const target = getPathname({ href: pathname, locale });

        function keepSection (
          event: PointerEvent<HTMLAnchorElement> | KeyboardEvent<HTMLAnchorElement>,
        ): void {
          event.currentTarget.href = localeHref(target, window.location);
        }

        return (
          <a
            key={locale}
            href={target}
            hrefLang={locale}
            lang={locale}
            aria-current={isActive ? "page" : undefined}
            aria-label={isActive ? t(locale) : t("switchTo", { language: t(locale) })}
            onPointerDown={keepSection}
            onKeyDown={(event) => {
              if (event.key === "Enter") keepSection(event);
            }}
            className={cn(
              "touch-target flex h-9 min-w-11 items-center justify-center rounded-md px-2.5 font-medium",
              "transition-colors duration-fast ease-standard",
              "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring focus-visible:outline-offset-2",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {SHORT_LABELS[ locale ]}
          </a>
        );
      })}
    </nav>
  );
}
