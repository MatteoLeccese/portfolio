// src/app/[locale]/_components/SiteHeader.tsx
import { useLocale, useTranslations } from "next-intl";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NAV_SECTION_IDS } from "@/domains/core/config/navigation";
import type { Locale } from "@/domains/core/types";
import { SITE } from "@/domains/core/config/site";
import { localizedPath } from "@/domains/core/seo/routes";
import { projects } from "@/domains/projects/content/projects";

import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileNav } from "./MobileNav";
import { SectionNav, type NavItem } from "./SectionNav";

/**
 * The site header: wordmark, section navigation, language switcher, theme switch and,
 * below the `md` breakpoint, the button that opens the mobile menu.
 *
 * A Server Component. SectionNav and MobileNav receive resolved strings, never the `t`
 * function; the header's own scroll state comes from html[data-scrolled] through the
 * `.site-header` rules of globals.css.
 */
export function SiteHeader () {
  const t = useTranslations("Nav");
  const locale = useLocale() as Locale;

  /*
   * Anchors are absolute to the locale home, so they reach their section from the legal
   * pages too. On the home page the browser resolves them as a same-document fragment.
   */
  const home = localizedPath("/", locale);

  /* The projects entry is present only while there is a project. Both menus render this array. */
  const items: NavItem[] = NAV_SECTION_IDS
    .filter((id) => id !== "projects" || projects.length > 0)
    .map((id) => ({ id, label: t(id), href: `${home}#${id}` }));

  return (
    <header className="site-header sticky top-0 z-40 border-b">
      <div className="container-page flex h-[var(--header-height)] items-center justify-between gap-2">
        <a
          href={`${home}#hero`}
          aria-label={t("homeLabel", { name: SITE.name })}
          className="rounded-md text-meta font-semibold whitespace-nowrap text-foreground transition-colors duration-fast ease-standard hover:text-primary focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring focus-visible:outline-offset-2 md:text-body"
        >
          {SITE.name}
        </a>

        <div className="flex items-center gap-1 md:gap-2">
          <SectionNav items={items} label={t("primaryLabel")} />

          {/* Hairline between the sections and the controls. Decorative. */}
          <span aria-hidden="true" className="hidden h-5 w-px bg-hairline md:block" />

          <LocaleSwitcher />
          <ThemeToggle />
          <MobileNav
            items={items}
            menuLabel={t("mobileLabel")}
            openLabel={t("openMenu")}
            closeLabel={t("closeMenu")}
          />
        </div>
      </div>
    </header>
  );
}
