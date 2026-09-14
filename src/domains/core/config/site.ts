// src/domains/core/config/site.ts
import type { Locale, YearMonth } from "@/domains/core/types";

/**
 * Identity and canonical configuration. The only module allowed to read
 * NEXT_PUBLIC_* variables. Safe to import from a client component.
 *
 * There is no `jobTitle` field on purpose: the current role is derived from the
 * experience model by getJobTitle() (see 9.4).
 */

function readSiteUrl (): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit !== undefined && explicit.length > 0) return explicit.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL is required for a production build.");
  }
  return "http://localhost:3200";
}

export const SITE = {
  url: readSiteUrl(),
  name: "Matteo Leccese",

  /** Rendered by ContactChannels as the fallback channel. Never obfuscated. */
  email: "matteoleccese2099@gmail.com",

  /** Never published on the site. Rendered only into the CV PDF. See 9.10. */
  phone: "+58 424 699 1599",

  /**
   * City level only, and already public on the CV and on LinkedIn. `country` is the ISO
   * code schema.org expects; `countryName` is what the CV header prints. Nothing derives
   * one from the other at runtime: a display name is not an ISO code.
   */
  location: { region: "Zulia", country: "VE", countryName: "Venezuela" },

  /** The single source of truth for "years of experience". */
  careerStart: "2021-10" satisfies YearMonth,
  github: "https://github.com/MatteoLeccese",

  /** The long form, which is the one we know resolves. See the open questions in 17.5. */
  linkedin: "https://www.linkedin.com/in/matteo-l-65a95b207/",
  logo: "/logo/ml-logo.png",
  cvPath: (locale: Locale): string => `/cv/matteo-leccese-cv-${locale}.pdf`,

  /** What the browser saves the file as. The path basename is lowercase; this is not. */
  cvFileName: (locale: Locale): string => `Matteo-Leccese-CV-${locale.toUpperCase()}.pdf`,
} as const;

export type DeploymentEnv = "production" | "preview" | "development";

export function deploymentEnv (): DeploymentEnv {
  const value = process.env.VERCEL_ENV;
  if (value === "production" || value === "preview") return value;
  return "development";
}

/**
 * Only the production deployment may be indexed. SITE_INDEXABLE is an explicit
 * override for the Lighthouse job, which has to audit production-shaped HTML on
 * a runner where VERCEL_ENV does not exist.
 */
export function isIndexable (): boolean {
  if (process.env.SITE_INDEXABLE === "1") return true;
  if (process.env.SITE_INDEXABLE === "0") return false;
  return deploymentEnv() === "production";
}

/*
 * The two placeholders of the legal prose (section 8.13). Neither the domain nor the
 * owner's email is written out in the legal content files: they carry `{domain}` and
 * `{ownerEmail}` and are resolved at render time from the single module that knows what
 * they are worth. `legal.test.ts` fails if a literal comes back.
 */
export const SITE_DOMAIN = new URL(SITE.url).host;

/** Resolves the two placeholders legal prose is allowed to contain. */
export function resolveSitePlaceholders (text: string): string {
  return text.replaceAll("{domain}", SITE_DOMAIN).replaceAll("{ownerEmail}", SITE.email);
}
