// tests/e2e/a11y.spec.ts
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { DEFAULT_LOCALE, LOCALES } from "@/domains/core/config/locales";
import { THEMES, THEME_COOKIE_NAME, type Theme } from "@/lib/theme";

/**
 * The axe scans, at desktop and at phone width: the home page in every locale and every
 * theme, and the cookie policy in every theme.
 *
 * Each scan runs against the settled page. The document is scrolled top to bottom so the
 * reveal observer shows every section, and the scan then waits for every animation that
 * does not loop for ever to finish.
 */

/** The tag set of the conformance level the project claims. */
const WCAG_AA_TAGS = [ "wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa" ];

/** The host the theme cookie is written for. */
const COOKIE_DOMAIN = "127.0.0.1";

/** An element the reveal observer has not shown yet. */
const HIDDEN_REVEAL = `[data-reveal="hidden"]`;

/** How many times revealEverySection scrolls the document before giving up. */
const REVEAL_PASSES = 4;

/** The legal route that renders the cookie table. */
const LEGAL_PATH = "/cookies";

test.describe.configure({ timeout: 90_000 });

/** The path the home page is served at in `locale`. The default locale carries no prefix. */
function homePath (locale: string): string {
  return locale === DEFAULT_LOCALE ? "/" : `/${locale}`;
}

/** Stores `theme` in the cookie the pre-paint script reads. */
async function setThemeCookie (page: Page, theme: Theme): Promise<void> {
  await page.context().addCookies([
    { name: THEME_COOKIE_NAME, value: theme, domain: COOKIE_DOMAIN, path: "/" },
  ]);
}

/** Scrolls the document top to bottom until nothing is left in the hidden reveal state. */
async function revealEverySection (page: Page): Promise<void> {
  for (let pass = 0; pass < REVEAL_PASSES; pass += 1) {
    await page.evaluate(async () => {
      const step = window.innerHeight / 2;
      const dwell = (ms: number) => new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms);
      });

      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await dwell(150);
      }

      window.scrollTo(0, document.body.scrollHeight);
      await dwell(400);
      window.scrollTo(0, 0);
      await dwell(300);
    });

    if (await page.locator(HIDDEN_REVEAL).count() === 0) return;
  }
}

/** Waits until every animation that does not loop for ever has finished. */
async function waitForAnimationsToFinish (page: Page): Promise<void> {
  await page.waitForFunction(() => document.getAnimations().every((animation) => {
    const iterations = animation.effect?.getComputedTiming().iterations ?? 1;

    return !Number.isFinite(iterations) || animation.playState === "finished";
  }));
}

/** Loads `path` in `theme` and leaves the page in the state a visitor sees once it rests. */
async function openForScan (page: Page, path: string, theme: Theme): Promise<void> {
  await setThemeCookie(page, theme);
  await page.goto(path);

  const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));

  expect(isDark, `the ${theme} cookie did not reach the pre-paint script`)
    .toBe(theme === "dark");

  await revealEverySection(page);
  await waitForAnimationsToFinish(page);

  await expect(page.locator(HIDDEN_REVEAL), "a section never left the hidden reveal state")
    .toHaveCount(0);
}

/** Runs axe over the whole document at the project's conformance level. */
async function scan (page: Page) {
  return new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze();
}

/** Asserts the scan found no violation, and that its colour-contrast rule ran. */
function expectNoViolations (results: Awaited<ReturnType<typeof scan>>): void {
  const found = results.violations.map((violation) => ({
    rule: violation.id,
    impact: violation.impact,
    targets: violation.nodes.map((node) => node.target.join(" ")),
  }));

  expect(found).toEqual([]);
  expect(results.passes.map((rule) => rule.id)).toContain("color-contrast");
}

test.describe("the home page", () => {
  for (const locale of LOCALES) {
    for (const theme of THEMES) {
      test(`has no WCAG AA violation in ${locale}, ${theme} theme`, async ({ page }) => {
        await openForScan(page, homePath(locale), theme);
        expectNoViolations(await scan(page));
      });
    }
  }
});

test.describe("the cookie policy", () => {
  for (const theme of THEMES) {
    test(`has no WCAG AA violation in the ${theme} theme`, async ({ page }) => {
      await openForScan(page, LEGAL_PATH, theme);
      expectNoViolations(await scan(page));
    });
  }
});
