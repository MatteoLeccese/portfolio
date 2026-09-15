// src/domains/core/config/site.ts
import type { Locale, YearMonth } from "@/domains/core/types";

/**
 * Identity and canonical configuration. The only module that reads NEXT_PUBLIC_*
 * variables, each written as a literal member expression the build replaces with its
 * value. Safe to import from a client component.
 */

/**
 * The values used when the matching variable is unset. FALLBACK_EMAIL is reached
 * outside a production build only; the other two are reached in every environment.
 */
const FALLBACK_EMAIL = "matteoleccese2099@gmail.com";
const FALLBACK_GITHUB = "https://github.com/MatteoLeccese";
const FALLBACK_LINKEDIN = "https://www.linkedin.com/in/matteo-l-65a95b207/";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

/** The variable's value, or undefined when it is unset or empty. */
function present (value: string | undefined): string | undefined {
  return value !== undefined && value.length > 0 ? value : undefined;
}

/** Returns `value`, and throws when it is not an email address. */
function checkEmail (name: string, value: string): string {
  if (!EMAIL_PATTERN.test(value)) {
    throw new Error(`${name} must be an email address. Received: "${value}".`);
  }

  return value;
}

/** Returns `value`, and throws when it is not an absolute http(s) URL. */
function checkUrl (name: string, value: string): string {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute URL. Received: "${value}".`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${name} must use http or https. Received: "${value}".`);
  }

  return value;
}

/** Reads a required URL or email: absent on a production build throws, elsewhere falls back. */
function readRequired (
  name: string,
  value: string | undefined,
  check: (name: string, value: string) => string,
  fallback: string,
): string {
  const explicit = present(value);
  if (explicit !== undefined) return check(name, explicit);
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${name} is required for a production build.`);
  }

  return fallback;
}

/** Reads an optional URL. Absent falls back in every environment; present is validated. */
function readOptionalUrl (name: string, value: string | undefined, fallback: string): string {
  const explicit = present(value);

  return explicit === undefined ? fallback : checkUrl(name, explicit);
}

/** Reads an optional email. Absent falls back in every environment; present is validated. */
function readOptionalEmail (name: string, value: string | undefined, fallback: string): string {
  const explicit = present(value);

  return explicit === undefined ? fallback : checkEmail(name, explicit);
}

function readSiteUrl (): string {
  const url = readRequired(
    "NEXT_PUBLIC_SITE_URL",
    process.env.NEXT_PUBLIC_SITE_URL,
    checkUrl,
    "http://localhost:3200",
  );

  return url.replace(/\/+$/, "");
}

/**
 * Whether the contact section renders the Resend-backed form. True only when
 * NEXT_PUBLIC_USE_RESEND_EMAIL_FORM is exactly "true"; unset, empty or any other value
 * is false, and the section offers the email address instead.
 */
export const USE_RESEND_EMAIL_FORM: boolean
  = process.env.NEXT_PUBLIC_USE_RESEND_EMAIL_FORM === "true";

export const SITE = {
  url: readSiteUrl(),
  name: "Matteo Leccese",

  /** Rendered by ContactChannels as the fallback channel. Never obfuscated. */
  email: readOptionalEmail(
    "NEXT_PUBLIC_SITE_EMAIL",
    process.env.NEXT_PUBLIC_SITE_EMAIL,
    FALLBACK_EMAIL,
  ),

  /** Never published on the site. Rendered only into the CV PDF. */
  phone: "+58 424 699 1599",

  /**
   * City-level location. `country` is the ISO code schema.org expects and `countryName` is
   * the display name the CV header prints; neither is derived from the other.
   */
  location: { region: "Zulia", country: "VE", countryName: "Venezuela" },

  /** The single source of truth for "years of experience". */
  careerStart: "2021-10" satisfies YearMonth,
  github: readOptionalUrl(
    "NEXT_PUBLIC_SITE_GITHUB_URL",
    process.env.NEXT_PUBLIC_SITE_GITHUB_URL,
    FALLBACK_GITHUB,
  ),

  linkedin: readOptionalUrl(
    "NEXT_PUBLIC_SITE_LINKEDIN_URL",
    process.env.NEXT_PUBLIC_SITE_LINKEDIN_URL,
    FALLBACK_LINKEDIN,
  ),
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
 * Whether this deployment may be indexed. Only production is indexable, unless
 * SITE_INDEXABLE is set to "1" or "0", which forces the answer either way.
 */
export function isIndexable (): boolean {
  if (process.env.SITE_INDEXABLE === "1") return true;
  if (process.env.SITE_INDEXABLE === "0") return false;
  return deploymentEnv() === "production";
}

/** The host of SITE.url. */
export const SITE_DOMAIN = new URL(SITE.url).host;

/** Replaces `{domain}` and `{ownerEmail}`, the two placeholders legal prose may contain. */
export function resolveSitePlaceholders (text: string): string {
  return text.replaceAll("{domain}", SITE_DOMAIN).replaceAll("{ownerEmail}", SITE.email);
}
