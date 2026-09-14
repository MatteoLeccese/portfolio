// src/app/[locale]/layout.tsx
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { clientMessages } from "@/i18n/client-messages";
import { DEFAULT_LOCALE, LOCALES } from "@/domains/core/config/locales";
import { SITE, isIndexable } from "@/domains/core/config/site";
import type { Locale } from "@/domains/core/types";
import { THEME_COLOR_SRGB } from "@/lib/palette-srgb";
import { sans } from "@/lib/fonts";

/**
 * PHASE 2 OF §14.6. This is the canonical file of §8.4 minus the pieces that phase 2 cannot
 * import, because the modules that export them are not written yet. Each one is marked
 * below, at its exact insertion point, with the phase that brings it:
 *
 *   phase 3 (§14.7)  THEME_INIT_SCRIPT from @/lib/theme        -> <head>, first
 *   phase 3 (§14.7)  MOTION_BOOT_SCRIPT from @/lib/motion/…    -> <head>, second
 *   phase 3 (§14.7)  <ScrollSentinel /> + <div id="scroll-sentinel">
 *   phase 5 (§14.9)  <SkipLink />, <SiteHeader />, <SiteFooter />
 *   phase 9 (§14.13) buildPageMetadata() from @/domains/core/seo/metadata
 *
 * Nothing else of §8.4 is missing, and the order of what is here is the order of the
 * canonical file, so every hook lands where the spec puts it.
 */

/**
 * PHASE 2 STAND-IN for src/domains/core/seo/routes.ts (§11.2), which phase 9 writes.
 *
 * The three functions below are the home's slice of that module, with its exact rules:
 * no trailing slash except on the root, "as-needed" prefixing, and an hreflang map that
 * includes the page itself plus an x-default pointing at the default locale (§8.5). They
 * are the home's alternates and nothing else — the two legal routes arrive with §8.13.
 *
 * Phase 9 deletes them: generateMetadata below becomes a call to buildPageMetadata(),
 * which reads localizedPath() and languageAlternates() from the real module. The values
 * are the same on both sides of that swap, by construction, so the emitted HTML does not
 * change when it happens.
 */
function absoluteUrl (path: string): string {
  return path === "/" ? `${SITE.url}/` : `${SITE.url}${path}`;
}

function localizedHome (locale: Locale): string {
  return locale === DEFAULT_LOCALE ? "/" : `/${locale}`;
}

function homeLanguageAlternates (): Record<string, string> {
  const languages: Record<string, string> = {};

  for (const locale of LOCALES) languages[ locale ] = absoluteUrl(localizedHome(locale));
  languages[ "x-default" ] = absoluteUrl(localizedHome(DEFAULT_LOCALE));

  return languages;
}

/**
 * PHASE 2 STAND-IN for the derived facts of §9.3. Phase 4 (§14.8) deletes both.
 *
 * Meta.title is "{name} — {role}" and Meta.description is "{role} with {years} years…":
 * three ICU arguments. {name} is SITE.name and exists today. {role} and {years} are
 * DERIVED data — getJobTitle() over domains/experience and yearsOfExperienceAt() over
 * SITE.careerStart — and neither the model nor core/utils/period.ts is written yet.
 * Left unresolved, next-intl reports a formatting error and both home pages ship the
 * literal string "Meta.title" as their <title>, so the two values are stated here, in one
 * place, with one job: to be deleted in phase 4 and replaced by the two calls.
 *
 * The number is computed and not typed out. Law 15 of §3 — no fact is written twice —
 * applies to a stand-in exactly as it applies to final code: a literal would be right for
 * a year and then silently wrong. The rounding is the one §9.2 fixes for
 * yearsOfExperienceAt(): Math.round over whole months, floored at 1.
 */
const HOME_ROLE = "Full Stack Developer";

function yearsOfExperience (): number {
  const start = new Date(`${SITE.careerStart}-01T00:00:00Z`);
  const now = new Date();
  const months = (now.getUTCFullYear() - start.getUTCFullYear()) * 12 + (now.getUTCMonth() - start.getUTCMonth());

  return Math.max(1, Math.round(months / 12));
}

/** Prerenders / and /es at build time. */
export function generateStaticParams () {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * No themeColor and no colorScheme here: both follow the theme class, not the OS
 * preference. The <meta name="theme-color"> below is rewritten by the pre-paint script,
 * and globals.css owns color-scheme (section 6).
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/**
 * The home page's metadata, and the only place metadataBase and title.template are
 * declared. The two legal routes override title, description and alternates with their
 * own generateMetadata (section 11.3.3); [locale]/page.tsx inherits this one.
 *
 * It is generateMetadata and NOT `export const metadata`, because the title and the
 * description are translated and a static object cannot call getTranslations. Exporting
 * both from one file fails the build.
 *
 * PHASE 2 SUBSET of §11.3.2. What is here is what §8.5 and §11.3.1 make load-bearing for
 * this phase: the self-referential canonical, the bidirectional hreflang map with its
 * x-default, the title template and the indexability gate. What phase 9 adds when this
 * body becomes `...buildPageMetadata({ locale, route: "/", title, description, indexable,
 * titleTemplate, ogType: "profile" })`: openGraph, twitter, authors, applicationName,
 * generator: null, formatDetection and the googleBot directives. metadataBase stays here
 * either way — §8.4 declares it in this file and nowhere else.
 */
export async function generateMetadata ({
  params,
}: {
  params: Promise<{ locale: string; }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Meta" });

  return {
    metadataBase: new URL(SITE.url),
    title: {
      default: t("title", { name: SITE.name, role: HOME_ROLE }),
      template: `%s · ${SITE.name}`,
    },
    description: t("description", { role: HOME_ROLE, years: yearsOfExperience() }),
    alternates: {
      canonical: absoluteUrl(localizedHome(locale)),
      languages: homeLanguageAlternates(),
    },
    robots: isIndexable()
      ? { index: true, follow: true }
      : { index: false, follow: false, nocache: true },
  };
}

export default async function LocaleLayout ({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string; }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} className={sans.variable} suppressHydrationWarning>
      <head>
        {/*
          Order matters twice. The meta tag must exist before the theme script runs,
          because the script rewrites its content when the stored theme is dark; the light
          value is the one baked into the static HTML, which is correct for every visitor
          who never touched the switch. And the motion boot script runs AFTER the theme
          one: what the visitor sees first is the colour, not the animation.

          PHASE 3 (§14.7) inserts the two scripts HERE, in this order, right below this
          meta tag and nowhere else:
            <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
            <script id="motion-boot" dangerouslySetInnerHTML={{ __html: MOTION_BOOT_SCRIPT }} />
          Both inline and without a nonce: the CSP is script-src 'self' 'unsafe-inline'
          (§13.2), and a hash or a nonce would make the browser ignore 'unsafe-inline' and
          break Next's own bootstrap scripts. Until then `suppressHydrationWarning` below
          has nothing to suppress; it stays because phase 3 needs it the moment the first
          script mutates class and style on this element before React hydrates.
        */}
        <meta name="theme-color" content={THEME_COLOR_SRGB.light} />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <NextIntlClientProvider
          messages={{
            ...clientMessages(messages),

            /*
              SPEC CORRECTION, and the only divergence of this file from §8.4 that is not a
              phase gate. clientMessages() ships the three ISLAND namespaces (§8.4). The
              segment error boundary, src/app/[locale]/error.tsx, is a fourth consumer of
              `t` in the browser: Next requires error.tsx to be a client component (§5.9,
              row 13) and §5.7 puts its three strings in messages/ (Errors.boundary*), so
              it can reach them only through this provider. With the three island
              namespaces alone it renders the literal key path "Errors.boundaryTitle" and
              logs a MISSING_MESSAGE — a failure that shows up only when something else has
              already gone wrong, which is the worst moment to discover it.

              It is added here, at the single call site, and not by editing
              src/i18n/client-messages.ts, whose body and signature §8.4 writes out
              verbatim. Moving it inside that function is the tidier home for it and needs
              no change on this side. Three short keys, so the RSC payload assertion of
              §11.8.4 is unaffected — and the catalogue still never crosses whole.
            */
            Errors: messages.Errors,
          }}
        >
          {/*
            PHASE 3 (§14.7) inserts <ScrollSentinel /> HERE, as the first child of the
            provider and before the skip link (§7.5.5).
            PHASE 5 (§14.9) inserts <SkipLink /> and then <SiteHeader /> HERE, in that
            order: the skip link is the first focusable element of the document (§11.9.2).
          */}
          <main id="main" tabIndex={-1}>
            {/*
              PHASE 3 (§14.7) inserts the 1 px sentinel HERE, before {children}:
                <div id="scroll-sentinel" aria-hidden="true" className="h-px" />
              usePassed() watches it and ScrollSentinel turns that into
              html[data-scrolled], which is what the header reacts to. It lives here and
              not in page.tsx so the legal routes get the same header behaviour.
            */}
            {children}
          </main>
          {/* PHASE 5 (§14.9) inserts <SiteFooter /> HERE, after </main>. */}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
