// src/app/[locale]/_components/SkipLink.tsx
import { useTranslations } from "next-intl";

/**
 * The first focusable element of the document: out of sight until it takes focus, fully
 * visible over the header once it has it. It moves focus to <main id="main" tabIndex={-1}>.
 */
export function SkipLink () {
  const t = useTranslations("Nav");

  return (
    <a
      href="#main"
      data-testid="skip-link"
      className="sr-only rounded-md border border-hairline bg-card px-4 py-2 text-meta font-medium text-foreground shadow-elevation-2 focus-visible:not-sr-only focus-visible:absolute focus-visible:top-4 focus-visible:left-4 focus-visible:z-50 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring focus-visible:outline-offset-2"
    >
      {t("skipToContent")}
    </a>
  );
}
