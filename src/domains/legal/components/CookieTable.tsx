// src/domains/legal/components/CookieTable.tsx
import { useTranslations } from "next-intl";

import { COOKIE_REGISTRY } from "@/domains/core/config/cookies";
import { resolveSitePlaceholders } from "@/domains/core/config/site";
import type { Locale } from "@/domains/core/types";

interface CookieTableProps {

  /** The locale each localized cell of the registry is read in. */
  readonly locale: Locale;
}

/** Names the scrollable region and the table at once. */
const CAPTION_ID = "cookie-table-caption";

/**
 * The inventory of cookies as a table: one row per entry of COOKIE_REGISTRY, with the
 * name, the provider, the purpose, the duration and the type of each one.
 *
 * The table holds the reading measure as its minimum width and scrolls inside its own
 * container, which is focusable and named by the caption.
 *
 * The cookie name is the literal string the browser stores and is the same in every
 * language. Every other cell is prose read in the current locale, with `{domain}` and
 * `{ownerEmail}` resolved.
 */
export function CookieTable ({ locale }: CookieTableProps) {
  const t = useTranslations("Legal");

  return (
    <div
      aria-labelledby={CAPTION_ID}
      className="my-8 overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      role="region"
      tabIndex={0}
    >
      <table className="w-full min-w-readable border-collapse text-left text-meta">
        <caption className="mb-3 text-left text-meta text-muted-foreground" id={CAPTION_ID}>
          {t("cookieTableCaption")}
        </caption>

        <thead>
          <tr className="hairline-b">
            <th className="py-2 pr-4 font-medium text-foreground" scope="col">
              {t("tableCookieName")}
            </th>
            <th className="py-2 pr-4 font-medium text-foreground" scope="col">
              {t("tableCookieProvider")}
            </th>
            <th className="py-2 pr-4 font-medium text-foreground" scope="col">
              {t("tableCookiePurpose")}
            </th>
            <th className="py-2 pr-4 font-medium text-foreground" scope="col">
              {t("tableCookieDuration")}
            </th>
            <th className="py-2 font-medium text-foreground" scope="col">
              {t("tableCookieType")}
            </th>
          </tr>
        </thead>

        <tbody className="text-muted-foreground">
          {COOKIE_REGISTRY.map((cookie) => (
            <tr key={cookie.name} className="hairline-b align-top">
              <th
                className="py-3 pr-4 font-mono text-xs font-normal whitespace-nowrap text-foreground"
                scope="row"
              >
                {cookie.name}
              </th>
              <td className="py-3 pr-4">{resolveSitePlaceholders(cookie.provider[ locale ])}</td>
              <td className="py-3 pr-4">{resolveSitePlaceholders(cookie.purpose[ locale ])}</td>
              <td className="py-3 pr-4 whitespace-nowrap">
                {resolveSitePlaceholders(cookie.duration[ locale ])}
              </td>
              <td className="py-3">{resolveSitePlaceholders(cookie.type[ locale ])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
