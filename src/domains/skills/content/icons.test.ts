// src/domains/skills/content/icons.test.ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import * as simpleIcons from "simple-icons";
import { describe, expect, it } from "vitest";

import { MANUAL_ICON_SLUGS, SIMPLE_ICON_SLUGS } from "@/domains/skills/content/icons";

/**
 * The committed brand glyphs, checked the way `npm run icons:skills -- --check` checks them,
 * so a stale or missing file fails `npm run check` instead of the site painting an empty
 * mask where a logo should be.
 */
const ICON_DIR = join(process.cwd(), "public", "icons");

const ALL_SLUGS: readonly string[] = [ ...SIMPLE_ICON_SLUGS, ...MANUAL_ICON_SLUGS ];

/** `nextdotjs` -> `siNextdotjs`, the export simple-icons publishes for that slug. */
function exportName (slug: string): string {
  return `si${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;
}

/** The whole file the generator writes for one glyph. */
function template (path: string): string {
  return `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">`
    + `<path fill="currentColor" d="${path}"/></svg>\n`;
}

function fileName (slug: string): string {
  return `icon-${slug}.svg`;
}

function read (slug: string): string | null {
  try {
    return readFileSync(join(ICON_DIR, fileName(slug)), "utf8");
  } catch {
    return null;
  }
}

describe("brand glyphs", () => {
  it("has a committed file for every declared slug", () => {
    for (const slug of ALL_SLUGS) {
      expect(read(slug), `${fileName(slug)} is missing`).toBeTypeOf("string");
    }
  });

  it("matches what the generator would write from the installed simple-icons", () => {
    for (const slug of SIMPLE_ICON_SLUGS) {
      const icon = simpleIcons[ exportName(slug) ];

      expect(icon, `simple-icons ships no ${exportName(slug)}`).toBeDefined();
      expect(read(slug), `${fileName(slug)} is stale`).toBe(template(icon?.path ?? ""));
    }
  });

  it("keeps a hand-committed file for every slug simple-icons does not ship", () => {
    for (const slug of MANUAL_ICON_SLUGS) {
      // The generator asserts these instead of writing them. A slug that simple-icons
      // starts shipping again belongs in SIMPLE_ICON_SLUGS, not here.
      expect(simpleIcons[ exportName(slug) ], `${slug} is back in simple-icons`).toBeUndefined();
      expect(read(slug), `${fileName(slug)} is missing`).toBeTypeOf("string");
    }
  });

  it("paints no colour of its own, so the CSS mask can take the theme colour", () => {
    for (const slug of ALL_SLUGS) {
      const svg = read(slug) ?? "";

      expect(svg, `${fileName(slug)} does not inherit the current colour`)
        .toContain(`fill="currentColor"`);
      expect(svg, `${fileName(slug)} is not a 24x24 glyph`)
        .toContain(`viewBox="0 0 24 24"`);
      expect(svg.match(/<path/g), `${fileName(slug)} is not a single path`).toHaveLength(1);
    }
  });

  it("leaves no icon file no slug claims", () => {
    const expected = new Set<string>(ALL_SLUGS.map(fileName));
    const committed = readdirSync(ICON_DIR)
      .filter((entry) => entry.startsWith("icon-") && entry.endsWith(".svg"));

    expect(committed.filter((entry) => !expected.has(entry))).toEqual([]);
  });
});
