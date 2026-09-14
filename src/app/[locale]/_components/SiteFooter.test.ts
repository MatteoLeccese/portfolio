// src/app/[locale]/_components/SiteFooter.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";

import { socials } from "@/domains/profile/content/socials";
import { MANUAL_ICON_SLUGS, SIMPLE_ICON_SLUGS } from "@/domains/skills/content/icons";

import en from "../../../../messages/en.json";
import es from "../../../../messages/es.json";

/**
 * Guards for the footer. It is a Server Component that reads the request locale, so
 * nothing here mounts it: the copyright line is rendered through a standalone translator
 * and the wiring is read from the source text.
 */
const ROOT = process.cwd();
const SITE_FOOTER = "src/app/[locale]/_components/SiteFooter.tsx";

/** Source with comments stripped, so a guard matches code and not the prose around it. */
function code (path: string): string {
  return readFileSync(join(ROOT, path), "utf8")
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .replaceAll(/^\s*\/\/.*$/gm, "");
}

const CATALOGUES = [ [ "en", en ], [ "es", es ] ] as const;

describe("the copyright year", () => {
  it("comes from the clock and is written nowhere in the source", () => {
    const source = code(SITE_FOOTER);

    expect(source).toContain("new Date().getFullYear()");
    expect(source, "a four-digit year literal in the footer").not.toMatch(/\b(?:19|20)\d{2}\b/);
  });

  it("reaches the message as a string, so ICU substitutes it verbatim", () => {
    // A number is an ICU argument the locale may reformat; a string never is.
    expect(code(SITE_FOOTER)).toContain("new Date().getFullYear().toString()");

    for (const [ locale, messages ] of CATALOGUES) {
      const t = createTranslator({ locale, messages, namespace: "Footer" });
      const line = t("rights", { year: "2026", name: "Matteo Leccese" });

      expect(line, locale).toContain("2026");
      expect(line, `${locale}: the year came out separated`).not.toMatch(/2[.,\s]026/);
    }
  });

  it("takes the owner's name from SITE and never spells it out", () => {
    const source = code(SITE_FOOTER);

    expect(source).toContain("name: SITE.name");
    expect(source).not.toContain("Matteo");
  });
});

describe("the legal block", () => {
  it("routes both links through the locale-aware Link", () => {
    // next/link would send a Spanish visitor to the English /privacy and drop the prefix.
    const source = code(SITE_FOOTER);

    expect(source).toContain(`import { Link } from "@/i18n/navigation"`);
    expect(source).not.toContain(`from "next/link"`);
    expect(source).toContain(`href="/privacy"`);
    expect(source).toContain(`href="/cookies"`);
  });

  it("names the nav from the catalogue", () => {
    expect(code(SITE_FOOTER)).toContain(`aria-label={t("legalNavLabel")}`);
  });

  it("renders the cookie notice as a line of the page, not a banner", () => {
    const source = code(SITE_FOOTER);

    expect(source).toContain(`{t("cookieNotice")}`);
    expect(source.toLowerCase()).not.toContain("dialog");
    expect(source.toLowerCase()).not.toContain("banner");
  });

  it("gives both legal links a 44 px target", () => {
    expect(code(SITE_FOOTER)).toContain("touch-target");
  });
});

describe("the footer shell", () => {
  it("is the single hairline at the end of the page and uses the page container", () => {
    const source = code(SITE_FOOTER);

    expect(source).toContain("hairline-t");
    expect(source).toContain("container-page");
    expect(source.match(/<footer/g), "more than one <footer>").toHaveLength(1);
  });

  it("stays a Server Component that reads no request state", () => {
    // A "use client" directive here would ship the whole footer to the browser; a
    // cookies() or headers() call would take / and /es out of the prerender table.
    const source = code(SITE_FOOTER);

    expect(source).not.toContain("use client");
    expect(source).not.toContain("next/headers");
    expect(source).not.toMatch(/\b(?:cookies|headers)\(\)/);
  });
});

describe("the glyphs the footer's social links ask for", () => {
  it("has a generated or hand-committed SVG behind every brand slug", () => {
    // SocialIcon builds /icons/icon-<slug>.svg. A slug outside these two lists names a
    // file `npm run icons:skills` never produces, and the link renders as an empty box.
    const known: readonly string[] = [ ...SIMPLE_ICON_SLUGS, ...MANUAL_ICON_SLUGS, "mail" ];
    const unknown = socials.map((social) => social.icon).filter((icon) => !known.includes(icon));

    expect(unknown, `Social icons with no SVG behind them: ${unknown.join(", ")}`).toEqual([]);
  });
});
