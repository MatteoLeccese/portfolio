// src/lib/theme.ts
import { THEME_COLOR_SRGB } from "./palette-srgb";

/** The single place the theme cookie is named. `COOKIE_REGISTRY` imports it from here. */
export const THEME_COOKIE_NAME = "theme";

/** Cookie lifetime in seconds: one year. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const THEMES = [ "light", "dark" ] as const;

export type Theme = (typeof THEMES)[ number ];

/** The theme used when no valid cookie is present. `prefers-color-scheme` is not consulted. */
export const DEFAULT_THEME: Theme = "light";

export function isTheme (value: string | null | undefined): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Source text of the regex that reads the theme cookie, written once and used twice:
 * THEME_INIT_SCRIPT interpolates it into the string the browser parses before the first
 * paint, and themeFromCookieString() compiles it in Node.
 *
 * Both ends are anchored. The leading `(?:^|;\\s*)` means a cookie merely named `mytheme`
 * does not match, and the trailing `(?:;|$)` means a value merely starting with `light` or
 * `dark` does not match either. Inside this template literal `\\s` is what emits `\s`.
 */
const THEME_COOKIE_PATTERN = `(?:^|;\\s*)${THEME_COOKIE_NAME}=(${THEMES.join("|")})(?:;|$)`;

/** The theme a raw value stands for. Anything unexpected becomes DEFAULT_THEME. */
export function resolveTheme (value: string | null | undefined): Theme {
  return isTheme(value) ? value : DEFAULT_THEME;
}

/**
 * Reads the theme out of a `document.cookie`-shaped string ("a=1; theme=dark; b=2").
 * A missing, empty or unrecognised cookie resolves to DEFAULT_THEME, which is the theme the
 * prerendered HTML already carries.
 *
 * This is the testable twin of what THEME_INIT_SCRIPT does inline; both compile the same
 * pattern.
 */
export function themeFromCookieString (cookieString: string | null | undefined): Theme {
  if (typeof cookieString !== "string") return DEFAULT_THEME;

  const value = new RegExp(THEME_COOKIE_PATTERN).exec(cookieString)?.[ 1 ];

  return resolveTheme(value);
}

/**
 * Serialises the theme cookie as `theme=<value>; Path=/; Max-Age=…; SameSite=Lax`, with
 * `Secure` appended when `isSecure` is true. Never HttpOnly: the pre-paint script reads the
 * cookie through document.cookie.
 *
 * @param theme The value to store.
 * @param isSecure Whether the request is over https.
 */
export function serializeThemeCookie (theme: Theme, isSecure: boolean): string {
  const attributes = [
    `${THEME_COOKIE_NAME}=${theme}`,
    "Path=/",
    `Max-Age=${THEME_COOKIE_MAX_AGE}`,
    "SameSite=Lax",
  ];

  if (isSecure) attributes.push("Secure");

  return attributes.join("; ");
}

/**
 * Blocking script for <head>, injected with dangerouslySetInnerHTML. Before the first paint
 * it reads the theme cookie, adds the `dark` class to <html>, sets `color-scheme`, and
 * rewrites the content of <meta name="theme-color">.
 *
 * One minified, dependency-free statement: it blocks document parsing. The try/catch covers a
 * browser that refuses to hand over document.cookie. Every value is interpolated from a
 * constant at build time, colours included, so this module holds no colour literal of its own.
 * theme.test.ts asserts the result contains neither `</script` nor `<!--`.
 */
export const THEME_INIT_SCRIPT = [
  "(function(){try{",
  `var m=document.cookie.match(/${THEME_COOKIE_PATTERN}/);`,
  `var t=m?m[1]:"${DEFAULT_THEME}";`,
  "var r=document.documentElement;",
  `if(t==="dark"){r.classList.add("dark")}`,
  "r.style.colorScheme=t;",
  `var e=document.querySelector('meta[name="theme-color"]');`,
  `if(e){e.setAttribute("content",t==="dark"?"${THEME_COLOR_SRGB.dark}":"${THEME_COLOR_SRGB.light}")}`,
  "}catch(err){}})()",
].join("");
