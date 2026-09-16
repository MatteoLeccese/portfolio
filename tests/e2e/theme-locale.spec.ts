// tests/e2e/theme-locale.spec.ts
import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";

import { LOCALES } from "@/domains/core/config/locales";
import { THEME_COLOR_SRGB } from "@/lib/palette-srgb";
import { DEFAULT_THEME, THEME_COOKIE_NAME, type Theme } from "@/lib/theme";

/**
 * Theme and language as the visitor drives them: the switch, the stored theme on the next
 * visit, and the two anchors that change language.
 */

/** What the root element carried the moment the parser reached <body>. */
interface PrePaintState {
  dark: boolean;
  colorScheme: string;
  themeColor: string;
}

/** Property on `window` the capture writes its reading to. */
const CAPTURE_KEY = "__prePaintState";

/** Accessible name of the header's section navigation, per locale. */
const MAIN_NAV_LABEL = { en: "Main navigation", es: "Navegación principal" } as const;

/** Every page that renders a document shell of its own, including the 404. */
const SHELL_PATHS = [
  "/",
  "/es",
  "/privacy",
  "/es/privacy",
  "/cookies",
  "/es/cookies",
  "/no-such-page",
] as const;

/**
 * Records the theme of the root element the first time the parser has produced a <body>,
 * which is after the head has run and before any deferred script.
 */
async function capturePrePaint (page: Page): Promise<void> {
  await page.addInitScript((key: string) => {
    const store = window as unknown as Record<string, unknown>;

    const observer = new MutationObserver(() => {
      if (document.body === null || store[ key ] !== undefined) return;

      const root = document.documentElement;
      const meta = document.querySelector("meta[name=theme-color]");

      store[ key ] = {
        dark: root.classList.contains("dark"),
        colorScheme: root.style.colorScheme,
        themeColor: meta === null ? "" : (meta.getAttribute("content") ?? ""),
      };

      observer.disconnect();
    });

    observer.observe(document, { childList: true, subtree: true });
  }, CAPTURE_KEY);
}

/** What the capture recorded. Throws when it never ran. */
async function prePaintState (page: Page): Promise<PrePaintState> {
  const state = await page.evaluate<PrePaintState | null, string>((key) => {
    const store = window as unknown as Record<string, PrePaintState | undefined>;

    return store[ key ] ?? null;
  }, CAPTURE_KEY);

  if (state === null) throw new Error("the pre-paint capture never ran");

  return state;
}

/** Puts the theme cookie in the jar before the first request. */
async function storeTheme (
  context: BrowserContext,
  baseURL: string | undefined,
  theme: Theme,
): Promise<void> {
  if (baseURL === undefined) throw new Error("no baseURL is configured");

  await context.addCookies([ { name: THEME_COOKIE_NAME, value: theme, url: baseURL } ]);
}

/** Resolves once the client bundle has promoted html[data-motion] to "ready". */
async function waitForHydration (page: Page): Promise<void> {
  await expect(page.locator("html")).toHaveAttribute("data-motion", "ready");
}

/** `color-scheme` on the root element. */
async function colorScheme (page: Page): Promise<string> {
  return page.evaluate(() => document.documentElement.style.colorScheme);
}

/** A section entry of the header navigation, by its visible label. */
function sectionLink (page: Page, navLabel: string, label: string): Locator {
  return page
    .getByRole("navigation", { name: navLabel })
    .getByRole("link", { name: label, exact: true });
}

/** One of the two language anchors. */
function localeLink (page: Page, locale: string): Locator {
  return page.locator(`[data-testid=locale-switcher] a[hreflang=${locale}]`);
}

test.describe("the theme switch", () => {
  test("flips the theme, and the flip is still there after a reload", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    await expect(page.locator("html.dark")).toHaveCount(0);
    expect(await colorScheme(page)).toBe(DEFAULT_THEME);

    await page.getByTestId("theme-toggle").click();

    await expect(page.locator("html.dark")).toHaveCount(1);
    expect(await colorScheme(page)).toBe("dark");

    await page.reload();

    await expect(page.locator("html.dark")).toHaveCount(1);
    expect(await colorScheme(page)).toBe("dark");

    await waitForHydration(page);
    await page.getByTestId("theme-toggle").click();

    await expect(page.locator("html.dark")).toHaveCount(0);

    await page.reload();

    await expect(page.locator("html.dark")).toHaveCount(0);
    expect(await colorScheme(page)).toBe("light");
  });
});

test.describe("a visitor whose stored theme is dark", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await storeTheme(context, baseURL, "dark");
  });

  for (const path of SHELL_PATHS) {
    test(`gets ${path} dark before the parser reaches the body`, async ({ page }) => {
      await capturePrePaint(page);
      await page.goto(path);

      const state = await prePaintState(page);

      expect(state.dark).toBe(true);
      expect(state.colorScheme).toBe("dark");
      expect(state.themeColor).toBe(THEME_COLOR_SRGB.dark);
    });
  }
});

test.describe("a visitor with no stored theme", () => {
  test("gets the default theme before the parser reaches the body", async ({ page }) => {
    await capturePrePaint(page);
    await page.goto("/");

    const state = await prePaintState(page);

    expect(state.dark).toBe(false);
    expect(state.colorScheme).toBe(DEFAULT_THEME);
    expect(state.themeColor).toBe(THEME_COLOR_SRGB.light);
  });
});

test.describe("the language switcher", () => {
  test("carries the section from one language to the other", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    await sectionLink(page, MAIN_NAV_LABEL.en, "Experience").click();

    await expect(page).toHaveURL("/#experience");
    await expect(page.locator("#experience")).toBeInViewport();

    await localeLink(page, "es").click();

    await expect(page).toHaveURL("/es#experience");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.locator("#experience-title")).toHaveText("Experiencia");
    await expect(page.locator("#experience")).toBeInViewport();

    await waitForHydration(page);
    await sectionLink(page, MAIN_NAV_LABEL.es, "Educación").click();

    await expect(page).toHaveURL("/es#education");

    await localeLink(page, "en").click();

    await expect(page).toHaveURL("/#education");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("#education-title")).toHaveText("Education");
    await expect(page.locator("#education")).toBeInViewport();
  });

  test("marks the language being read and leaves the other one plain", async ({ page }) => {
    await page.goto("/es");

    await expect(localeLink(page, "es")).toHaveAttribute("aria-current", "page");
    await expect(localeLink(page, "en")).not.toHaveAttribute("aria-current", "page");
  });
});

test.describe("the language switcher without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("is two real links, and both of them navigate", async ({ page }) => {
    await page.goto("/");

    const anchors = page.locator(`[data-testid=locale-switcher] a`);

    await expect(anchors).toHaveCount(LOCALES.length);
    await expect(page.locator(`[data-testid=locale-switcher] button`)).toHaveCount(0);
    await expect(localeLink(page, "en")).toHaveAttribute("href", "/");
    await expect(localeLink(page, "es")).toHaveAttribute("href", "/es");

    for (const locale of LOCALES) {
      await expect(localeLink(page, locale)).not.toHaveAttribute("rel", /nofollow/);
    }

    await localeLink(page, "es").click();

    await expect(page).toHaveURL("/es");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.locator("#experience-title")).toHaveText("Experiencia");

    await localeLink(page, "en").click();

    await expect(page).toHaveURL("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("#experience-title")).toHaveText("Experience");
  });
});
