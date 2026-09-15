// scripts/generate-skill-icons.ts
// Writes one monochrome SVG per brand slug into public/icons/, taking the path data from the
// locally installed simple-icons package. Nothing is fetched. The glyphs carry no colour of their
// own (`fill="currentColor"`) because they are painted as a CSS mask over `background-color:
// currentColor`, so they follow the theme instead of the brand.
//
//   npm run icons:skills             rewrite every generated file
//   npm run icons:skills -- --check  verify the files on disk, write nothing
//
// Slugs in MANUAL_ICON_SLUGS have no simple-icons entry. Their SVG is committed by hand and this
// script only asserts it is still there, so a regeneration can never drop one in silence.
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";

import * as simpleIcons from "simple-icons";

import { MANUAL_ICON_SLUGS, SIMPLE_ICON_SLUGS } from "@/domains/skills/content/icons";

const ICON_DIR = new URL("../public/icons/", import.meta.url);

const CHECK_ONLY = process.argv.includes("--check");

/** `nextdotjs` -> `siNextdotjs`, the export simple-icons publishes for that slug. */
function exportName (slug: string): string {
  return `si${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;
}

/** The whole file written for one glyph. */
function template (path: string): string {
  return `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">`
    + `<path fill="currentColor" d="${path}"/></svg>\n`;
}

function fileName (slug: string): string {
  return `icon-${slug}.svg`;
}

function fileUrl (slug: string): URL {
  return new URL(fileName(slug), ICON_DIR);
}

/** File contents, or null when the file is not there. */
async function readIfPresent (file: URL): Promise<string | null> {
  return readFile(file, "utf8").catch(() => null);
}

/** Generated files no slug claims any more. Reported, never deleted. */
async function orphans (): Promise<string[]> {
  const expected = new Set<string>(
    [ ...SIMPLE_ICON_SLUGS, ...MANUAL_ICON_SLUGS ].map(fileName),
  );
  const entries = await readdir(ICON_DIR).catch(() => [] as string[]);

  return entries.filter((entry) => entry.startsWith("icon-")
    && entry.endsWith(".svg")
    && !expected.has(entry));
}

const failures: string[] = [];
let written = 0;
let verified = 0;

if (!CHECK_ONLY) {
  await mkdir(ICON_DIR, { recursive: true });
}

for (const slug of SIMPLE_ICON_SLUGS) {
  const icon = simpleIcons[ exportName(slug) ];

  if (icon === undefined) {
    failures.push(
      `simple-icons ships no ${exportName(slug)}, so "${slug}" cannot be generated. `
      + `Either drop it from SIMPLE_ICON_SLUGS or commit its SVG by hand and move it to `
      + `MANUAL_ICON_SLUGS.`,
    );
    continue;
  }

  const expected = template(icon.path);

  if (CHECK_ONLY) {
    const actual = await readIfPresent(fileUrl(slug));

    if (actual === expected) {
      verified++;
    } else {
      failures.push(`${fileName(slug)} is missing or stale. Run \`npm run icons:skills\`.`);
    }
  } else {
    await writeFile(fileUrl(slug), expected);
    written++;
  }
}

for (const slug of MANUAL_ICON_SLUGS) {
  try {
    await access(fileUrl(slug));
    verified++;
  } catch {
    failures.push(
      `${fileName(slug)} is hand-committed and missing. simple-icons ships no `
      + `${exportName(slug)}, so nothing here can recreate it: restore the file.`,
    );
  }
}

const unclaimed = await orphans();

if (unclaimed.length > 0) {
  console.warn(`Unclaimed file(s) in public/icons/: ${unclaimed.join(", ")}`);
}

console.log(
  CHECK_ONLY
    ? `Checked ${verified}/${SIMPLE_ICON_SLUGS.length + MANUAL_ICON_SLUGS.length} icons.`
    : `Wrote ${written} icons, verified ${verified} hand-committed.`,
);

if (failures.length > 0) {
  console.error(`\n${failures.length} problem(s):`);

  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }

  process.exit(1);
}
