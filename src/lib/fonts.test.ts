// src/lib/fonts.test.ts
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Guards over the font files that ship with the repo. Every assertion reads the real bytes on
 * disk, never a constant.
 *
 * src/lib/fonts.ts is not imported: `next/font/local` is a build-time transform and throws
 * outside the Next compiler, so the paths below are spelled out a second time.
 *
 * URLs resolve against this module, not against process.cwd(), so the test does not depend on
 * where vitest is invoked from.
 */
const FONT_DIR = new URL("./assets/fonts/", import.meta.url);

// The only file served to the browser, via next/font/local.
const WOFF2 = new URL("Montserrat-Variable-latin.woff2", FONT_DIR);
// Never served. Read as a buffer by the OG image renderer, which cannot parse WOFF2.
const TTF = new URL("Montserrat-Variable.ttf", FONT_DIR);
// SIL OFL 1.1 requires the license text to be distributed with the font files.
const LICENSE = new URL("OFL.txt", FONT_DIR);

// The files that form the wiring chain, read as text and never imported: next/font/local is a
// build-time transform and the shells are TSX server components, neither of which loads under
// Vitest.
const FONTS_TS = new URL("fonts.ts", new URL("./", import.meta.url));
const GLOBALS_CSS = new URL("../app/globals.css", import.meta.url);

// Scanned as a directory rather than as a list: the middle link of the chain is not one known
// file. src/app/layout.tsx is a layout of passage that renders no shell; the shells live in the
// localized layout and in src/app/not-found.tsx.
const APP_DIR = fileURLToPath(new URL("../app/", import.meta.url));
const ROOT_LAYOUT_TSX = new URL("../app/layout.tsx", import.meta.url);

// The two files allowed to render a document shell, relative to src/app/, sorted. A shell
// anywhere else fails the assertion below.
const DOCUMENT_SHELLS = [ "[locale]/layout.tsx", "not-found.tsx" ];

// Hard ceiling, in bytes, for the font file served to the browser.
const FONT_BUDGET_BYTES = 110_000;
// Tighter ceiling, in bytes: anything past this is no longer the latin subset alone.
const LATIN_SUBSET_CEILING_BYTES = 60_000;

// First four bytes of each format, per the WOFF2 and OpenType specs. A .ttf renamed to .woff2
// is rejected by browsers, and these catch it.
const WOFF2_SIGNATURE = "wOF2";
const TRUETYPE_SIGNATURE = 0x00010000;

describe("web fonts", () => {
  it("serves a real WOFF2 for Montserrat", async () => {
    const bytes = await readFile(WOFF2);
    expect(bytes.subarray(0, 4).toString("latin1")).toBe(WOFF2_SIGNATURE);
  });

  it("keeps Montserrat-Variable-latin.woff2 under the Lighthouse font budget", async () => {
    const { byteLength } = await readFile(WOFF2);
    expect(byteLength).toBeGreaterThan(0);
    expect(byteLength).toBeLessThan(FONT_BUDGET_BYTES);
  });

  it("keeps the served file down to the latin subset", async () => {
    const { byteLength } = await readFile(WOFF2);
    expect(byteLength).toBeLessThan(LATIN_SUBSET_CEILING_BYTES);
  });

  it("keeps the TTF that satori needs, since it cannot read WOFF2", async () => {
    const bytes = await readFile(TTF);
    expect(bytes.readUInt32BE(0)).toBe(TRUETYPE_SIGNATURE);
  });

  it("ships the SIL OFL 1.1 text next to the font files", async () => {
    const license = await readFile(LICENSE, "utf8");
    expect(license).toContain("SIL OPEN FONT LICENSE Version 1.1");
    expect(license).toContain("Montserrat");
  });
});

/**
 * The chain that puts Montserrat on the screen has three links, and none of them fails loudly
 * when it breaks:
 *
 *   src/lib/fonts.ts       declares  the CSS variable name
 *   every document shell   imports `sans` and puts `sans.variable` on the root element
 *   src/app/globals.css    consumes  --font-sans: var(--font-montserrat, …)
 *
 * Break the middle link and next/font/local never runs: no @font-face, no .woff2 emitted, the
 * variable declared nowhere, and the site renders in the browser default while the build stays
 * green. Rename the variable on one side only and the outcome is the same.
 *
 * These tests read the names out of fonts.ts rather than hardcoding them, and find the middle
 * link by walking src/app/ for every .tsx that opens a root element, comparing the result
 * against DOCUMENT_SHELLS and requiring each shell to import `sans` and carry `sans.variable`
 * in the class of that element.
 */
describe("font wiring", () => {
  const DECLARED_VARIABLE = /\bvariable:\s*"(--[a-z0-9-]+)"/;
  const FONT_SANS_VALUE = /--font-sans:\s*([^;]+);/;
  const SANS_IMPORT = /import\s*\{[^}]*\bsans\b[^}]*\}\s*from\s*"@\/lib\/fonts"/;
  // `\s` and not `[^>]*`: a lazier pattern also matches a bare "<html>" written in prose,
  // which is not an opening tag.
  const HTML_TAG = /<html\s[^>]*>/;
  const DECLARATIONS = /^[ \t]*(--font-[a-z0-9-]+)\s*:/gm;
  const REFERENCES = /var\(\s*(--font-[a-z0-9-]+)/g;

  async function fontVariableName (): Promise<string> {
    const source = await readFile(FONTS_TS, "utf8");
    const captured = DECLARED_VARIABLE.exec(source)?.[ 1 ];
    if (captured === undefined) throw new Error("src/lib/fonts.ts no declara ninguna `variable:`");
    return captured;
  }

  // Matches a reference to exactly `name`. The lookahead rules out a prefix match: without it
  // "var(--font-mont" would also match inside "var(--font-montserrat".
  function reference (name: string, tail: string): RegExp {
    return new RegExp(`var\\(\\s*${name}(?![a-z0-9-])${tail}`);
  }

  it("has globals.css consume exactly the CSS variable fonts.ts declares", async () => {
    const name = await fontVariableName();
    const css = await readFile(GLOBALS_CSS, "utf8");
    const value = FONT_SANS_VALUE.exec(css)?.[ 1 ];
    if (value === undefined) throw new Error("globals.css no declara --font-sans");
    expect(value).toMatch(reference(name, ""));
  });

  it("keeps a fallback inside that var(), so a broken chain degrades to the system stack", async () => {
    const name = await fontVariableName();
    const css = await readFile(GLOBALS_CSS, "utf8");
    // Without the second argument, an undefined --font-montserrat invalidates the whole
    // --font-sans value, reserve list included, and <body> inherits the initial font-family,
    // which is a serif in every browser. The comma is what this asserts.
    expect(css).toMatch(reference(name, "\\s*,"));
  });

  it("leaves no --font-* reference in globals.css that nothing declares", async () => {
    const name = await fontVariableName();
    const css = await readFile(GLOBALS_CSS, "utf8");
    const declared = new Set([ name, ...[ ...css.matchAll(DECLARATIONS) ].map(([ , id ]) => id) ]);
    const referenced = [ ...css.matchAll(REFERENCES) ].map(([ , id ]) => id);
    expect(referenced.length).toBeGreaterThan(0);
    expect(referenced.filter((id) => !declared.has(id))).toEqual([]);
  });

  /** Every .tsx under src/app/ that opens a root element, relative to src/app/ and sorted. */
  async function documentShells (): Promise<string[]> {
    const entries = await readdir(APP_DIR, { recursive: true });
    const shells: string[] = [];

    for (const entry of entries) {
      if (!entry.endsWith(".tsx")) continue;
      const source = await readFile(join(APP_DIR, entry), "utf8");
      if (HTML_TAG.test(source)) shells.push(entry.replaceAll("\\", "/"));
    }

    return shells.sort();
  }

  it("renders a document shell in exactly the files that are supposed to", async () => {
    expect(await documentShells()).toEqual(DOCUMENT_SHELLS);
  });

  it("has every document shell import `sans` and put its class on the root element", async () => {
    const shells = await documentShells();
    expect(shells.length).toBeGreaterThan(0);

    for (const shell of shells) {
      const source = await readFile(join(APP_DIR, shell), "utf8");
      expect(source, `${shell} no importa \`sans\` desde @/lib/fonts`).toMatch(SANS_IMPORT);

      const htmlTag = HTML_TAG.exec(source)?.[ 0 ];
      if (htmlTag === undefined) throw new Error(`${shell} ya no renderiza la cáscara`);
      // Two assertions and not one: the class has to be on the root element, which is the only
      // place next/font declares --font-montserrat. A `sans.variable` anywhere else in the file
      // would satisfy a bare substring check and leave the variable undeclared.
      expect(htmlTag, `${shell}: la cáscara no lleva className`).toContain("className=");
      expect(htmlTag, `${shell}: la cáscara no lleva sans.variable`).toContain("sans.variable");
    }
  });

  it("keeps src/app/layout.tsx a layout of passage, with no shell of its own", async () => {
    // The pass-through layout wraps the localized one, so a shell here would nest a second root
    // element inside the first.
    const layout = await readFile(ROOT_LAYOUT_TSX, "utf8");
    expect(layout).not.toMatch(HTML_TAG);
  });

  it("never reaches for the network font loader", async () => {
    // Assembled from parts so that this file is not itself a hit when src/ is grepped for the
    // import path.
    const NETWORK_LOADER = [ "next", "font", "google" ].join("/");
    const source = await readFile(FONTS_TS, "utf8");
    expect(source).toContain(`from "next/font/local"`);
    expect(source).not.toContain(NETWORK_LOADER);
  });
});
