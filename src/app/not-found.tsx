// src/app/not-found.tsx
/* eslint-disable @next/next/no-html-link-for-pages --
   The two links at the bottom are plain anchors. This page renders its own document
   shell, outside [locale] and outside the localized layout, so leaving it is a full
   document load and not a soft navigation. */
import type { Metadata } from "next";

import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { THEME_COLOR_SRGB } from "@/lib/palette-srgb";
import { sans } from "@/lib/fonts";

/** Bilingual title, and robots directives that keep the page out of the index. */
export const metadata: Metadata = {
  title: "Page not found · Página no encontrada",
  robots: { index: false, follow: false },
};

/**
 * Root 404, rendered outside [locale] with its own document shell.
 *
 * The copy is bilingual and hardcoded: the proxy rewrites the URL and this segment never
 * receives a `locale` param, so it is the only user-facing text in the project that lives
 * outside messages/.
 *
 * `sans.variable` on <html> is what makes next/font/local emit the @font-face for this
 * route; src/lib/fonts.test.ts guards it. The inline script applies the stored theme
 * before the first paint, and is what `suppressHydrationWarning` accounts for.
 *
 * It boots no motion and renders no scroll sentinel: this page has no reveals and no
 * header.
 */
export default function RootNotFound () {
  return (
    <html lang="en" className={sans.variable} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content={THEME_COLOR_SRGB.light} />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
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
