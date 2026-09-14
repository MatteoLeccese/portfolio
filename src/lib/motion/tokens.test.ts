// src/lib/motion/tokens.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DURATION_MS,
  EASE_ENTRANCE,
  EASE_STANDARD,
  STAGGER_MAX_ITEMS,
  toCssBezier,
} from "./tokens";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/**
 * globals.css with every comment stripped.
 *
 * The guards below scan this, not the raw file: prose that quotes a forbidden declaration
 * inside a CSS comment would otherwise be reported as the declaration itself. Token values are
 * still read from the full file, where there is no such ambiguity.
 */
const cssCode = css.replace(/\/\*[\s\S]*?\*\//g, "");

// Extracted as module constants: @stylistic/wrap-regex demands parentheses around a regex
// literal used as the object of a member expression.
const STAGGER_CAP = /\[data-stagger\]\s*>\s*\*:nth-child\(n \+ (\d+)\)/;
const LITERAL_DURATION = /transition-duration\s*:\s*[^;]*\d+ms/g;
const LITERAL_SHORTHAND = /transition\s*:\s*[^;]*\d+ms/g;

// Block 7 of globals.css: the only :root that declares --motion-duration-instant. Narrowing
// the read to that block leaves out the local properties of block 10
// (--motion-reveal-index, --motion-stagger-step), which are working variables and not
// catalogue tokens.
const MOTION_ROOT_BLOCK = /:root\s*\{([^}]*--motion-duration-instant[^}]*)\}/;
const MOTION_TOKEN = /--(motion-[a-z-]+)\s*:\s*([^;]+);/g;

// Guards against the global motion reset.
const RESET_ANIMATION_DURATION = /animation-duration\s*:\s*[^;]*!important/;
const RESET_ITERATION_COUNT = /animation-iteration-count\s*:\s*[^;]*!important/;
const RESET_SCROLL_BEHAVIOR = /scroll-behavior\s*:\s*[^;]*!important/;
const REDUCED_MOTION_AT_RULE = /@media\s*\(prefers-reduced-motion\s*:\s*reduce\)\s*\{/g;
const UNIVERSAL_SELECTOR = /(?:^|[\s,{}])\*\s*(?:,|\{)/;

/**
 * The --motion-* tokens that live in CSS alone. A token in globals.css that appears neither
 * here nor in the TypeScript mirror fails the test below.
 */
const CSS_ONLY_TOKENS: readonly string[] = [
  "motion-duration-instant",
  "motion-duration-fast",
  "motion-ease-exit",
  "motion-ease-in-out",
  "motion-distance-xs",
  "motion-distance-sm",
  "motion-distance-md",
  "motion-distance-lg",
  "motion-stagger-tight",
  "motion-stagger-base",
  "motion-stagger-loose",
];

function readCssVar (name: string): string {
  const match = new RegExp(`--${name}\\s*:\\s*([^;]+);`).exec(css);

  if (match === null || match[ 1 ] === undefined) {
    throw new Error(`El token CSS --${name} no existe en globals.css`);
  }

  return match[ 1 ].trim();
}

/** The --motion-* tokens declared in block 7, with their values. */
function declaredTokens (): Map<string, string> {
  const block = MOTION_ROOT_BLOCK.exec(cssCode);

  if (block === null || block[ 1 ] === undefined) {
    throw new Error("globals.css no declara el bloque :root de tokens --motion-*");
  }

  const declared = new Map<string, string>();

  MOTION_TOKEN.lastIndex = 0;

  let token = MOTION_TOKEN.exec(block[ 1 ]);

  while (token !== null) {
    const [ , name, value ] = token;

    if (name !== undefined && value !== undefined) {
      declared.set(name, value.trim());
    }

    token = MOTION_TOKEN.exec(block[ 1 ]);
  }

  return declared;
}

/** The TypeScript mirror, expressed in the exact syntax the CSS uses. */
function mirroredTokens (): Map<string, string> {
  const mirror = new Map<string, string>();

  for (const [ token, ms ] of Object.entries(DURATION_MS)) {
    mirror.set(`motion-duration-${token}`, `${ms}ms`);
  }

  mirror.set("motion-ease-standard", toCssBezier(EASE_STANDARD));
  mirror.set("motion-ease-entrance", toCssBezier(EASE_ENTRANCE));

  return mirror;
}

/** The body of each `@media (prefers-reduced-motion: reduce)`, with braces balanced. */
function reducedMotionBlocks (): string[] {
  const blocks: string[] = [];

  REDUCED_MOTION_AT_RULE.lastIndex = 0;

  let opener = REDUCED_MOTION_AT_RULE.exec(cssCode);

  while (opener !== null) {
    const start = REDUCED_MOTION_AT_RULE.lastIndex;
    let index = start;
    let depth = 1;

    while (depth > 0 && index < cssCode.length) {
      const char = cssCode[ index ];

      if (char === "{") {
        depth += 1;
      }

      if (char === "}") {
        depth -= 1;
      }

      index += 1;
    }

    blocks.push(cssCode.slice(start, index - 1));
    opener = REDUCED_MOTION_AT_RULE.exec(cssCode);
  }

  return blocks;
}

describe("motion token parity between CSS and TypeScript", () => {
  it("declares the same durations on both sides", () => {
    for (const [ token, ms ] of Object.entries(DURATION_MS)) {
      expect(readCssVar(`motion-duration-${token}`)).toBe(`${ms}ms`);
    }
  });

  it("declares the same easing curves on both sides", () => {
    expect(readCssVar("motion-ease-standard")).toBe(toCssBezier(EASE_STANDARD));
    expect(readCssVar("motion-ease-entrance")).toBe(toCssBezier(EASE_ENTRANCE));
  });

  it("declares no --motion-* token in CSS that TypeScript does not know about", () => {
    const mirror = mirroredTokens();
    const declared = declaredTokens();

    expect(declared.size).toBeGreaterThan(0);

    for (const [ name, value ] of declared) {
      const expected = mirror.get(name);

      if (expected === undefined) {
        // A new token is either mirrored in tokens.ts or declared CSS-only here.
        expect(CSS_ONLY_TOKENS).toContain(name);
        continue;
      }

      expect(value, `--${name} diverge del espejo de tokens.ts`).toBe(expected);
    }

    // And the other way round: no mirrored token may have disappeared from the CSS.
    for (const name of mirror.keys()) {
      expect([ ...declared.keys() ]).toContain(name);
    }
  });

  it("caps the CSS stagger at STAGGER_MAX_ITEMS", () => {
    const match = STAGGER_CAP.exec(css);

    expect(match).not.toBeNull();
    expect(Number(match?.[ 1 ])).toBe(STAGGER_MAX_ITEMS + 1);
  });

  it("declares no literal transition duration", () => {
    // `transition-delay: 0ms` is allowed: cancelling a delay is not declaring a duration.
    // What is forbidden is a literal duration, in the dedicated property or inside the
    // shorthand.
    expect(cssCode.match(LITERAL_DURATION) ?? []).toEqual([]);
    expect(cssCode.match(LITERAL_SHORTHAND) ?? []).toEqual([]);
  });

  // The title names the property and not the utility: the `no-restricted-syntax` block of
  // eslint.config.mjs vetoes the forbidden string in any Literal under src/**, and a test title
  // is a Literal like any other.
  it("does not use transition: all and does not animate layout properties", () => {
    expect(cssCode).not.toMatch(/transition\s*:\s*all\b/);
    expect(cssCode).not.toMatch(/transition[^;]*\b(height|width|top|left|right|bottom|margin|padding)\b/);
  });
});

describe("reduced motion", () => {
  it("does not reintroduce the global animation reset", () => {
    // `*, *::before, *::after { animation-duration: 0.01ms !important }` would override the
    // per-component overrides and leave feedback with no signal at all.
    expect(cssCode).not.toMatch(RESET_ANIMATION_DURATION);
    expect(cssCode).not.toMatch(RESET_ITERATION_COUNT);
    expect(cssCode).not.toMatch(RESET_SCROLL_BEHAVIOR);
  });

  it("keeps !important and the universal selector out of every reduced-motion block", () => {
    const blocks = reducedMotionBlocks();

    expect(blocks.length).toBeGreaterThan(0);

    for (const block of blocks) {
      expect(block).not.toContain("!important");
      expect(block).not.toMatch(UNIVERSAL_SELECTOR);
    }
  });
});
