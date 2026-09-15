// src/app/[locale]/cookies/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { isIndexable } from "@/domains/core/config/site";
import { buildLegalGraph } from "@/domains/core/seo/graphs";
import { JsonLd } from "@/domains/core/seo/JsonLd";
import { buildPageMetadata } from "@/domains/core/seo/metadata";
import type { LegalRoute } from "@/domains/core/seo/routes";
import type { Locale } from "@/domains/core/types";
import { LegalDocumentView } from "@/domains/legal/components/LegalDocumentView";
import { cookiePolicy } from "@/domains/legal/content/cookies";
import { routing } from "@/i18n/routing";

/** The path of this route, which is the same English word in every locale. */
const ROUTE: LegalRoute = "/cookies";

/** Prerenders /cookies and /es/cookies at build time. */
export function generateStaticParams () {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * This route's title, description, canonical, hreflang map, robots directives and social
 * card. It replaces the home metadata the layout declares; `metadataBase` and
 * `title.template` are inherited.
 */
export async function generateMetadata ({
  params,
}: {
  params: Promise<{ locale: string; }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "Meta" });

  return buildPageMetadata({
    locale,
    route: ROUTE,
    title: t("cookiesTitle"),
    description: t("cookiesDescription"),
    indexable: isIndexable(),
  });
}

export default async function CookiePolicyPage ({
  params,
}: {
  params: Promise<{ locale: Locale; }>;
}) {
  const { locale } = await params;

  setRequestLocale(locale);

  const meta = await getTranslations({ locale, namespace: "Meta" });
  const legal = await getTranslations({ locale, namespace: "Legal" });

  return (
    <>
      <LegalDocumentView legalDocument={cookiePolicy} locale={locale} />

      {/* The WebPage node of this route and the two-step BreadcrumbList above it. */}
      <JsonLd
        graph={buildLegalGraph(locale, ROUTE, {
          title: meta("cookiesTitle"),
          description: meta("cookiesDescription"),
          homeLabel: legal("home"),
        })}
      />
    </>
  );
}
