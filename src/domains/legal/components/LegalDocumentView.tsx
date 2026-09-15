// src/domains/legal/components/LegalDocumentView.tsx
import { useFormatter, useTranslations } from "next-intl";

import { Prose } from "@/components/common/Prose";
import { resolveSitePlaceholders } from "@/domains/core/config/site";
import type { Locale } from "@/domains/core/types";
import { CookieTable } from "@/domains/legal/components/CookieTable";
import type { LegalDocument } from "@/domains/legal/types";
import { Link } from "@/i18n/navigation";

interface LegalDocumentViewProps {

  /** The document to render, with both languages inside. */
  readonly legalDocument: LegalDocument;

  /** The locale every localized field is read in. */
  readonly locale: Locale;
}

/**
 * How the last-updated date is printed: the long form of its calendar day, in UTC, which
 * is the zone a bare `YYYY-MM-DD` parses in.
 */
const UPDATED_AT_FORMAT = { dateStyle: "long", timeZone: "UTC" } as const;

/**
 * A legal document as a page: its title, the date it was last updated, the opening
 * paragraphs, one clause per section and a link back to the home page.
 *
 * The title block sits outside Prose and the running text inside it, which gives the copy
 * the reading measure and the vertical rhythm of that wrapper. Each clause carries its
 * section id and `scroll-mt-header`, so a link to a single clause lands clear of the fixed
 * header. A section whose `block` is "cookie-table" renders CookieTable after its prose.
 *
 * `updatedAt` reaches this component as an ISO string and is formatted here with
 * UPDATED_AT_FORMAT; the raw value is never printed. `{domain}` and `{ownerEmail}` are
 * resolved out of every paragraph and bullet before they are rendered.
 */
export function LegalDocumentView ({ legalDocument, locale }: LegalDocumentViewProps) {
  const t = useTranslations("Legal");
  const format = useFormatter();

  const updatedAt = format.dateTime(new Date(legalDocument.updatedAt), UPDATED_AT_FORMAT);

  return (
    <article className="container-page section-y">
      <header className="max-w-readable">
        <h1 className="text-h2 text-foreground text-balance">{legalDocument.title[ locale ]}</h1>
        <p className="mt-4 text-meta text-muted-foreground">
          {t("lastUpdated", { date: updatedAt })}
        </p>
      </header>

      <Prose className="mt-10">
        {legalDocument.intro[ locale ].map((paragraph) => (
          <p key={paragraph}>{resolveSitePlaceholders(paragraph)}</p>
        ))}

        {legalDocument.sections.map((section) => (
          <section key={section.id} className="scroll-mt-header" id={section.id}>
            <h2 className="text-h3 text-foreground text-pretty">{section.heading[ locale ]}</h2>

            {section.body[ locale ].map((paragraph) => (
              <p key={paragraph}>{resolveSitePlaceholders(paragraph)}</p>
            ))}

            {section.bullets === undefined
              ? null
              : (
                <ul>
                  {section.bullets[ locale ].map((bullet) => (
                    <li key={bullet}>{resolveSitePlaceholders(bullet)}</li>
                  ))}
                </ul>
              )}

            {section.block === "cookie-table" ? <CookieTable locale={locale} /> : null}
          </section>
        ))}

        <div className="mt-12">
          <Link className="font-medium" href="/">{t("backToHome")}</Link>
        </div>
      </Prose>
    </article>
  );
}
