// src/lib/theme.test.ts
import { describe, expect, it } from "vitest";

import { THEME_COLOR_SRGB } from "./palette-srgb";
import {
  DEFAULT_THEME,
  isTheme,
  resolveTheme,
  serializeThemeCookie,
  THEME_COOKIE_MAX_AGE,
  THEME_COOKIE_NAME,
  THEME_INIT_SCRIPT,
  THEMES,
  themeFromCookieString,
  type Theme,
} from "./theme";

/**
 * Unit tests for the theme cookie and for the pre-paint script.
 *
 * Browser-free: Vitest runs in the `node` environment, and the script is exercised by handing
 * it a stand-in for `document` through the Function constructor. Nothing here covers the
 * absence of a flash of the wrong theme on a slow connection, which only a browser can show.
 *
 * The two behaviours under test are:
 *
 *  1. Anything other than an exact `light` / `dark` cookie value resolves to light, which is
 *     the theme the prerendered HTML already carries.
 *  2. The script the browser parses and the parser this file calls agree on every input.
 */

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

interface CookieCase {
  cookie: string;
  theme: Theme;
  why: string;
}

const COOKIE_CASES: readonly CookieCase[] = [
  { cookie: "theme=dark", theme: "dark", why: "the cookie alone" },
  { cookie: "theme=light", theme: "light", why: "the cookie alone, light" },
  { cookie: "a=1; theme=dark; b=2", theme: "dark", why: "between other cookies" },
  { cookie: "a=1;theme=dark", theme: "dark", why: "no space after the separator" },
  { cookie: "theme=dark; theme=light", theme: "dark", why: "duplicated: the first one wins" },
  { cookie: "", theme: "light", why: "no cookies at all" },
  { cookie: "a=1; b=2", theme: "light", why: "cookies, but not ours" },
  { cookie: "theme=", theme: "light", why: "empty value" },
  { cookie: "theme=Dark", theme: "light", why: "values are case sensitive" },
  { cookie: "theme=auto", theme: "light", why: "a value this site never writes" },
  { cookie: "theme=darkmode", theme: "light", why: "a value that merely starts with dark" },
  { cookie: "theme=light-high-contrast", theme: "light", why: "a longer value starting with light" },
  { cookie: "mytheme=dark", theme: "light", why: "another cookie whose name ends in theme" },
  { cookie: "themes=dark", theme: "light", why: "another cookie whose name starts with theme" },
  { cookie: "notatheme=dark; theme=light", theme: "light", why: "the decoy is not read" },
];

interface ScriptOutcome {

  /** Classes the script added to the stand-in for <html>. */
  classes: string[];

  /** What it left in html.style.colorScheme. Empty string means it never wrote it. */
  colorScheme: string;

  /** The content it wrote into <meta name="theme-color">. */
  themeColor: string;
}

/**
 * Runs THEME_INIT_SCRIPT against the smallest `document` it can work with and reports what it
 * changed.
 *
 * @param cookie The value `document.cookie` returns, or an Error for it to throw, which is
 *   what a browser with cookies disabled does.
 */
function runInitScript (cookie: string | Error): ScriptOutcome {
  const classes: string[] = [];
  let themeColor = "";

  const meta = {
    setAttribute (name: string, value: string): void {
      if (name === "content") themeColor = value;
    },
  };

  const documentStub = {
    get cookie (): string {
      if (cookie instanceof Error) throw cookie;

      return cookie;
    },
    documentElement: {
      classList: {
        add (token: string): void {
          classes.push(token);
        },
      },
      style: { colorScheme: "" },
    },
    querySelector (selector: string): typeof meta | null {
      return selector === `meta[name="theme-color"]` ? meta : null;
    },
  };

  new Function("document", THEME_INIT_SCRIPT)(documentStub);

  return { classes, colorScheme: documentStub.documentElement.style.colorScheme, themeColor };
}

describe("theme vocabulary", () => {
  it("offers exactly two themes and defaults to light", () => {
    expect(THEMES).toEqual([ "light", "dark" ]);
    // Light is the default and prefers-color-scheme is not consulted.
    expect(DEFAULT_THEME).toBe("light");
  });

  it("keeps isTheme in step with THEMES", () => {
    for (const theme of THEMES) expect(isTheme(theme), theme).toBe(true);

    for (const value of [ "", "auto", "system", "Dark", "dark ", "0", null, undefined ]) {
      expect(isTheme(value), String(value)).toBe(false);
    }
  });

  it("resolves anything unexpected to the default, which is light", () => {
    expect(resolveTheme("dark")).toBe("dark");
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("system")).toBe(DEFAULT_THEME);
    expect(resolveTheme("")).toBe(DEFAULT_THEME);
    expect(resolveTheme(null)).toBe(DEFAULT_THEME);
    expect(resolveTheme(undefined)).toBe(DEFAULT_THEME);
  });

  it("names the cookie `theme`, which is the name the policy table declares", () => {
    // COOKIE_REGISTRY imports this constant, and tests/e2e/cookies.spec.ts asserts that the
    // only cookie a real browser ends up with carries exactly this name.
    expect(THEME_COOKIE_NAME).toBe("theme");
  });
});

describe("serializeThemeCookie", () => {
  it("writes the documented cookie attributes, and nothing else", () => {
    expect(serializeThemeCookie("dark", false))
      .toBe("theme=dark; Path=/; Max-Age=31536000; SameSite=Lax");
    expect(serializeThemeCookie("light", false))
      .toBe("theme=light; Path=/; Max-Age=31536000; SameSite=Lax");
  });

  it("adds Secure only over https, so the switch still works on http://localhost", () => {
    expect(serializeThemeCookie("dark", true))
      .toBe("theme=dark; Path=/; Max-Age=31536000; SameSite=Lax; Secure");
    expect(serializeThemeCookie("dark", false)).not.toMatch(/secure/i);
  });

  it("never marks the cookie HttpOnly", () => {
    // HttpOnly would hide the cookie from THEME_INIT_SCRIPT, its only reader: the server never
    // calls cookies(), which would make / and /es dynamic.
    for (const theme of THEMES) {
      for (const isSecure of [ true, false ]) {
        expect(serializeThemeCookie(theme, isSecure), `${theme}/${String(isSecure)}`)
          .not.toMatch(/httponly/i);
      }
    }
  });

  it("keeps the lifetime the cookie policy promises in prose", () => {
    // The published cookie policy states one year, and legal.test.ts asserts the same number
    // from that side.
    expect(THEME_COOKIE_MAX_AGE).toBe(ONE_YEAR_IN_SECONDS);
    expect(serializeThemeCookie("dark", true)).toContain(`Max-Age=${String(ONE_YEAR_IN_SECONDS)}`);
  });

  it("produces a pair the reader can read back", () => {
    // The browser sends back only `name=value`; the attributes never come back, so only the
    // first pair is fed back in.
    for (const theme of THEMES) {
      for (const isSecure of [ true, false ]) {
        const [ pair ] = serializeThemeCookie(theme, isSecure).split("; ");

        expect(themeFromCookieString(pair), `${theme}/${String(isSecure)}`).toBe(theme);
      }
    }
  });
});

describe("themeFromCookieString", () => {
  it("reads the theme, and falls back to light for everything else", () => {
    for (const testCase of COOKIE_CASES) {
      expect(themeFromCookieString(testCase.cookie), `${testCase.why}: ${testCase.cookie}`)
        .toBe(testCase.theme);
    }
  });

  it("treats a missing cookie header as light", () => {
    expect(themeFromCookieString(undefined)).toBe("light");
    expect(themeFromCookieString(null)).toBe("light");
  });
});

describe("THEME_INIT_SCRIPT", () => {
  it("cannot break out of the <script> it is injected into", () => {
    // It reaches the page through dangerouslySetInnerHTML, so neither sequence may appear:
    // either would end the element early and spill the rest of the script out as text.
    expect(THEME_INIT_SCRIPT).not.toMatch(/<\/script/i);
    expect(THEME_INIT_SCRIPT).not.toContain("</");
    expect(THEME_INIT_SCRIPT).not.toContain("<!--");
    expect(THEME_INIT_SCRIPT).not.toContain("-->");
  });

  it("stays a single dependency-free statement that cannot throw", () => {
    // It blocks document parsing, so it is one trivial IIFE with no line breaks.
    expect(THEME_INIT_SCRIPT).not.toContain("\n");
    expect(THEME_INIT_SCRIPT.startsWith("(function(){try{")).toBe(true);
    expect(THEME_INIT_SCRIPT.endsWith("}catch(err){}})()")).toBe(true);
    expect(THEME_INIT_SCRIPT.length).toBeLessThan(512);
  });

  it("reads the theme cookie with document.cookie.match", () => {
    expect(THEME_INIT_SCRIPT).toContain("document.cookie.match");
    expect(THEME_INIT_SCRIPT).toContain(`${THEME_COOKIE_NAME}=`);
  });

  it("holds no colour of its own: both hexes come from palette-srgb", () => {
    const hexes = [ ...new Set(THEME_INIT_SCRIPT.match(/#[0-9a-fA-F]{3,8}/g) ?? []) ].sort();

    expect(hexes).toEqual([ THEME_COLOR_SRGB.dark, THEME_COLOR_SRGB.light ].sort());
  });

  it("applies the dark theme the way the CSS expects", () => {
    const outcome = runInitScript("theme=dark");

    // globals.css declares `@custom-variant dark (&:is(.dark *))`, so it has to be the class
    // `dark` on <html>: not a data attribute, and not on <body>.
    expect(outcome.classes).toEqual([ "dark" ]);
    expect(outcome.colorScheme).toBe("dark");
    expect(outcome.themeColor).toBe(THEME_COLOR_SRGB.dark);
  });

  it("leaves the prerendered light HTML untouched when there is no cookie", () => {
    const outcome = runInitScript("");

    expect(outcome.classes).toEqual([]);
    expect(outcome.colorScheme).toBe("light");
    expect(outcome.themeColor).toBe(THEME_COLOR_SRGB.light);
  });

  it("falls back to light when the cookie carries something unexpected", () => {
    for (const cookie of [ "theme=", "theme=auto", "theme=darkmode", "mytheme=dark" ]) {
      const outcome = runInitScript(cookie);

      expect(outcome.classes, cookie).toEqual([]);
      expect(outcome.colorScheme, cookie).toBe("light");
    }
  });

  it("survives a browser that refuses to hand over document.cookie", () => {
    let outcome: ScriptOutcome | undefined;

    expect(() => {
      outcome = runInitScript(new Error("cookies are disabled"));
    }).not.toThrow();

    // The catch swallows it and the page keeps the light theme it was prerendered with.
    expect(outcome?.classes).toEqual([]);
    expect(outcome?.colorScheme).toBe("");
  });

  it("does not need a <meta name=\"theme-color\"> to be there", () => {
    const classes: string[] = [];
    const documentStub = {
      cookie: "theme=dark",
      documentElement: {
        classList: {
          add (token: string): void {
            classes.push(token);
          },
        },
        style: { colorScheme: "" },
      },
      querySelector (): null {
        return null;
      },
    };

    expect(() => {
      new Function("document", THEME_INIT_SCRIPT)(documentStub);
    }).not.toThrow();
    expect(classes).toEqual([ "dark" ]);
  });

  it("agrees with themeFromCookieString on every case", () => {
    // The script the browser runs before the first paint and the parser the rest of the
    // codebase calls share one regex; this is what proves they agree.
    for (const testCase of COOKIE_CASES) {
      const outcome = runInitScript(testCase.cookie);
      const applied: Theme = outcome.classes.includes("dark") ? "dark" : "light";

      expect(applied, `${testCase.why}: ${testCase.cookie}`)
        .toBe(themeFromCookieString(testCase.cookie));
      expect(outcome.colorScheme, testCase.cookie).toBe(testCase.theme);
    }
  });
});
