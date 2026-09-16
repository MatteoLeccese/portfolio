// tests/e2e/keyboard.spec.ts
import { expect, test, type Page } from "@playwright/test";

/**
 * The keyboard walk of the phone layout: the skip link, the sheet behind the hamburger
 * button, and one pass of Tab over the whole home page.
 *
 * The page is asked which controls it exposes and the walk is compared with that answer.
 * No list of expected controls is written out here.
 */

/**
 * Everything Tab stops on, before any visibility filtering. A negative tabindex is excluded
 * from every branch: it takes an element out of the tab order without making it unfocusable,
 * which is what the main landmark and the contact form's honeypot field use it for.
 */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "[tabindex]",
].map((selector) => `${selector}:not([tabindex="-1"])`).join(", ");

/** The sheet the mobile menu opens, by the id the trigger's aria-controls names. */
const PANEL_SELECTOR = "#mobile-nav-panel";

/** The smallest outline, in pixels, that counts as a focus indicator. */
const MIN_OUTLINE_WIDTH = 2;

/** What one stop of the Tab walk records about the element that took focus. */
interface FocusStop {

  /** Position among the controls the page exposes, or -1 for an element outside that list. */
  index: number;

  /** Whether focus left the document and fell back to the body. */
  onBody: boolean;

  /** Whether the element is inside the mobile menu panel. */
  inPanel: boolean;

  /** Whether the element carries the mobile menu trigger's test id. */
  isMenuTrigger: boolean;

  /** Whether CSS renders the element at all. */
  isRendered: boolean;

  /** Whether the element sits inside an aria-hidden or inert subtree. */
  isHiddenFromAssistiveTech: boolean;

  width: number;
  height: number;
  outlineStyle: string;
  outlineWidth: number;

  /** Accessible name where there is one, trimmed text otherwise. Used in failure messages. */
  label: string;
}

/** Reads everything one stop of the walk is judged on, in a single round trip. */
async function readFocusStop (page: Page): Promise<FocusStop> {
  return page.evaluate(([ selector, panelSelector ]) => {
    const active = document.activeElement;
    const empty = {
      index: -1,
      onBody: true,
      inPanel: false,
      isMenuTrigger: false,
      isRendered: false,
      isHiddenFromAssistiveTech: false,
      width: 0,
      height: 0,
      outlineStyle: "none",
      outlineWidth: 0,
      label: "<body>",
    };

    if (active === null || active === document.body) return empty;

    const controls = [ ...document.querySelectorAll(selector ?? "") ]
      .filter((element) => element.checkVisibility({ checkVisibilityCSS: true }));
    const styles = getComputedStyle(active);
    const box = active.getBoundingClientRect();

    return {
      index: controls.indexOf(active),
      onBody: false,
      inPanel: active.closest(panelSelector ?? "") !== null,
      isMenuTrigger: active.getAttribute("data-testid") === "mobile-nav-trigger",
      isRendered: active.checkVisibility({ checkVisibilityCSS: true }),
      isHiddenFromAssistiveTech: active.closest(`[aria-hidden="true"], [inert]`) !== null,
      width: Math.round(box.width),
      height: Math.round(box.height),
      outlineStyle: styles.outlineStyle,
      outlineWidth: Number.parseFloat(styles.outlineWidth),
      label: (active.hasAttribute("data-base-ui-focus-guard") ? "focus guard " : "")
        + (active.getAttribute("aria-label") ?? active.textContent ?? "").trim().slice(0, 60),
    };
  }, [ FOCUSABLE_SELECTOR, PANEL_SELECTOR ]);
}

/** The controls the page exposes, in document order, by the same label the walk records. */
async function listControls (page: Page, root: string): Promise<string[]> {
  return page.evaluate(([ selector, rootSelector ]) => {
    const scope = rootSelector === "" ? document.body : document.querySelector(rootSelector ?? "");

    if (scope === null) return [];

    return [ ...scope.querySelectorAll(selector ?? "") ]
      .filter((element) => element.checkVisibility({ checkVisibilityCSS: true }))
      .map((element) => (element.getAttribute("aria-label") ?? element.textContent ?? "")
        .trim()
        .slice(0, 60));
  }, [ FOCUSABLE_SELECTOR, root ]);
}

/** Opens the mobile menu the way a keyboard user does: focus the trigger, then Enter. */
async function openMenuFromKeyboard (page: Page): Promise<void> {
  const trigger = page.getByTestId("mobile-nav-trigger");

  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(PANEL_SELECTOR)).toBeVisible();
}

/**
 * Presses `key` `count` times and records where focus landed each time, leaving two frames
 * between one press and the next, which is the cadence a keyboard produces and the one the
 * sheet's focus guards settle within. The walk stops early if focus falls to the body.
 */
async function walk (page: Page, key: string, count: number): Promise<FocusStop[]> {
  const stops: FocusStop[] = [];

  for (let press = 0; press < count; press += 1) {
    await page.keyboard.press(key);
    await page.evaluate(() => new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          resolve();
        });
      });
    }));

    const stop = await readFocusStop(page);

    stops.push(stop);

    if (stop.onBody) break;
  }

  return stops;
}

/**
 * Every stop of one full Tab walk of the page, with the fall to the body dropped. Fails
 * when the walk did not reach exactly the controls the page exposes, so a page that traps
 * or swallows Tab cannot satisfy the filters its callers apply to the result.
 */
async function tabWalkOfPage (page: Page): Promise<FocusStop[]> {
  const controls = await listControls(page, "");

  expect(controls.length).toBeGreaterThan(10);

  const reached = (await walk(page, "Tab", controls.length + 2))
    .filter((stop) => !stop.onBody);

  expect(reached, "the Tab walk did not reach every control").toHaveLength(controls.length);

  return reached;
}

test.describe("the skip link", () => {
  test("is the first thing Tab reaches", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");

    await expect(page.getByTestId("skip-link")).toBeFocused();
  });

  test("is out of sight until it takes focus, and fully on screen once it has it", async ({ page }) => {
    await page.goto("/");

    const skipLink = page.getByTestId("skip-link");

    await expect(skipLink).toHaveCSS("clip-path", "inset(50%)");

    const clipped = await skipLink.boundingBox();

    await page.keyboard.press("Tab");

    await expect(skipLink).toHaveCSS("clip-path", "none");
    await expect(skipLink).toBeInViewport({ ratio: 1 });

    const revealed = await skipLink.boundingBox();

    expect(clipped).not.toBeNull();
    expect(revealed).not.toBeNull();
    expect(revealed?.width ?? 0).toBeGreaterThan(clipped?.width ?? 0);
  });

  test("moves focus into the main landmark when it is followed", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");

    await expect(page.locator("main#main")).toBeFocused();

    // The stop after the landmark is a control inside it.
    await page.keyboard.press("Tab");

    const landedInsideMain = await page.evaluate(
      () => document.querySelector("main")?.contains(document.activeElement) ?? false,
    );

    expect(landedInsideMain).toBe(true);
  });
});

test.describe("the mobile menu", () => {
  test("opens from its trigger and closes on Escape, with aria-expanded tracking it", async ({ page }) => {
    await page.goto("/");

    const trigger = page.getByTestId("mobile-nav-trigger");
    const panel = page.locator(PANEL_SELECTOR);

    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(panel).toHaveCount(0);

    await openMenuFromKeyboard(page);

    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Escape");

    await expect(panel).toHaveCount(0);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("takes focus into the panel and keeps Tab and Shift+Tab inside it", async ({ page }) => {
    await page.goto("/");
    await openMenuFromKeyboard(page);

    const focusStarted = await readFocusStop(page);

    expect(focusStarted.inPanel, `focus opened on ${focusStarted.label}`).toBe(true);

    const panelControls = await listControls(page, PANEL_SELECTOR);

    expect(panelControls.length).toBeGreaterThan(1);

    // Two turns of the cycle, plus the focus guards between them.
    const presses = 2 * panelControls.length + 4;

    for (const key of [ "Tab", "Shift+Tab" ]) {
      const stops = await walk(page, key, presses);
      const escaped = stops.filter((stop) => !stop.inPanel);

      expect(escaped.map((stop) => stop.label), `${key} left the sheet`).toEqual([]);
      expect(stops.some((stop) => stop.isMenuTrigger || stop.onBody)).toBe(false);

      const visited = stops.map((stop) => stop.label);

      expect([ ...new Set(visited) ].sort()).toEqual([ ...new Set(panelControls) ].sort());
      expect(visited.length, `${key} did not cycle`).toBeGreaterThan(panelControls.length);
    }
  });

  test("returns focus to the trigger on Escape, not to the body", async ({ page }) => {
    await page.goto("/");
    await openMenuFromKeyboard(page);
    await page.keyboard.press("Escape");

    await expect(page.locator(PANEL_SELECTOR)).toHaveCount(0);
    await expect(page.getByTestId("mobile-nav-trigger")).toBeFocused();
  });
});

test.describe("the Tab walk of the home page", () => {
  test("reaches every control the page exposes, in document order", async ({ page }) => {
    await page.goto("/");

    const controls = await listControls(page, "");

    expect(controls.length).toBeGreaterThan(10);

    const stops = await walk(page, "Tab", controls.length + 2);
    const reached = stops.filter((stop) => !stop.onBody);

    expect(reached.map((stop) => stop.index))
      .toEqual(Array.from({ length: controls.length }, (_value, index) => index));
    expect(stops.at(-1)?.onBody, "Tab never left the document").toBe(true);
  });

  test("never lands on something the page is hiding", async ({ page }) => {
    await page.goto("/");

    const hidden = (await tabWalkOfPage(page))
      .filter((stop) => !stop.isRendered
        || stop.isHiddenFromAssistiveTech
        || stop.width === 0
        || stop.height === 0);

    expect(hidden.map((stop) => stop.label)).toEqual([]);
  });

  test("shows a focus indicator on every stop", async ({ page }) => {
    await page.goto("/");

    const unmarked = (await tabWalkOfPage(page))
      .filter((stop) => stop.outlineStyle === "none"
        || stop.outlineStyle === "hidden"
        || stop.outlineWidth < MIN_OUTLINE_WIDTH);

    expect(unmarked.map((stop) => `${stop.label} (${stop.outlineWidth}px ${stop.outlineStyle})`))
      .toEqual([]);
  });
});
