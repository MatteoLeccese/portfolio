// src/app/not-found.tsx
/* eslint-disable @next/next/no-html-link-for-pages --
   The two links at the bottom are real anchors on purpose, and the rule is a false positive
   here. This page renders its OWN document shell, outside [locale] and outside the localized
   layout, so leaving it has to be a full document load: a soft navigation would keep the shell
   this file emitted and hand the visitor a home page inside a 404's <body>. It is also the
   same call §8.7 makes for the language switcher — anchors, not router links — for the same
   reason: what has to change is the document, not a subtree. The directive is scoped to this
   file, and --report-unused-disable-directives removes it the day the anchors go. */
import type { Metadata } from "next";

import { THEME_COLOR_SRGB } from "@/lib/palette-srgb";
import { sans } from "@/lib/fonts";

/**
 * It sits outside [locale], so it inherits no canonical from the home and does not need
 * `alternates: { canonical: null }`. It only has to deny itself (see section 11.3.3).
 */
export const metadata: Metadata = {
  title: "Page not found · Página no encontrada",
  robots: { index: false, follow: false },
};

/**
 * Root 404 with its own document shell.
 *
 * Why here and not in [locale]/not-found.tsx: verified on Next 16.3.4 that notFound() from
 * a [locale]/[...rest] catch-all returns a real 404 status but serves the `__next_error__`
 * shell; the translated copy only arrives in the RSC payload and appears after hydration.
 * A crawler, or a visitor with JavaScript disabled, sees a blank page painted in the wrong
 * theme. And `redirect()` from inside this file is not the escape hatch it looks like: in
 * Next 16 it emits no HTTP redirect, it renders a 404 (§8.6).
 *
 * The copy is bilingual and hardcoded because the middleware rewrites the URL and this
 * segment never receives a `locale` param. It is the only user-facing text in the project
 * that lives outside messages/, and that is deliberate. Do not add a `NotFound` namespace.
 *
 * FONT: `sans.variable` on this element is load-bearing and this file is one of only two
 * that render a document shell. Drop it and next/font/local never runs for this route:
 * no @font-face, no .woff2, --font-montserrat declared nowhere, and the page paints in
 * the browser's default serif — with a green build. src/lib/fonts.test.ts guards it.
 *
 * PHASE 3 (§14.7) inserts the pre-paint theme script in the <head> below, immediately
 * after the meta tag and exactly as in src/app/[locale]/layout.tsx:
 *   <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
 * Without it this page ignores a stored dark preference, which is also why
 * `suppressHydrationWarning` is already here.
 */
export default function RootNotFound () {
  return (
    <html lang="en" className={sans.variable} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content={THEME_COLOR_SRGB.light} />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <main className="mx-auto flex min-h-dvh max-w-readable flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-eyebrow text-muted-foreground">404</p>
          <h1 className="text-h2 font-semibold text-balance">
            Page not found
            <span aria-hidden="true"> · </span>
            <span lang="es">Página no encontrada</span>
          </h1>
          <p className="text-body text-muted-foreground text-pretty">
            The page you are looking for does not exist or has been moved.
          </p>
          <p lang="es" className="text-body text-muted-foreground text-pretty">
            La página que buscas no existe o ha sido movida.
          </p>
          <p className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <a href="/" className="font-medium text-primary underline underline-offset-4">
              Back to home
            </a>
            <a href="/es" lang="es" className="font-medium text-primary underline underline-offset-4">
              Volver al inicio
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
