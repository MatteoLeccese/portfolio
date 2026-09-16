// tests/e2e/cookies.spec.ts
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { COOKIE_REGISTRY } from "@/domains/core/config/cookies";
import { serializeThemeCookie, THEME_COOKIE_NAME } from "@/lib/theme";

/**
 * What a real browser ends up storing for this site, checked against the policy published
 * on /cookies.
 *
 * Every test starts from an empty jar: Playwright gives each one its own browser context.
 */

/** One cookie as BrowserContext.cookies() reports it. */
type StoredCookie = Awaited<ReturnType<BrowserContext[ "cookies" ]>>[ number ];

/** The attributes a Set-Cookie-shaped string declares. */
interface DeclaredCookie {
  name: string;
  value: string;
  path: string;
  maxAgeSeconds: number;
  sameSite: string;
  httpOnly: boolean;
  secure: boolean;
}

/** The six pages the site publishes. */
const PAGES = [ "/", "/es", "/privacy", "/es/privacy", "/cookies", "/es/cookies" ] as const;

/** The cookie names the policy publishes, in the order the table renders them. */
const PUBLISHED_NAMES = COOKIE_REGISTRY.map((entry) => entry.name);

/** How far the stored expiry may sit from the declared Max-Age, in seconds. */
const EXPIRY_TOLERANCE_SECONDS = 120;

/** Host the browser files the cookies under. */
const COOKIE_DOMAIN = "127.0.0.1";

/** Reads the attributes out of the string serializeThemeCookie() produces. */
function declaredCookie (serialized: string): DeclaredCookie {
  const [ pair = "", ...rest ] = serialized.split(";").map((part) => part.trim());
  const separator = pair.indexOf("=");
  const attributes = new Map<string, string>();

  for (const attribute of rest) {
    const index = attribute.indexOf("=");
    const key = index === -1 ? attribute : attribute.slice(0, index);

    attributes.set(key.toLowerCase(), index === -1 ? "" : attribute.slice(index + 1));
  }

  return {
    name: pair.slice(0, separator),
    value: pair.slice(separator + 1),
    path: attributes.get("path") ?? "",
    maxAgeSeconds: Number(attributes.get("max-age") ?? "0"),
    sameSite: attributes.get("samesite") ?? "",
    httpOnly: attributes.has("httponly"),
    secure: attributes.has("secure"),
  };
}

/** The only cookie in the jar. Fails the test when the jar holds any other number. */
function onlyCookie (jar: readonly StoredCookie[]): StoredCookie {
  expect(jar.map((cookie) => cookie.name)).toHaveLength(1);

  const [ cookie ] = jar;

  if (cookie === undefined) throw new Error("the cookie jar is empty");

  return cookie;
}

/** The name of every cookie in the jar. */
async function cookieNames (context: BrowserContext): Promise<string[]> {
  return (await context.cookies()).map((cookie) => cookie.name);
}

/** Resolves once html[data-motion] has left "on", the value the inline boot script writes. */
async function waitForMotionSettled (page: Page): Promise<void> {
  await page.waitForFunction(() => document.documentElement.dataset.motion !== "on");
}

/** Resolves once the client bundle has promoted html[data-motion] to "ready". */
async function waitForHydration (page: Page): Promise<void> {
  await expect(page.locator("html")).toHaveAttribute("data-motion", "ready");
}

/** Presses the theme switch and waits for `expected` to reach the root element. */
async function pressToggle (page: Page, expected: "light" | "dark"): Promise<void> {
  await page.getByTestId("theme-toggle").click();
  await expect(page.locator("html.dark")).toHaveCount(expected === "dark" ? 1 : 0);
}

test.describe("a visit that presses nothing", () => {
  for (const path of PAGES) {
    test(`leaves the jar empty on ${path}`, async ({ context, page }) => {
      const response = await page.goto(path);

      if (response === null) throw new Error(`no response for ${path}`);

      expect(response.status()).toBe(200);
      expect(await response.headerValue("set-cookie")).toBeNull();

      await waitForMotionSettled(page);

      expect(await context.cookies()).toEqual([]);
    });
  }
});

test.describe("the theme switch", () => {
  test("stores exactly one cookie, with the attributes the serializer declares", async ({
    context,
    page,
  }) => {
    await page.goto("/");
    await waitForHydration(page);

    const pressedAt = Date.now() / 1000;

    await pressToggle(page, "dark");

    const stored = onlyCookie(await context.cookies());
    const declared = declaredCookie(serializeThemeCookie("dark", false));

    expect(stored.name).toBe(declared.name);
    expect(stored.value).toBe(declared.value);
    expect(stored.path).toBe(declared.path);
    expect(stored.sameSite).toBe(declared.sameSite);
    expect(stored.secure).toBe(declared.secure);
    expect(stored.httpOnly).toBe(declared.httpOnly);
    expect(stored.domain).toBe(COOKIE_DOMAIN);
    expect(stored.expires)
      .toBeGreaterThan(pressedAt + declared.maxAgeSeconds - EXPIRY_TOLERANCE_SECONDS);
    expect(stored.expires)
      .toBeLessThan(Date.now() / 1000 + declared.maxAgeSeconds + EXPIRY_TOLERANCE_SECONDS);
  });

  test("stores it where document.cookie can read it back", async ({ context, page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await pressToggle(page, "dark");

    expect(onlyCookie(await context.cookies()).httpOnly).toBe(false);
    expect(await page.evaluate(() => document.cookie)).toContain(`${THEME_COOKIE_NAME}=dark`);
  });

  test("writes one cookie per press, never a second one", async ({ context, page }) => {
    await page.goto("/");
    await waitForHydration(page);

    await pressToggle(page, "dark");
    expect(onlyCookie(await context.cookies()).value).toBe("dark");

    await pressToggle(page, "light");
    expect(onlyCookie(await context.cookies()).value).toBe("light");
  });
});

test.describe("the stored theme", () => {
  test("survives a reload, and the page comes back dark", async ({ context, page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await pressToggle(page, "dark");

    await page.reload();

    await expect(page.locator("html.dark")).toHaveCount(1);

    const stored = onlyCookie(await context.cookies());

    expect(stored.name).toBe(THEME_COOKIE_NAME);
    expect(stored.value).toBe("dark");
  });
});

test.describe("everything else the site does", () => {
  test("adds no cookie of its own, next-intl included", async ({ context, page }) => {
    await page.goto("/");
    await waitForHydration(page);

    await page.locator(`[data-testid=locale-switcher] a[hreflang=es]`).click();
    await expect(page).toHaveURL("/es");
    expect(await context.cookies()).toEqual([]);

    await waitForHydration(page);
    await pressToggle(page, "dark");
    expect(await cookieNames(context)).toEqual([ THEME_COOKIE_NAME ]);

    await page.locator(`[data-testid=locale-switcher] a[hreflang=en]`).click();
    await expect(page).toHaveURL("/");
    expect(await cookieNames(context)).toEqual([ THEME_COOKIE_NAME ]);

    for (const path of PAGES) {
      await page.goto(path);
      await waitForMotionSettled(page);

      expect(await cookieNames(context), `after visiting ${path}`)
        .toEqual([ THEME_COOKIE_NAME ]);
    }

    expect(await cookieNames(context)).not.toContain("NEXT_LOCALE");
  });
});

test.describe("the table on /cookies", () => {
  test("lists the registry, and the registry is what the browser holds", async ({
    context,
    page,
  }) => {
    await page.goto("/cookies");

    const published = await page.locator("tbody tr th[scope=row]").allTextContents();

    expect(published).toEqual(PUBLISHED_NAMES);

    await page.goto("/");
    await waitForHydration(page);
    await pressToggle(page, "dark");

    expect(await cookieNames(context)).toEqual(published);
  });
});
