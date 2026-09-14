// src/app/[locale]/_components/MobileNav.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Guards for the mobile menu.
 *
 * Focus trapping, the Escape key and the scroll lock are behaviours of a real browser and
 * are not exercised here. What is checked is that they are the primitive's behaviours and
 * not a second hand-written implementation.
 */
const ROOT = process.cwd();
const MOBILE_NAV = "src/app/[locale]/_components/MobileNav.tsx";

/** Source with comments stripped, so a guard matches code and not the prose around it. */
function code (path: string): string {
  return readFileSync(join(ROOT, path), "utf8")
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .replaceAll(/^\s*\/\/.*$/gm, "");
}

describe("the dialog behind the menu", () => {
  it("is the patched Sheet and nothing else", () => {
    const source = code(MOBILE_NAV);

    expect(source).toContain(`from "@/components/ui/sheet"`);
    expect(source).toContain("<Sheet");
    expect(source).toContain("<SheetTrigger");
    expect(source).toContain("<SheetContent");
  });

  it("hand-rolls neither the focus trap, the Escape key nor the scroll lock", () => {
    const source = code(MOBILE_NAV);

    expect(source, "a hand-written key or outside-press listener").not.toContain("addEventListener");
    expect(source, "a hand-written Escape handler").not.toContain("Escape");
    expect(source, "a hand-written scroll lock").not.toContain("document.body");
    expect(source, "a hand-written scroll lock").not.toContain("overflow");
    expect(source, "a hand-moved focus ring").not.toContain(".focus()");
    expect(source, "a hand-managed tab order").not.toContain("tabIndex");
  });

  it("declares no dialog ARIA of its own: the primitive owns role and aria-modal", () => {
    const source = code(MOBILE_NAV);

    expect(source).not.toContain(`role="dialog"`);
    expect(source).not.toContain("aria-modal");
  });

  it("hides no focusable entry behind a toggled aria-hidden", () => {
    // The only aria-hidden in the file is the static one on the two decorative icons.
    const source = code(MOBILE_NAV);

    expect(source, "a toggled aria-hidden").not.toMatch(/aria-hidden=\{/);
    expect(source.match(/aria-hidden="true"/g)).toHaveLength(2);
  });
});

describe("the trigger", () => {
  it("carries the data-testid the end-to-end selectors reach it by", () => {
    expect(code(MOBILE_NAV)).toContain(`data-testid="mobile-nav-trigger"`);
  });

  it("has a translated accessible name and points at the panel it opens", () => {
    const source = code(MOBILE_NAV);

    expect(source).toContain("{openLabel}");
    expect(source).toContain("aria-controls={PANEL_ID}");
    expect(source).toContain("id={PANEL_ID}");
  });

  it("is an icon Button, which is 44 px below md, and disappears from md up", () => {
    const source = code(MOBILE_NAV);

    expect(source).toContain(`size="icon"`);
    expect(source).toContain(`className="md:hidden"`);
  });
});

describe("the panel", () => {
  it("replaces the primitive's untranslated close button with a named one", () => {
    // sheet.tsx ships an English "Close" in its built-in button; the site is bilingual.
    const source = code(MOBILE_NAV);

    expect(source).toContain("showCloseButton={false}");
    expect(source).toContain("<SheetClose");
    expect(source).toContain("{closeLabel}");
  });

  it("names both the dialog and the nav landmark inside it", () => {
    const source = code(MOBILE_NAV);

    expect(source).toContain("<SheetTitle");
    expect(source).toContain("aria-label={menuLabel}");
  });

  it("renders the entries as real anchors with a 44 px row", () => {
    const source = code(MOBILE_NAV);

    expect(source).toContain("href={item.href}");
    expect(source).toContain("min-h-11");
    expect(source, "a div standing in for a link").not.toContain("<div");
  });

  it("closes itself when an entry is followed", () => {
    // Without this the panel stays over the section the visitor just jumped to.
    expect(code(MOBILE_NAV)).toContain("setOpen(false)");
  });

  it("holds no language switch: changing language is a first-level action", () => {
    const source = code(MOBILE_NAV);

    expect(source).not.toContain("LocaleSwitcher");
    expect(source).not.toContain("ThemeToggle");
  });
});
