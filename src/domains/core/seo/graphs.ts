// src/domains/core/seo/graphs.ts
import type {
  BreadcrumbList,
  Graph,
  Person,
  ProfilePage,
  WebPage,
  WebSite,
} from "schema-dts";
import { SITE } from "@/domains/core/config/site";
import type { Locale } from "@/domains/core/types";
import {
  absoluteUrl,
  CONTENT_LAST_MODIFIED,
  type LegalRoute,
  localizedPath,
} from "./routes";

/**
 * The JSON-LD graphs of the site. Both builders take the copy already translated and the
 * facts already derived, and read no request state. The Person node carries neither email
 * nor telephone.
 */

/** The two site-wide @ids. Neither varies with the locale. */
const PERSON_ID = `${SITE.url}/#person`;
const WEBSITE_ID = `${SITE.url}/#website`;

/** Subject areas the CV backs. Technology names arrive separately, in copy.knowsAbout. */
const KNOWS_ABOUT_DOMAINS = [
  "Full stack web development",
  "REST API design",
  "Payment gateway integration",
  "Financial technology",
  "Database performance",
  "AI-assisted development",
  "AI agent orchestration",
] as const;

export type HomeGraphCopy = {
  title: string;
  description: string;

  /** The localized job title, from getJobTitle(current, locale). */
  jobTitle: string;

  /** Skill names from domains/skills/content/skills.ts. */
  knowsAbout: readonly string[];

  /** getCurrentPosition(experience)?.company, or null when between roles. */
  currentEmployer: string | null;
  alumniOf: { name: string; alternateName: string; } | null;
};

export function buildHomeGraph (locale: Locale, copy: HomeGraphCopy): Graph {
  const pageUrl = absoluteUrl(localizedPath("/", locale));
  const knowsAbout = [ ...KNOWS_ABOUT_DOMAINS, ...copy.knowsAbout ];

  const person: Person = {
    "@type": "Person",
    "@id": PERSON_ID,
    name: SITE.name,
    givenName: "Matteo",
    familyName: "Leccese",
    url: absoluteUrl("/"),
    image: absoluteUrl(SITE.logo),
    jobTitle: copy.jobTitle,
    description: copy.description,
    address: {
      "@type": "PostalAddress",
      addressRegion: SITE.location.region,
      addressCountry: SITE.location.country,
    },
    knowsLanguage: [
      { "@type": "Language", name: "English", alternateName: "en" },
      { "@type": "Language", name: "Spanish", alternateName: "es" },
    ],
    knowsAbout: [ ...knowsAbout ],
    hasOccupation: {
      "@type": "Occupation",
      name: copy.jobTitle,
      occupationalCategory: "15-1252.00",
      skills: knowsAbout.join(", "),
    },
    sameAs: [ SITE.github, SITE.linkedin ],
    ...(copy.alumniOf === null
      ? {}
      : {
        alumniOf: {
          "@type": "CollegeOrUniversity",
          name: copy.alumniOf.name,
          alternateName: copy.alumniOf.alternateName,
        },
      }),
    ...(copy.currentEmployer === null
      ? {}
      : { worksFor: { "@type": "Organization", name: copy.currentEmployer } }),
  };

  const website: WebSite = {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: absoluteUrl("/"),
    name: SITE.name,
    inLanguage: locale,
    publisher: { "@id": PERSON_ID },
  };

  const profilePage: ProfilePage = {
    "@type": "ProfilePage",
    "@id": `${pageUrl}#profilepage`,
    url: pageUrl,
    name: copy.title,
    description: copy.description,
    inLanguage: locale,
    isPartOf: { "@id": WEBSITE_ID },
    dateModified: CONTENT_LAST_MODIFIED,
    mainEntity: { "@id": PERSON_ID },
  };

  return { "@context": "https://schema.org", "@graph": [ profilePage, person, website ] };
}

export type LegalGraphCopy = { title: string; description: string; homeLabel: string; };

export function buildLegalGraph (locale: Locale, route: LegalRoute, copy: LegalGraphCopy): Graph {
  const pageUrl = absoluteUrl(localizedPath(route, locale));
  const homeUrl = absoluteUrl(localizedPath("/", locale));

  const breadcrumb: BreadcrumbList = {
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: copy.homeLabel, item: homeUrl },
      { "@type": "ListItem", position: 2, name: copy.title, item: pageUrl },
    ],
  };

  const page: WebPage = {
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: copy.title,
    description: copy.description,
    inLanguage: locale,
    isPartOf: { "@id": WEBSITE_ID },
    dateModified: CONTENT_LAST_MODIFIED,
    breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
    about: { "@id": PERSON_ID },
  };

  return { "@context": "https://schema.org", "@graph": [ page, breadcrumb ] };
}
