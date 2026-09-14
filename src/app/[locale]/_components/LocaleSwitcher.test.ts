// src/app/[locale]/_components/LocaleSwitcher.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { routing } from "@/i18n/routing";

import { localeHref, SHORT_LABELS } from "./LocaleSwitcher";

/**
 * Guards for the language switcher.
 *
 * The component is never mounted: Vitest runs in the `node` environment and next-intl's
 * client navigation helpers import `next/navigation`, which only resolves inside the Next
 * compiler. The module is stubbed so the two pure exports can be imported, and everything
 * that lives in the JSX is read from the source text.
 */
vi.mock("@/i18n/navigation", () => ({
  getPathname: ({ href }: { href: string; }) => href,
  usePathname: () => "/",
}));

const ROOT = process.cwd();
const LOCALE_SWITCHER = "src/app/[locale]/_components/LocaleSwitcher.tsx";

/** Source with comments stripped, so a guard matches code and not the prose around it. */
function code (path: string): string {
  return readFileSync(join(ROOT, path), "utf8")
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .replaceAll(/^\s*\/\/.*$/gm, "");
}

describe("the href each anchor navigates to", () => {
  it("is the bare locale path when the page is at the top and carries no query", () => {
    expect(localeHref("/es", { search: "", hash: "" })).toBe("/es");
    expect(localeHref("/", { search: "", hash: "" })).toBe("/");
  });

  it("keeps the section the visitor is reading", () => {
    expect(localeHref("/es", { search: "", hash: "#experience" })).toBe("/es#experience");
    expect(localeHref("/", { search: "", hash: "#experience" })).toBe("/#experience");
  });

  it("keeps the query string", () => {
    expect(localeHref("/es", { search: "?ref=cv", hash: "" })).toBe("/es?ref=cv");
  });

  it("puts the query string before the hash", () => {
    expect(localeHref("/es", { search: "?ref=cv", hash: "#contact" })).toBe("/es?ref=cv#contact");
  });

  it("works from a path deeper than the home route", () => {
    expect(localeHref("/es/privacy", { search: "", hash: "#data" })).toBe("/es/privacy#data");
  });
});

describe("the two labels", () => {
  it("covers every locale the routing declares, and no other", () => {
    expect(Object.keys(SHORT_LABELS).sort()).toEqual([ ...routing.locales ].sort());
  });

  it("is code and not copy: the same two characters in both catalogues", () => {
    for (const locale of routing.locales) {
      expect(SHORT_LABELS[ locale ]).toBe(locale.toUpperCase());
    }
  });
});

describe("the markup contract", () => {
  it("builds every href through the routing helper instead of gluing a prefix", () => {
    // "/es" is written by localePrefix, never by this component: a hand-built prefix
    // would produce "/en" for the default locale, which 307s away.
    const source = code(LOCALE_SWITCHER);

    expect(source).toContain("getPathname({ href: pathname, locale })");
    expect(source, "a hand-built locale prefix").not.toMatch(/`\/\$\{locale\}/);
  });

  it("renders anchors, so both locales survive a middle click and a crawler", () => {
    const source = code(LOCALE_SWITCHER);

    expect(source).toContain("<a");
    expect(source, "a button standing in for a link").not.toContain("<button");
    expect(source, "navigation behind an onClick").not.toContain("onClick");
    expect(source, "a pending state with nothing to show").not.toContain("useTransition");
  });

  it("emits the hooks the language and the E2E selector depend on", () => {
    const source = code(LOCALE_SWITCHER);

    expect(source).toContain(`data-testid="locale-switcher"`);
    expect(source).toContain("hrefLang={locale}");
    expect(source).toContain("lang={locale}");
    expect(source).toContain(`aria-current={isActive ? "page" : undefined}`);
  });

  it("is a labelled landmark and not an unnamed box", () => {
    const source = code(LOCALE_SWITCHER);

    expect(source).toContain("<nav");
    expect(source).toContain(`aria-label={t("label")}`);
  });

  it("recomputes the href on pointerdown and on Enter, not from a hashchange listener", () => {
    // The scroll spy moves the hash with history.replaceState(), which fires no
    // hashchange: a listener would go stale exactly once the visitor has scrolled.
    const source = code(LOCALE_SWITCHER);

    expect(source).toContain("onPointerDown={keepSection}");
    expect(source).toContain(`event.key === "Enter"`);
    expect(source).not.toContain("hashchange");
    expect(source).not.toContain("addEventListener");
  });

  it("gives both anchors a 44 px target", () => {
    expect(code(LOCALE_SWITCHER)).toContain("touch-target");
  });
});
