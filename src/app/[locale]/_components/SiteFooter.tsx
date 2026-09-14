// src/app/[locale]/_components/SiteFooter.tsx
import { useTranslations } from "next-intl";

import { SITE } from "@/domains/core/config/site";
import { SocialLinks } from "@/domains/profile/components/SocialLinks";
import { Link } from "@/i18n/navigation";

const LEGAL_LINK_CLASS = [
  "touch-target text-meta text-muted-foreground underline-offset-4",
  "transition-colors duration-fast ease-standard hover:text-foreground hover:underline",
].join(" ");

/**
 * The end of every page under [locale]: social links, the two legal links, the cookie
 * notice and the copyright line, above a single hairline.
 *
 * The copyright year comes from the clock at render time, which on the prerendered routes
 * is build time. It reaches the ICU message as a string, which is substituted verbatim and
 * never passed through a locale number format.
 */
export function SiteFooter () {
  const t = useTranslations("Footer");
  const year = new Date().getFullYear().toString();

  return (
    <footer className="hairline-t">
      <div className="container-page flex flex-col gap-10 py-14 md:gap-12 md:py-16">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <SocialLinks />

          <nav aria-label={t("legalNavLabel")} className="flex flex-wrap items-center gap-6">
            <Link className={LEGAL_LINK_CLASS} href="/privacy">{t("privacy")}</Link>
            <Link className={LEGAL_LINK_CLASS} href="/cookies">{t("cookies")}</Link>
          </nav>
        </div>

        <div className="flex flex-col gap-4">
          <p className="max-w-readable text-meta text-muted-foreground">{t("cookieNotice")}</p>

          <div className="flex flex-col gap-2 text-meta text-muted-foreground md:flex-row md:items-center md:justify-between">
            <p>{t("rights", { year, name: SITE.name })}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
