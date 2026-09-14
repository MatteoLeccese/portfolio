"use client";

// src/app/[locale]/error.tsx
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

/**
 * Segment error boundary. It replaces {children} inside the localized layout, so the
 * header, the footer and the document's `lang` survive whatever failed: the visitor keeps
 * the chrome, the theme and the language.
 *
 * It is one of the thirteen files allowed to carry "use client" (§5.9, row 13), and the
 * reason is Next's, not ours: an error boundary is a React class boundary and cannot be a
 * Server Component. Being a client component is also why its three strings have to reach
 * the browser through the provider — see the note next to `Errors` in
 * src/app/[locale]/layout.tsx, which is what puts that namespace there.
 *
 * <h1> and not <h2>: when this renders, the page that owned the document's only <h1> is
 * gone, and a document with no <h1> fails the outline rules of §11.9.1 just as surely as
 * one with two.
 *
 * The `error` object is never rendered as prose: a stack trace or a framework message on
 * screen is noise for the visitor and detail for nobody else. Its `digest` is, because it
 * is the one token that ties what the visitor saw to the line in the server log — which
 * is exactly what Next mints it for. It is opaque by construction and carries nothing
 * about the request, so it needs no translation and adds no copy.
 */
export default function LocaleError ({
  error,
  reset,
}: {
  error: Error & { digest?: string; };
  // `VoidFunction` and not `() => void`: @stylistic/type-annotation-spacing is configured with
  // `before: false` (§5.11), which applies to the `=>` of a function TYPE too and would demand
  // `()=> void`. The alias is the same type, written the way this repo can lint.
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
