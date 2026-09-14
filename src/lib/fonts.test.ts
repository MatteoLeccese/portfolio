// src/lib/fonts.test.ts
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Guards over the font files that ship with the repo (§11). Everything here reads the real
 * bytes on disk — never a constant — so swapping the .woff2 for an unsubsetted one, renaming a
 * file out from under src/lib/fonts.ts or dropping the license fails here and not in a
 * Lighthouse run three weeks later.
 *
 * src/lib/fonts.ts itself is NOT imported: `next/font/local` is a build-time transform, it
 * throws outside the Next compiler, so the paths below are duplicated on purpose. That is the
 * only duplication in the file and it is what makes the test meaningful — if the two ever drift
 * apart, the site loses its font.
 *
 * URLs are resolved against this module, not against process.cwd(), so the test does not depend
 * on where vitest is invoked from.
 */
const FONT_DIR = new URL("./assets/fonts/", import.meta.url);

// The only file served to the browser, via next/font/local.
const WOFF2 = new URL("Montserrat-Variable-latin.woff2", FONT_DIR);
// Never served: satori (next/og) cannot parse WOFF2 and needs a TTF buffer (§11.4).
const TTF = new URL("Montserrat-Variable.ttf", FONT_DIR);
// SIL OFL 1.1 requires the license text to be distributed with the font files.
const LICENSE = new URL("OFL.txt", FONT_DIR);

// The files that form the wiring chain. They are read as TEXT, never imported:
// next/font/local is a build-time transform and the shells are TSX server components,
// neither of which loads under Vitest. Grepping the source is the only way to assert the chain
// from a unit test, and it is worth it — see the "font wiring" block at the bottom.
const FONTS_TS = new URL("fonts.ts", new URL("./", import.meta.url));
const GLOBALS_CSS = new URL("../app/globals.css", import.meta.url);

// Scanned as a directory and not as a list: the middle link of the chain is no longer one
// known file. Phase 2 (§14.6) moved the document shell out of src/app/layout.tsx — which is
// now a layout of passage that renders no shell — into the localized layout, and src/app/
// not-found.tsx has a second one of its own. Whoever adds a third has to be caught by this
// test, not by a visitor reading the site in Times New Roman.
const APP_DIR = fileURLToPath(new URL("../app/", import.meta.url));
const ROOT_LAYOUT_TSX = new URL("../app/layout.tsx", import.meta.url);

// The two files allowed to render a document shell, relative to src/app/, sorted. This list
// is a decision, not a cache: a new shell fails the assertion below on purpose, so that the
// person adding it has to state that it is intentional AND wire the font into it.
const DOCUMENT_SHELLS = [ "[locale]/layout.tsx", "not-found.tsx" ];

// The budget stated by §6.8.2 step 5, by §11 and by the §16 checklist. It is the hard ceiling.
const FONT_BUDGET_BYTES = 110_000;
// Tighter tripwire: the committed latin subset is 37 956 B. Anything past this is no longer a
// latin subset (latin-ext, cyrillic or the full family slipped in), which would still pass the
// budget above while quietly doubling what every visitor downloads.
const LATIN_SUBSET_CEILING_BYTES = 60_000;

// First four bytes of the file format, per the WOFF2 and OpenType specs. Catches the classic
// accident of renaming a .ttf to .woff2: browsers reject it and every page loses its font.
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
 * The chain that actually puts Montserrat on the screen has three links, written at different
 * times by different hands, and NONE of them fails loudly when it breaks:
 *
 *   src/lib/fonts.ts       declares  variable: "--font-montserrat"
 *   every document shell   imports `sans` and puts `sans.variable` on the root element
 *   src/app/globals.css    consumes  --font-sans: var(--font-montserrat, …)
 *
 * Drop the middle link and next/font/local never even runs: no @font-face, no .woff2 in .next,
 * --font-montserrat declared nowhere, and the site renders in the browser default. Rename the
 * variable on one side only and you get the same silent outcome. `npm run build` stays green
 * through both. This block is the guard, and it reads the names out of fonts.ts instead of
 * hardcoding them, so it survives the next change of typeface and still catches the drift.
 *
 * The middle link is checked by DISCOVERY, not by pointing at a file: src/app/ is walked, every
 * .tsx that opens a root element is collected, the set is compared against DOCUMENT_SHELLS, and
 * each one of them is then required to import `sans` and to carry `sans.variable` in the class
 * of that element. Pointing at a single path is what made this test lie once already — it kept
 * asserting over src/app/layout.tsx after the shell had moved somewhere else, and passed.
 */
describe("font wiring", () => {
  const DECLARED_VARIABLE = /\bvariable:\s*"(--[a-z0-9-]+)"/;
  const FONT_SANS_VALUE = /--font-sans:\s*([^;]+);/;
  const SANS_IMPORT = /import\s*\{[^}]*\bsans\b[^}]*\}\s*from\s*"@\/lib\/fonts"/;
  // `\s` and not `[^>]*` straight away: the prose above RootLayout writes a bare "<html>",
  // and a lazier pattern matches that comment instead of the real opening tag.
  const HTML_TAG = /<html\s[^>]*>/;
  const DECLARATIONS = /^[ \t]*(--font-[a-z0-9-]+)\s*:/gm;
  const REFERENCES = /var\(\s*(--font-[a-z0-9-]+)/g;

  async function fontVariableName (): Promise<string> {
    const source = await readFile(FONTS_TS, "utf8");
    const captured = DECLARED_VARIABLE.exec(source)?.[ 1 ];
    if (captured === undefined) throw new Error("src/lib/fonts.ts no declara ninguna `variable:`");
    return captured;
  }

  // A plain substring check would pass on a PREFIX: rename the variable to --font-mont and
  // "var(--font-mont" still occurs inside "var(--font-montserrat". The lookahead is what makes
  // the two assertions below exact instead of merely suggestive.
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
    // Without the second argument, an undefined --font-montserrat invalidates the WHOLE
    // --font-sans value (reserve list included) and <body> inherits the initial font-family,
    // which is a serif in every browser. The comma is the entire point of this assertion.
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
      // Two assertions and not one: the class has to be ON the root element, which is the only
      // place next/font declares --font-montserrat. A `sans.variable` sitting anywhere else in
      // the file — an unused import, a comment, a <body> — would satisfy a bare substring check
      // and leave the variable undeclared.
      expect(htmlTag, `${shell}: la cáscara no lleva className`).toContain("className=");
      expect(htmlTag, `${shell}: la cáscara no lleva sans.variable`).toContain("sans.variable");
    }
  });

  it("keeps src/app/layout.tsx a layout of passage, with no shell of its own", async () => {
    // If this ever fails, the project has two roots: the pass-through layout wraps the localized
    // one, so a shell here would nest a second root element inside the first.
    const layout = await readFile(ROOT_LAYOUT_TSX, "utf8");
    expect(layout).not.toMatch(HTML_TAG);
  });

  it("never reaches for the network font loader", async () => {
    // Assembled from parts on purpose. The repo's own audit is `grep -rn <that path> src/`, and
    // a test that spelled it out verbatim would be the single hit that makes the grep useless.
    const NETWORK_LOADER = [ "next", "font", "google" ].join("/");
    const source = await readFile(FONTS_TS, "utf8");
    expect(source).toContain(`from "next/font/local"`);
    expect(source).not.toContain(NETWORK_LOADER);
  });
});
