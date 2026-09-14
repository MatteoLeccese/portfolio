"use client";

// src/app/[locale]/error.tsx
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

/**
 * Segment error boundary. It replaces {children} inside the localized layout, so the
 * header, the footer and the document's `lang` survive whatever failed: the visitor keeps
 * the chrome, the theme and the language.
 *
 * It is a client component, and reads its three strings from the `Errors` namespace the
 * localized layout puts on the provider.
 *
 * It renders an <h1> and not an <h2>: the page that owned the document's only <h1> is
 * gone by the time this renders. The `error` object is never shown as prose; only its
 * `digest`, the token that ties what the visitor saw to the line in the server log.
 */
export default function LocaleError ({
  error,
  reset,
}: {
  error: Error & { digest?: string; };
  // `VoidFunction` and not `() => void`: @stylistic/type-annotation-spacing is configured
  // with `before: false`, which applies to the `=>` of a function type too and would
  // demand `()=> void`. The alias is the same type, written the way this repo can lint.
  reset: VoidFunction;
}) {
  const t = useTranslations("Errors");

  return (
    <div className="container-page section-y flex flex-col items-start gap-4">
      <h1 className="text-h2 text-foreground">{t("boundaryTitle")}</h1>
      <p className="text-body text-muted-foreground">{t("boundaryBody")}</p>
      <Button type="button" onClick={reset}>{t("boundaryRetry")}</Button>
      {error.digest === undefined
        ? null
        : <p className="text-meta text-muted-foreground"><code>{error.digest}</code></p>}
    </div>
  );
}
