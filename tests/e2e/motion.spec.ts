// tests/e2e/motion.spec.ts
import { expect, test, type Page } from "@playwright/test";

/**
 * The reveal system on a phone: the state it puts content in before that content is
 * scrolled to, the state it leaves it in afterwards, what it drops under
 * prefers-reduced-motion, what the page looks like when no script runs at all, and how
 * much layout shift the home accumulates while the whole sequence plays.
 */

/** The phone width this file runs at, narrower than the project's Pixel 7 default. */
const VIEWPORT_WIDTH = 390;
const VIEWPORT_HEIGHT = 844;

test.use({ viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT } });

const HOME = "/";

/** Overlap between two scroll steps, so nothing passes the viewport between frames. */
const SCROLL_OVERLAP = 160;

/** Pause after each scroll step, long enough for the observer callback to run. */
const SCROLL_PAUSE_MS = 200;

/** Upper bound on scroll steps, so a growing document ends the loop instead of hanging. */
const MAX_SCROLL_STEPS = 60;

/** Budget the final poll gives the last stagger delay and its 380 ms transition. */
const REVEAL_TIMEOUT_MS = 20_000;

/** Budget for hydration to promote data-motion, longer than the boot script's 3 s fail-safe. */
const MOTION_TIMEOUT_MS = 15_000;

/** Layout shift the home is allowed to accumulate from load to the end of the page. */
const CLS_BUDGET = 0.02;

/** The h2 of every section below the hero, in render order. */
const SECTION_HEADINGS = [
  "About me",
  "Skills",
  "Experience",
  "Education",
  "Projects",
  "Contact",
];

interface RevealState {
  state: string | null;

  /** False for the bullets the layout drops below the md breakpoint, which have no box. */
  rendered: boolean;
  opacity: number;
  transform: string;
}

interface LayoutShiftReport {
  supported: boolean;
  installed: boolean;
  entries: number;
  total: number;
}

/**
 * Sums every layout-shift entry that no recent input explains. Installed before the
 * document's own scripts run, so it sees the shifts of the first paint too.
 */
const LAYOUT_SHIFT_COLLECTOR = `
  window.__layoutShift = {
    supported: PerformanceObserver.supportedEntryTypes.indexOf("layout-shift") !== -1,
    installed: false,
    entries: 0,
    total: 0,
  };

  try {
    new PerformanceObserver(function (list) {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          window.__layoutShift.entries += 1;
          window.__layoutShift.total += entry.value;
        }
      }
    }).observe({ type: "layout-shift", buffered: true });

    window.__layoutShift.installed = true;
  } catch (error) {
    window.__layoutShift.installed = false;
  }
`;

const MATRIX_2D = /^matrix\(([^)]*)\)$/;
const MATRIX_3D = /^matrix3d\(([^)]*)\)$/;

/** The vertical offset a computed transform applies, in CSS pixels. */
function translateY (transform: string): number {
  const flat = MATRIX_2D.exec(transform)?.[ 1 ];

  if (flat !== undefined) return Number(flat.split(",")[ 5 ]?.trim());

  const cube = MATRIX_3D.exec(transform)?.[ 1 ];

  if (cube !== undefined) return Number(cube.split(",")[ 13 ]?.trim());

  return 0;
}

/** The data-reveal state, the box, the opacity and the transform of every reveal. */
async function readReveals (page: Page): Promise<RevealState[]> {
  return page.evaluate(() => Array.from(document.querySelectorAll("[data-reveal]")).map((node) => {
    const style = getComputedStyle(node);

    return {
      state: node.getAttribute("data-reveal"),
      rendered: style.display !== "none",
      opacity: Number(style.opacity),
      transform: style.transform,
    };
  }));
}

/**
 * Waits until the boot script and the first reveal effect have both run. Reports the
 * attribute it found, so a root stuck at "on", dropped to "off" or never written at all
 * names itself in the failure.
 */
async function waitForMotionReady (page: Page): Promise<void> {
  await expect
    .poll(async () => page.locator("html").getAttribute("data-motion"), { timeout: MOTION_TIMEOUT_MS })
    .toBe("ready");
}

/** Scrolls from the top of the document to its end, one viewport at a time. */
async function scrollToEnd (page: Page): Promise<void> {
  const step = VIEWPORT_HEIGHT - SCROLL_OVERLAP;

  for (let index = 0; index < MAX_SCROLL_STEPS; index += 1) {
    const atEnd = await page.evaluate((top) => {
      window.scrollTo(0, top);

      return top + window.innerHeight >= document.documentElement.scrollHeight;
    }, index * step);

    await page.waitForTimeout(SCROLL_PAUSE_MS);

    if (atEnd) return;
  }

  throw new Error(`The document did not end within ${MAX_SCROLL_STEPS} scroll steps.`);
}

/** How many reveals are still faded or still displaced. */
async function countUnfinished (page: Page): Promise<number> {
  const reveals = await readReveals(page);

  return reveals.filter((reveal) => reveal.opacity < 1 || reveal.transform !== "none").length;
}

test.describe("reveal on scroll", () => {
  test("hides and offsets the content that has not been scrolled to", async ({ page }) => {
    await page.goto(HOME);
    await waitForMotionReady(page);

    const reveals = await readReveals(page);

    expect(reveals.length).toBeGreaterThan(0);

    const hidden = reveals.filter((reveal) => reveal.state === "hidden");

    expect(hidden.length).toBeGreaterThan(0);

    for (const reveal of hidden) {
      expect(reveal.opacity).toBe(0);
    }

    const boxed = hidden.filter((reveal) => reveal.rendered);

    expect(boxed.length).toBeGreaterThan(0);

    for (const reveal of boxed) {
      expect(reveal.transform).not.toBe("none");
      expect(translateY(reveal.transform)).toBeGreaterThan(0);
    }
  });

  test("leaves every reveal fully opaque and back in place", async ({ page }) => {
    await page.goto(HOME);
    await waitForMotionReady(page);

    const before = await readReveals(page);

    expect(before.filter((reveal) => reveal.state === "hidden").length).toBeGreaterThan(0);

    await scrollToEnd(page);

    await expect.poll(async () => countUnfinished(page), { timeout: REVEAL_TIMEOUT_MS }).toBe(0);

    const after = await readReveals(page);

    expect(after.length).toBe(before.length);
    expect(after.filter((reveal) => reveal.state !== "visible")).toEqual([]);
  });
});

test.describe("prefers-reduced-motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("keeps the reveal and drops the movement", async ({ page }) => {
    await page.goto(HOME);
    await waitForMotionReady(page);

    const hidden = (await readReveals(page))
      .filter((reveal) => reveal.state === "hidden" && reveal.rendered);

    expect(hidden.length).toBeGreaterThan(0);

    for (const reveal of hidden) {
      expect(reveal.opacity).toBe(0);
      expect(reveal.transform).toBe("none");
    }

    await scrollToEnd(page);

    await expect.poll(async () => countUnfinished(page), { timeout: REVEAL_TIMEOUT_MS }).toBe(0);

    for (const heading of SECTION_HEADINGS) {
      await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    }
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("renders the whole home readable and nothing at zero opacity", async ({ page }) => {
    await page.goto(HOME);

    expect(await page.locator("html").getAttribute("data-motion")).toBeNull();

    const reveals = await readReveals(page);

    expect(reveals.length).toBeGreaterThan(0);
    expect(reveals.filter((reveal) => reveal.state !== "hidden")).toEqual([]);

    for (const reveal of reveals) {
      expect(reveal.opacity).toBe(1);
      expect(reveal.transform).toBe("none");
    }

    for (const heading of SECTION_HEADINGS) {
      await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    }
  });
});

test("accumulates less than the layout-shift budget on the home", async ({ page }) => {
  await page.addInitScript({ content: LAYOUT_SHIFT_COLLECTOR });
  await page.goto(HOME);
  await waitForMotionReady(page);
  await scrollToEnd(page);

  await expect.poll(async () => countUnfinished(page), { timeout: REVEAL_TIMEOUT_MS }).toBe(0);

  const report = await page.evaluate(() => {
    const holder = window as unknown as { __layoutShift?: LayoutShiftReport; };

    return holder.__layoutShift ?? null;
  });

  expect(report, "the layout-shift collector never ran").not.toBeNull();
  expect(report?.supported, "this browser does not report layout-shift entries").toBe(true);
  expect(report?.installed, "the layout-shift observer was refused").toBe(true);
  expect(
    report?.total ?? Number.POSITIVE_INFINITY,
    `${report?.entries ?? 0} layout-shift entries`,
  ).toBeLessThan(CLS_BUDGET);
});
