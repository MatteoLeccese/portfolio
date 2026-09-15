// src/app/[locale]/privacy/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { DEFAULT_LOCALE, LOCALES } from "@/domains/core/config/locales";
import { isIndexable, SITE } from "@/domains/core/config/site";
import type { Locale } from "@/domains/core/types";
import { LegalDocumentView } from "@/domains/legal/components/LegalDocumentView";
import { privacyPolicy } from "@/domains/legal/content/privacy";
import { routing } from "@/i18n/routing";

/** The path of this route, which is the same English word in every locale. */
const ROUTE = "/privacy";

/** This route's absolute URL in one locale, prefixed "as-needed" like the router does. */
function absoluteUrl (locale: Locale): string {
  return locale === DEFAULT_LOCALE ? `${SITE.url}${ROUTE}` : `${SITE.url}/${locale}${ROUTE}`;
}

/** Every locale of this route plus an x-default pointing at the default one. */
function languageAlternates (): Record<string, string> {
  const languages: Record<string, string> = {};

  for (const locale of LOCALES) languages[ locale ] = absoluteUrl(locale);
  languages[ "x-default" ] = absoluteUrl(DEFAULT_LOCALE);

  return languages;
}

/** Prerenders /privacy and /es/privacy at build time. */
export function generateStaticParams () {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Title, description and alternates for this route. It overrides the three the layout
 * declares for the home page; `metadataBase` and `title.template` are inherited.
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
    title: t("privacyTitle"),
    description: t("privacyDescription"),
    alternates: {
      canonical: absoluteUrl(locale),
      languages: languageAlternates(),
    },
    robots: isIndexable()
      ? { index: true, follow: true }
      : { index: false, follow: false, nocache: true },
  };
}

export default async function PrivacyPolicyPage ({
  params,
}: {
  params: Promise<{ locale: Locale; }>;
}) {
  const { locale } = await params;

  setRequestLocale(locale);

  return <LegalDocumentView legalDocument={privacyPolicy} locale={locale} />;
}
