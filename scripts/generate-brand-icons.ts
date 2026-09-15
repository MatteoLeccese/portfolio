// scripts/generate-brand-icons.ts
// Renders the whole brand icon set from assets/brand/ml-logo-source.png: the multi-size
// favicon and the two Next file-convention icons under src/app/, plus the three PWA icons
// the manifest points at under public/icons/, and the square mark under public/logo/.
// Nothing is fetched.
//
//   npm run icons:brand             write every icon whose bytes differ from the file on disk
//   npm run icons:brand -- --check  compare every icon with the file on disk, write nothing
//
// The source carries a wide transparent margin, so the opaque pixels are measured once and
// that rectangle, not the 500x500 canvas, is what each icon scales and centres. Icons that
// iOS and Android composite over their own background are written without an alpha channel.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import pngToIco from "png-to-ico";
import sharp from "sharp";

import { PALETTE_SRGB } from "@/lib/palette-srgb";

interface Rgba {
  r: number;
  g: number;
  b: number;
  alpha: number;
}

interface Region {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface IconSpec {

  /** Path relative to the repository root, used for both writing and reporting. */
  path: string;
  size: number;

  /** Fraction of each edge left empty around the mark. */
  inset: number;
  background: Rgba;
}

const ROOT = new URL("../", import.meta.url);
const SOURCE = new URL("assets/brand/ml-logo-source.png", ROOT);

const CHECK_ONLY = process.argv.includes("--check");

/** Alpha above which a source pixel counts as painted. */
const ALPHA_THRESHOLD = 8;

const TRANSPARENT: Rgba = { r: 0, g: 0, b: 0, alpha: 0 };

/** iOS composites alpha onto black and Android fills the maskable canvas edge to edge. */
const OPAQUE: Rgba = { ...channels(PALETTE_SRGB.light.card), alpha: 1 };

const ICONS: readonly IconSpec[] = [
  { path: "src/app/icon.png", size: 512, inset: 0.08, background: TRANSPARENT },
  { path: "src/app/apple-icon.png", size: 180, inset: 0.14, background: OPAQUE },
  { path: "public/icons/pwa-192.png", size: 192, inset: 0.08, background: TRANSPARENT },
  { path: "public/icons/pwa-512.png", size: 512, inset: 0.08, background: TRANSPARENT },
  { path: "public/icons/pwa-maskable-512.png", size: 512, inset: 0.2, background: OPAQUE },
];

const FAVICON = "src/app/favicon.ico";
const FAVICON_SIZES: readonly number[] = [ 16, 32, 48 ];
const FAVICON_INSET = 0.04;

/**
 * The square mark SITE.logo names, served to the JSON-LD Person node as its image. It is
 * the source copied byte for byte, not a render.
 */
const LOGO = "public/logo/ml-logo.png";

/** The three 8-bit channels of a six-digit hex colour string. */
function channels (hex: string): { r: number; g: number; b: number; } {
  const value = Number.parseInt(hex.slice(1), 16);

  return { r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff };
}

function resolve (path: string): URL {
  return new URL(path, ROOT);
}

/** The smallest rectangle holding every pixel the source actually paints. */
async function markBounds (): Promise<Region> {
  const { data, info } = await sharp(fileURLToPath(SOURCE))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const alpha = data[ (y * info.width + x) * info.channels + info.channels - 1 ] ?? 0;

      if (alpha < ALPHA_THRESHOLD) continue;

      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }

  if (right < left || bottom < top) {
    throw new Error(`${SOURCE.pathname} paints no pixel above alpha ${ALPHA_THRESHOLD}.`);
  }

  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

const BOUNDS = await markBounds();

/** One square icon: the trimmed mark, scaled to fit the inset box and centred on the canvas. */
async function square (size: number, inset: number, background: Rgba): Promise<Buffer> {
  const inner = Math.max(1, Math.round(size * (1 - inset * 2)));

  const mark = await sharp(fileURLToPath(SOURCE))
    .ensureAlpha()
    .extract(BOUNDS)
    .resize(inner, inner, { fit: "contain", background: TRANSPARENT })
    .png()
    .toBuffer();

  const canvas = sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([ { input: mark, gravity: "center" } ]);

  const flattened = background.alpha === 1
    ? sharp(await canvas.png().toBuffer()).flatten({ background })
    : canvas;

  return flattened.png({ compressionLevel: 9 }).toBuffer();
}

async function readIfPresent (file: URL): Promise<Buffer | null> {
  return readFile(file).catch(() => null);
}

const failures: string[] = [];
let written = 0;
let unchanged = 0;

/** Writes the file when its bytes differ, or records how it differs in --check mode. */
async function settle (path: string, expected: Buffer): Promise<void> {
  const file = resolve(path);
  const actual = await readIfPresent(file);

  if (actual !== null && actual.equals(expected)) {
    unchanged++;
    return;
  }

  if (CHECK_ONLY) {
    failures.push(
      actual === null
        ? `${path} is missing. Run \`npm run icons:brand\`.`
        : `${path} is stale: ${actual.length} bytes on disk, ${expected.length} expected. `
          + `Run \`npm run icons:brand\`.`,
    );
    return;
  }

  await writeFile(file, expected);
  written++;
}

if (!CHECK_ONLY) {
  await mkdir(resolve("public/icons/"), { recursive: true });
  await mkdir(resolve("public/logo/"), { recursive: true });
}

for (const icon of ICONS) {
  await settle(icon.path, await square(icon.size, icon.inset, icon.background));
}

const frames: Buffer[] = [];

for (const size of FAVICON_SIZES) {
  frames.push(await square(size, FAVICON_INSET, TRANSPARENT));
}

await settle(FAVICON, await pngToIco(frames));
await settle(LOGO, await readFile(fileURLToPath(SOURCE)));

console.log(
  CHECK_ONLY
    ? `Checked ${unchanged}/${ICONS.length + 2} brand icons.`
    : `Wrote ${written} brand icons, left ${unchanged} unchanged.`,
);

if (failures.length > 0) {
  console.error(`\n${failures.length} problem(s):`);

  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }

  process.exit(1);
}
