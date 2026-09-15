// src/domains/legal/content/legal.test.ts
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { COOKIE_REGISTRY } from "@/domains/core/config/cookies";
import { LOCALES } from "@/domains/core/config/locales";
import { SITE, SITE_DOMAIN, USE_RESEND_EMAIL_FORM } from "@/domains/core/config/site";
import { THEME_COOKIE_MAX_AGE, THEME_COOKIE_NAME } from "@/lib/theme";
import type { LegalDocument, LegalSection } from "../types";
import { cookiePolicy } from "./cookies";
import { buildPrivacyPolicy, privacyPolicy } from "./privacy";

/**
 * Invariants of the legal prose: no literal domain or address, the two placeholders
 * present in both languages, the same structure in both languages, nothing empty, and a
 * cookie policy that matches COOKIE_REGISTRY.
 *
 * The privacy policy has one version per contact path and only one of them is ever
 * rendered by a build, so both are listed below and every invariant runs over each.
 */

/** The privacy policy as the form path publishes it. */
const PRIVACY_WITH_FORM = buildPrivacyPolicy(true);

/** The privacy policy as the `mailto:` path publishes it. */
const PRIVACY_WITH_MAIL_LINK = buildPrivacyPolicy(false);

interface PublishedDocument {

  /** What a failure is reported under, since both privacy versions share a slug. */
  label: string;
  document: LegalDocument;
}

const DOCUMENTS: readonly PublishedDocument[] = [
  { label: "cookies", document: cookiePolicy },
  { label: "privacy (form)", document: PRIVACY_WITH_FORM },
  { label: "privacy (mail link)", document: PRIVACY_WITH_MAIL_LINK },
];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Any host-shaped token, whatever the domain of the day is. */
const HOST_LIKE = /(?:[a-z0-9-]+\.)+(?:com|dev|net|org|io|app|me|co|ai|es)(?![a-z])/i;

/** Any address-shaped token, which `{ownerEmail}` stands in for. */
const EMAIL_LIKE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

/** Any absolute URL. */
const URL_LIKE = /https?:\/\//i;

/** The provider that carries a form submission, named in the policy that has a form. */
const EMAIL_PROVIDER = "Resend";

/** How each language names the anti-abuse rate limit the form applies. */
const RATE_LIMIT: Record<(typeof LOCALES)[ number ], string> = {
  en: "rate limit",
  es: "límite de frecuencia",
};

/** The component that prints the date, read as text rather than imported. */
const VIEW = fileURLToPath(new URL("../components/LegalDocumentView.tsx", import.meta.url));

/** The date options LegalDocumentView declares, restated here so the two can be compared. */
const UPDATED_AT_FORMAT = { dateStyle: "long", timeZone: "UTC" } as const;

/** Third-party references the prose is allowed to name, removed before the host check. */
const ALLOWED_HOSTS: readonly string[] = [ "www.aepd.es" ];

/** Heading, paragraphs and bullets of one section, in one locale. */
function sectionStrings (section: LegalSection, locale: (typeof LOCALES)[ number ]): string[] {
  return [
    section.heading[ locale ],
    ...section.body[ locale ],
    ...(section.bullets?.[ locale ] ?? []),
  ];
}

/** Every localized string a document renders, in one locale. */
function prose (document: LegalDocument, locale: (typeof LOCALES)[ number ]): string[] {
  return [
    document.title[ locale ],
    ...document.intro[ locale ],
    ...document.sections.flatMap((section) => sectionStrings(section, locale)),
  ];
}

/** The paragraphs of one clause, in one locale. Empty when the clause is absent. */
function clause (
  document: LegalDocument,
  id: string,
  locale: (typeof LOCALES)[ number ],
): string[] {
  return document.sections.find((section) => section.id === id)?.body[ locale ] ?? [];
}

function withoutAllowedHosts (text: string): string {
  return ALLOWED_HOSTS.reduce((stripped, host) => stripped.replaceAll(host, ""), text);
}

/** Every localized string the cookie table renders, in one locale. */
function registryStrings (locale: (typeof LOCALES)[ number ]): string[] {
  return COOKIE_REGISTRY.flatMap((cookie) => [
    cookie.provider[ locale ],
    cookie.purpose[ locale ],
    cookie.duration[ locale ],
    cookie.type[ locale ],
  ]);
}

describe("legal content", () => {
  it("never writes the domain literally, in either language", () => {
    for (const { label: slug, document } of DOCUMENTS) {
      for (const locale of LOCALES) {
        for (const text of [ ...prose(document, locale), ...registryStrings(locale) ]) {
          const label = `${slug} (${locale})`;
          expect(text, label).not.toContain(SITE_DOMAIN);
          expect(withoutAllowedHosts(text), label).not.toMatch(HOST_LIKE);
          expect(text, label).not.toMatch(URL_LIKE);
        }
      }
    }
  });

  it("never writes the owner's address literally, in either language", () => {
    for (const { label: slug, document } of DOCUMENTS) {
      for (const locale of LOCALES) {
        for (const text of [ ...prose(document, locale), ...registryStrings(locale) ]) {
          const label = `${slug} (${locale})`;
          expect(text, label).not.toContain(SITE.email);
          expect(text, label).not.toMatch(EMAIL_LIKE);
        }
      }
    }
  });

  it("carries both placeholders in both documents and both languages", () => {
    for (const { label: slug, document } of DOCUMENTS) {
      for (const locale of LOCALES) {
        const text = prose(document, locale).join("\n");
        expect(text, `${slug} (${locale}) never uses {domain}`).toContain("{domain}");
        expect(text, `${slug} (${locale}) never uses {ownerEmail}`).toContain("{ownerEmail}");
      }
    }
  });

  it("uses no placeholder the renderer does not resolve", () => {
    const known = new Set([ "{domain}", "{ownerEmail}" ]);

    for (const { label: slug, document } of DOCUMENTS) {
      for (const locale of LOCALES) {
        for (const text of prose(document, locale)) {
          for (const found of text.match(/\{[^}]*\}/g) ?? []) {
            expect(known.has(found), `Unknown placeholder ${found} in ${slug}`).toBe(true);
          }
        }
      }
    }
  });

  it("keeps both languages structurally identical", () => {
    for (const { label, document } of DOCUMENTS) {
      expect(document.intro.en, label).toHaveLength(document.intro.es.length);

      for (const section of document.sections) {
        const sectionLabel = `${label}/${section.id}`;
        expect(section.body.en, sectionLabel).toHaveLength(section.body.es.length);
        expect(section.bullets?.en?.length, sectionLabel).toBe(section.bullets?.es?.length);
      }
    }
  });

  it("leaves no section, heading, paragraph or bullet empty", () => {
    for (const { label: slug, document } of DOCUMENTS) {
      expect(document.sections.length, slug).toBeGreaterThan(0);

      for (const locale of LOCALES) {
        expect(document.intro[ locale ].length, `${slug} (${locale})`).toBeGreaterThan(0);

        for (const section of document.sections) {
          const label = `${slug}/${section.id} (${locale})`;
          expect(section.body[ locale ].length, label).toBeGreaterThan(0);
          for (const text of sectionStrings(section, locale)) {
            expect(text.trim().length, `${label}: "${text}"`).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("uses unique kebab-case section ids", () => {
    for (const { label, document } of DOCUMENTS) {
      const ids = document.sections.map((section) => section.id);
      expect(new Set(ids).size, `Duplicate id in ${label}`).toBe(ids.length);
      for (const id of ids) expect(id, label).toMatch(SLUG);
    }
  });

  it("puts the cookie table in the cookie policy and nowhere else", () => {
    const blocks = DOCUMENTS.flatMap(({ document }) =>
      document.sections
        .filter((section) => section.block === "cookie-table")
        .map((section) => `${document.slug}/${section.id}`));

    expect(blocks).toEqual([ "cookies/cookies-we-use" ]);
  });

  it("declares every cookie the site can set, and no other", () => {
    expect(COOKIE_REGISTRY.map((cookie) => cookie.name)).toEqual([ THEME_COOKIE_NAME ]);
  });

  it("describes every registered cookie in every language", () => {
    for (const cookie of COOKIE_REGISTRY) {
      for (const locale of LOCALES) {
        const fields = [ cookie.provider, cookie.purpose, cookie.duration, cookie.type ];
        for (const field of fields) {
          expect(field[ locale ].trim().length, `${cookie.name} (${locale})`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("never restates in prose what the cookie table renders", () => {
    for (const locale of LOCALES) {
      const text = prose(cookiePolicy, locale).join("\n");
      for (const cookie of COOKIE_REGISTRY) {
        expect(text, `${cookie.name} purpose (${locale})`).not.toContain(cookie.purpose[ locale ]);
        expect(text, `${cookie.name} duration (${locale})`).not.toContain(cookie.duration[ locale ]);
      }
    }
  });

  it("declares the theme cookie with the duration the code actually sets", () => {
    const themeCookie = COOKIE_REGISTRY.find((cookie) => cookie.name === THEME_COOKIE_NAME);

    expect(themeCookie, "The theme cookie is not declared in COOKIE_REGISTRY").toBeDefined();
    expect(THEME_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 365);
  });

  it("dates both documents as YYYY-MM-DD", () => {
    for (const { label, document } of DOCUMENTS) {
      expect(document.updatedAt, label).toMatch(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/);
    }
  });

  it("prints the calendar day it declares, in every locale", () => {
    for (const { label: slug, document } of DOCUMENTS) {
      const [ year, month, day ] = document.updatedAt.split("-").map(Number);
      const instant = new Date(document.updatedAt);

      for (const locale of LOCALES) {
        const parts = new Intl.DateTimeFormat(locale, UPDATED_AT_FORMAT).formatToParts(instant);
        const numeric = new Intl.DateTimeFormat("en", {
          year: "numeric",
          month: "numeric",
          day: "numeric",
          timeZone: UPDATED_AT_FORMAT.timeZone,
        }).formatToParts(instant);
        const part = (source: Intl.DateTimeFormatPart[], type: string): number =>
          Number(source.find((candidate) => candidate.type === type)?.value);

        const label = `${slug} (${locale})`;
        expect(part(parts, "year"), label).toBe(year);
        expect(part(parts, "day"), label).toBe(day);
        expect(part(numeric, "month"), label).toBe(month);
      }
    }
  });

  it("formats that date in the component too, not only in this test", async () => {
    const source = await readFile(VIEW, "utf8");

    expect(source, "LegalDocumentView prints the date in the ambient time zone")
      .toContain(`timeZone: "${UPDATED_AT_FORMAT.timeZone}"`);
    expect(source).toContain(`dateStyle: "${UPDATED_AT_FORMAT.dateStyle}"`);
    expect(source)
      .toContain("format.dateTime(new Date(legalDocument.updatedAt), UPDATED_AT_FORMAT)");
  });
});

describe("the privacy policy and the contact path", () => {
  it("publishes the version that describes the path this build renders", () => {
    expect(privacyPolicy).toEqual(buildPrivacyPolicy(USE_RESEND_EMAIL_FORM));
  });

  it("keeps the same clauses on both paths, so the numbers the prose cites still hold", () => {
    const ids = (document: LegalDocument): string[] =>
      document.sections.map((section) => section.id);

    expect(ids(PRIVACY_WITH_MAIL_LINK)).toEqual(ids(PRIVACY_WITH_FORM));

    for (const locale of LOCALES) {
      const headings = (document: LegalDocument): string[] =>
        document.sections.map((section) => section.heading[ locale ]);

      expect(headings(PRIVACY_WITH_MAIL_LINK), locale).toEqual(headings(PRIVACY_WITH_FORM));
    }
  });

  it("names the email delivery provider only where a message travels through it", () => {
    for (const locale of LOCALES) {
      expect(prose(PRIVACY_WITH_FORM, locale).join("\n"), locale).toContain(EMAIL_PROVIDER);
      expect(prose(PRIVACY_WITH_MAIL_LINK, locale).join("\n"), locale)
        .not.toContain(EMAIL_PROVIDER);
    }
  });

  it("describes the anti-abuse rate limit only where there is a form to rate limit", () => {
    for (const locale of LOCALES) {
      expect(prose(PRIVACY_WITH_FORM, locale).join("\n"), locale).toContain(RATE_LIMIT[ locale ]);
      expect(prose(PRIVACY_WITH_MAIL_LINK, locale).join("\n"), locale)
        .not.toContain(RATE_LIMIT[ locale ]);
    }
  });

  it("drops every paragraph about data the mail link never produces", () => {
    for (const locale of LOCALES) {
      const text = prose(PRIVACY_WITH_MAIL_LINK, locale).join("\n");

      // What the form collects, what the rate limiter holds, who relays the message and
      // what protects the submission.
      const formOnly = [
        ...clause(PRIVACY_WITH_FORM, "what-we-collect", locale).slice(0, 2),
        ...clause(PRIVACY_WITH_FORM, "recipients", locale).slice(0, 1),
        ...clause(PRIVACY_WITH_FORM, "security", locale).slice(1, 2),
      ];

      expect(formOnly, `${locale}: the form policy lost a paragraph`).toHaveLength(4);

      for (const paragraph of formOnly) {
        expect(text, `${locale}: "${paragraph}"`).not.toContain(paragraph);
      }
    }
  });
});
