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
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { THEME_COLOR_SRGB } from "@/lib/palette-srgb";
import { MOTION_BOOT_SCRIPT } from "@/lib/motion/reveal-observer";
import { sans } from "@/lib/fonts";
import { ScrollSentinel } from "./_components/ScrollSentinel";

/**
 * The home route's URLs: absolute, with no trailing slash except on the root, prefixed
 * "as-needed", and an hreflang map holding every locale plus an x-default that points at
 * the default one.
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
 * The role string and the experience figure interpolated into the `Meta.title` and
 * `Meta.description` ICU messages. The years are whole years since SITE.careerStart,
 * measured in whole months, rounded, and floored at 1.
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/**
 * The home page's metadata, and the only place `metadataBase` and `title.template` are
 * declared. It emits a self-referential canonical, the bidirectional hreflang map with
 * its x-default, and robots directives that follow the site's indexability flag.
 *
 * The two legal routes override title, description and alternates with their own
 * generateMetadata; [locale]/page.tsx inherits this one.
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
          Order matters twice. The meta tag is emitted before the theme script, which
          rewrites its content when the stored theme is dark; the light value is the one
          baked into the static HTML. The motion boot script runs after the theme one, so
          the colour is resolved before the animation system is.

          Both scripts are inline and carry no nonce, and the motion one is what declares
          html[data-motion]. `suppressHydrationWarning` on <html> covers the class and
          style the theme script writes there before React hydrates.
        */}
        <meta name="theme-color" content={THEME_COLOR_SRGB.light} />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script id="motion-boot" dangerouslySetInnerHTML={{ __html: MOTION_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <NextIntlClientProvider
          messages={{
            ...clientMessages(messages),

            /*
              The segment error boundary, src/app/[locale]/error.tsx, is a client component
              and reads its three strings through this provider, so the Errors namespace
              ships alongside the three island namespaces clientMessages() returns.
            */
            Errors: messages.Errors,
          }}
        >
          {/*
            Renders null. It watches the 1 px div below and turns "the page has moved off
            the top" into html[data-scrolled], which is what the header reacts to. It emits
            no node, so it does not take the first-focusable-element slot.
          */}
          <ScrollSentinel />
          <main id="main" tabIndex={-1}>
            {/*
              1 px sentinel watched by ScrollSentinel. It lives in the layout and not in
              page.tsx so every route under [locale] gets the same header behaviour.
            */}
            <div id="scroll-sentinel" aria-hidden="true" className="h-px" />
            {children}
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
