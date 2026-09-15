// src/app/[locale]/layout.tsx
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { clientMessages } from "@/i18n/client-messages";
import { SITE, isIndexable } from "@/domains/core/config/site";
import { buildPageMetadata } from "@/domains/core/seo/metadata";
import { yearsOfExperienceAt } from "@/domains/core/utils/period";
import { experience } from "@/domains/experience/content/experience";
import { getCurrentPosition } from "@/domains/profile/queries/getCurrentPosition";
import { getJobTitle } from "@/domains/profile/queries/getJobTitle";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { THEME_COLOR_SRGB } from "@/lib/palette-srgb";
import { MOTION_BOOT_SCRIPT } from "@/lib/motion/reveal-observer";
import { sans } from "@/lib/fonts";
import { ScrollSentinel } from "./_components/ScrollSentinel";
import { SkipLink } from "./_components/SkipLink";
import { SiteHeader } from "./_components/SiteHeader";
import { SiteFooter } from "./_components/SiteFooter";

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
 * declared. buildPageMetadata produces the rest: canonical, the hreflang map with its
 * x-default, robots directives, Open Graph and the Twitter card.
 *
 * The two legal routes replace it with their own generateMetadata; [locale]/page.tsx
 * inherits this one.
 */
export async function generateMetadata ({
  params,
}: {
  params: Promise<{ locale: string; }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "Meta" });

  // The role the title and the description interpolate, in the locale they are written in.
  const role = getJobTitle(getCurrentPosition(experience), locale);
  const years = yearsOfExperienceAt(SITE.careerStart, new Date());

  return {
    metadataBase: new URL(SITE.url),
    ...buildPageMetadata({
      locale,
      route: "/",
      title: t("title", { name: SITE.name, role }),
      description: t("description", { role, years }),
      indexable: isIndexable(),
      titleTemplate: `%s · ${SITE.name}`,
      ogType: "profile",
    }),
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

          {/* The first focusable element of the document, before the header. */}
          <SkipLink />
          <SiteHeader />

          <main id="main" tabIndex={-1}>
            {/*
              1 px sentinel watched by ScrollSentinel. It lives in the layout and not in
              page.tsx so every route under [locale] gets the same header behaviour.
            */}
            <div id="scroll-sentinel" aria-hidden="true" className="h-px" />
            {children}
          </main>

          {/* A sibling of <main>, so it is the document's contentinfo landmark. */}
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
