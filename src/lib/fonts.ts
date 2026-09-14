// src/lib/fonts.ts
import localFont from "next/font/local";

/**
 * The site's single typeface: Montserrat, variable, latin subset, self-hosted. One family for
 * body copy and headings alike; there is no second display face.
 *
 * Three files live in ./assets/fonts/. Montserrat-Variable-latin.woff2 is the only one served
 * to the browser. Montserrat-Variable.ttf is the full family, never served and not referenced
 * here, read with readFile at build time by the opengraph-image route, whose renderer takes a
 * TTF buffer and cannot parse WOFF2. OFL.txt is the SIL Open Font License 1.1 text, which the
 * license requires to travel with the font files. scripts/prepare-fonts.md describes how the
 * subset is regenerated; src/lib/fonts.test.ts asserts all three are present and well formed.
 *
 * The file declares "Montserrat Thin" in nameID 1, because the default instance of the
 * variable build is wght=100. The browser never sees that name: next/font generates the family
 * name from this call.
 */

/**
 * The site's font, exported under a role name rather than a family name.
 *
 * Every document shell imports `sans` and puts `sans.variable` in the class of its root
 * element. That import is what pulls this module into the compiled graph and makes
 * next/font/local emit the @font-face and the .woff2; the class is what declares
 * --font-montserrat on the element. globals.css reads it as the first value of
 * `--font-sans: var(--font-montserrat, …)`, with a fallback inside the var(). fonts.test.ts
 * checks every link of that chain.
 */
export const sans = localFont({
  src: [
    { path: "./assets/fonts/Montserrat-Variable-latin.woff2", weight: "100 900", style: "normal" },
  ],
  // Name of the CSS custom property next/font declares on the element carrying this class.
  // Distinct from --font-sans, which globals.css chains to it.
  variable: "--font-montserrat",
  // Text paints in the fallback immediately, then swaps; the LCP never waits for the font.
  display: "swap",
  preload: true,
  // Emits a fallback @font-face over local Arial with size-adjust, ascent-override,
  // descent-override and line-gap-override computed by fontkit from the file on disk, so the
  // swap does not shift layout. The overrides are derived, never hardcoded.
  adjustFontFallback: "Arial",
  fallback: [
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "sans-serif",
  ],
});
