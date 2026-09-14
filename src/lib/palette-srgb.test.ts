// src/lib/palette-srgb.test.ts
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { PALETTE_SRGB, THEME_COLOR_SRGB } from "./palette-srgb";

/**
 * Parity between the sRGB mirror and the real palette.
 *
 * This test does NOT hold a second copy of the hexes: it parses src/app/globals.css, resolves
 * the dial → layer 1 → layer 2 chain exactly as the browser would, converts the resulting
 * oklch to sRGB with the same gamut mapping as scripts/check-contrast.ts, and compares.
 * A mirror that repeated the values by hand could drift from the CSS without anyone noticing,
 * which is the only failure this file exists to catch (§6.5.3, §11.4.3).
 */

type Family = "brand" | "neutral" | "danger";
type ThemeName = "light" | "dark";
type LinearRgb = readonly [ number, number, number ];

/* -- oklch -> sRGB, with gamut mapping by chroma reduction --------------------------------- */

function oklabToLinearSrgb (lightness: number, a: number, b: number): LinearRgb {
  const l_ = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = lightness - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

function inGamut (rgb: LinearRgb): boolean {
  return rgb.every((channel) => channel >= -1e-4 && channel <= 1 + 1e-4);
}

function gamma (channel: number): number {
  return channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055;
}

function oklchToHex (lightness: number, chroma: number, hue: number): string {
  const radians = (hue * Math.PI) / 180;
  let c = chroma;
  if (!inGamut(oklabToLinearSrgb(lightness, c * Math.cos(radians), c * Math.sin(radians)))) {
    let low = 0;
    let high = chroma;
    for (let i = 0; i < 40; i++) {
      const mid = (low + high) / 2;
      const rgb = oklabToLinearSrgb(lightness, mid * Math.cos(radians), mid * Math.sin(radians));
      if (inGamut(rgb)) low = mid;
      else high = mid;
    }
    c = low;
  }
  const raw = oklabToLinearSrgb(lightness, c * Math.cos(radians), c * Math.sin(radians));
  const clamp = (channel: number | undefined): number => Math.min(1, Math.max(0, channel ?? 0));
  const linear: LinearRgb = [ clamp(raw[ 0 ]), clamp(raw[ 1 ]), clamp(raw[ 2 ]) ];
  return "#" + linear
    .map((channel) => Math.round(gamma(channel) * 255).toString(16).padStart(2, "0"))
    .join("");
}

/* -- parsing of globals.css ---------------------------------------------------------------- */

const CSS = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function group (match: RegExpMatchArray, index: number): string | undefined {
  const value: string | undefined = match[ index ];
  return value;
}

function dial (name: string): number {
  const match = CSS.match(new RegExp(`--${name}\\s*:\\s*([0-9.]+)\\s*;`));
  const raw = match === null ? undefined : group(match, 1);
  if (raw === undefined) throw new Error(`Falta --${name} en globals.css`);
  return Number(raw);
}

// Module constants: @stylistic/wrap-regex demands parentheses around a regex literal used as
// the object of a member expression, and extracting them reads better than wrapping in place.
const NEUTRAL_FOLLOWS_BRAND = /--neutral-h\s*:\s*var\(--brand-h\)/;
const PRIMITIVE = /--(brand|neutral|danger)-(\d+)\s*:\s*oklch\(\s*([0-9.]+)\s+(?:calc\(\s*([0-9.]+)\s*\*\s*var\(--(?:brand|neutral)-c\)\s*\)|([0-9.]+))\s+(?:var\(--(?:brand|neutral)-h\)|([0-9.]+))\s*\)\s*;/g;
const DECLARATION = /--([a-z0-9-]+)\s*:\s*var\(--([a-z0-9-]+)\)\s*;/g;
const IS_PRIMITIVE = /^(?:brand|neutral|danger)-\d+$/;

const brandHue = dial("brand-h");
const neutralHue = NEUTRAL_FOLLOWS_BRAND.test(CSS) ? brandHue : dial("neutral-h");

// The hue of --danger-* is written literally in the CSS, so that entry is never consulted.
const HUES: Record<Family, number> = { brand: brandHue, neutral: neutralHue, danger: 27 };
const CHROMA: Record<Family, number> = { brand: dial("brand-c"), neutral: dial("neutral-c"), danger: 1 };

const primitives = new Map<string, string>();
for (const match of CSS.matchAll(PRIMITIVE)) {
  const family = group(match, 1);
  const step = group(match, 2);
  const lightness = group(match, 3);
  const scaledChroma = group(match, 4);
  const literalChroma = group(match, 5);
  const literalHue = group(match, 6);
  if (family !== "brand" && family !== "neutral" && family !== "danger") continue;
  if (step === undefined || lightness === undefined) continue;
  const chroma = scaledChroma !== undefined
    ? Number(scaledChroma) * CHROMA[ family ]
    : Number(literalChroma ?? 0);
  const hue = literalHue !== undefined ? Number(literalHue) : HUES[ family ];
  primitives.set(`${family}-${step}`, oklchToHex(Number(lightness), chroma, hue));
}

function semanticMap (blockRegex: RegExp): Map<string, string> {
  const out = new Map<string, string>();
  for (const block of CSS.matchAll(blockRegex)) {
    const body = group(block, 1);
    if (body === undefined) continue;
    for (const match of body.matchAll(DECLARATION)) {
      const token = group(match, 1);
      const target = group(match, 2);
      if (token === undefined || target === undefined) continue;
      out.set(token, target);
    }
  }
  return out;
}

const LIGHT = semanticMap(/:root\s*\{([\s\S]*?)\n\}/g);
const DARK = new Map([ ...LIGHT, ...semanticMap(/\n\.dark\s*\{([\s\S]*?)\n\}/g) ]);

/**
 * Follows --token -> var(--other) until it lands on a layer 1 primitive, so an alias of an
 * alias (--theme-color: var(--background) -> var(--neutral-50)) resolves like in the browser.
 */
function hexOf (theme: ThemeName, token: string): string {
  const map = theme === "light" ? LIGHT : DARK;
  let current = token;
  for (let hop = 0; hop < 8; hop++) {
    const target = map.get(current);
    if (target === undefined) {
      throw new Error(`[${theme}] --${current} no está mapeado en globals.css`);
    }
    if (IS_PRIMITIVE.test(target)) {
      const hex = primitives.get(target);
      if (hex === undefined) throw new Error(`[${theme}] la primitiva --${target} no existe`);
      return hex;
    }
    current = target;
  }
  throw new Error(`[${theme}] --${token} no resuelve a una primitiva en 8 saltos`);
}

/** `primaryForeground` -> `primary-foreground`: the CSS token name, never hand-maintained. */
function cssToken (key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

const THEMES: readonly ThemeName[] = [ "light", "dark" ];

/* -- the tests ----------------------------------------------------------------------------- */

describe("palette-srgb parity with globals.css", () => {
  it("actually parsed the palette out of globals.css", () => {
    // Guards against the real failure mode of a parsing test: a regex that stops matching,
    // finds nothing, and turns every assertion below into a vacuous pass.
    expect(primitives.size).toBeGreaterThanOrEqual(26);
    expect(LIGHT.size).toBeGreaterThanOrEqual(20);
    expect(DARK.size).toBeGreaterThanOrEqual(20);
  });

  for (const theme of THEMES) {
    describe(theme, () => {
      for (const [ key, hex ] of Object.entries(PALETTE_SRGB[ theme ])) {
        it(`PALETTE_SRGB.${theme}.${key} matches --${cssToken(key)}`, () => {
          expect(hex).toBe(hexOf(theme, cssToken(key)));
        });
      }
    });
  }

  // --theme-color is an alias of --background in both blocks (§6.12). Anchoring it here is
  // what keeps <meta name="theme-color"> and the page background from drifting apart.
  for (const theme of THEMES) {
    it(`THEME_COLOR_SRGB.${theme} matches --theme-color in ${theme}`, () => {
      expect(THEME_COLOR_SRGB[ theme ]).toBe(hexOf(theme, "theme-color"));
    });
  }
});
