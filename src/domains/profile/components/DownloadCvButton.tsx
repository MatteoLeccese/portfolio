// src/domains/profile/components/DownloadCvButton.tsx
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { SITE } from "@/domains/core/config/site";
import type { Locale } from "@/domains/core/types";

interface DownloadCvButtonProps {

  /** Which of the two PDFs the link points at, and which language its name states. */
  readonly locale: Locale;
  readonly className?: string;
}

/**
 * The link that saves the CV PDF of one locale.
 *
 * It renders an `<a download hrefLang>`, so the browser writes the file under
 * SITE.cvFileName(locale) instead of navigating to it, and its accessible name names the
 * format and the language.
 */
export function DownloadCvButton ({ locale, className }: DownloadCvButtonProps) {
  const t = useTranslations("Common");
  const tLocale = useTranslations("Locale");

  return (
    <Button
      className={className}
      nativeButton={false}
      render={(
        <a
          aria-label={t("downloadCvAria", { language: tLocale(locale) })}
          download={SITE.cvFileName(locale)}
          href={SITE.cvPath(locale)}
          hrefLang={locale}
        />
      )}
      variant="ghost"
    >
      <Download aria-hidden="true" />
      {t("downloadCv")}
    </Button>
  );
}
