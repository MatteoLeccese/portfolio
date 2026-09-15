// src/app/brand-icons.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The icons `npm run icons:brand` writes, checked on disk so a missing or truncated file
 * fails `npm run check` instead of shipping as a blank tab icon or a broken install prompt.
 * Currency against the source is what `npm run icons:brand -- --check` verifies; this asserts
 * the set is there, has the declared geometry, and keeps alpha only where alpha is wanted.
 */
const ROOT = process.cwd();

/** PNG colour type 6 is truecolour with an alpha channel; 2 is truecolour without one. */
const COLOUR_TYPE_WITH_ALPHA = 6;

const PNG_SIGNATURE: readonly number[] = [ 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a ];

const MIN_BYTES = 1024;
const MAX_BYTES = 512 * 1024;

interface PngIcon {
  path: string;
  size: number;

  /** iOS and Android paint these over their own background, so they carry no alpha. */
  opaque: boolean;
}

const PNG_ICONS: readonly PngIcon[] = [
  { path: "src/app/icon.png", size: 512, opaque: false },
  { path: "src/app/apple-icon.png", size: 180, opaque: true },
  { path: "public/icons/pwa-192.png", size: 192, opaque: false },
  { path: "public/icons/pwa-512.png", size: 512, opaque: false },
  { path: "public/icons/pwa-maskable-512.png", size: 512, opaque: true },
];

const FAVICON = "src/app/favicon.ico";
const FAVICON_SIZES: readonly number[] = [ 16, 32, 48 ];

function read (path: string): Buffer | null {
  try {
    return readFileSync(join(ROOT, path));
  } catch {
    return null;
  }
}

/** Width, height and colour type read straight out of the IHDR chunk. */
function pngHeader (buffer: Buffer): { width: number; height: number; colourType: number; } {
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colourType: buffer.readUInt8(25),
  };
}

/** The sizes the ICO directory declares, in file order. */
function icoSizes (buffer: Buffer): number[] {
  const count = buffer.readUInt16LE(4);
  const sizes: number[] = [];

  for (let index = 0; index < count; index++) {
    // A zero byte in the directory means 256, the only size that does not fit in one byte.
    sizes.push(buffer.readUInt8(6 + index * 16) || 256);
  }

  return sizes;
}

describe("brand icons", () => {
  it("has a generated file for every icon the site references", () => {
    for (const icon of PNG_ICONS) {
      expect(read(icon.path), `${icon.path} is missing`).not.toBeNull();
    }

    expect(read(FAVICON), `${FAVICON} is missing`).not.toBeNull();
  });

  it("writes real PNGs of a plausible weight", () => {
    for (const icon of PNG_ICONS) {
      const buffer = read(icon.path) ?? Buffer.alloc(0);

      expect([ ...buffer.subarray(0, 8) ], `${icon.path} is not a PNG`).toEqual([ ...PNG_SIGNATURE ]);
      expect(buffer.length, `${icon.path} is too small to hold an icon`)
        .toBeGreaterThan(MIN_BYTES);
      expect(buffer.length, `${icon.path} is too heavy to ship`).toBeLessThan(MAX_BYTES);
    }
  });

  it("renders each icon square, at the size the manifest and the layout declare", () => {
    for (const icon of PNG_ICONS) {
      const header = pngHeader(read(icon.path) ?? Buffer.alloc(32));

      expect(header.width, `${icon.path} is not ${icon.size} wide`).toBe(icon.size);
      expect(header.height, `${icon.path} is not ${icon.size} tall`).toBe(icon.size);
    }
  });

  it("keeps the touch and maskable icons free of transparency", () => {
    for (const icon of PNG_ICONS) {
      const header = pngHeader(read(icon.path) ?? Buffer.alloc(32));

      if (icon.opaque) {
        expect(header.colourType, `${icon.path} still carries an alpha channel`)
          .not.toBe(COLOUR_TYPE_WITH_ALPHA);
      } else {
        expect(header.colourType, `${icon.path} lost its alpha channel`)
          .toBe(COLOUR_TYPE_WITH_ALPHA);
      }
    }
  });

  it("ships a multi-size favicon", () => {
    const buffer = read(FAVICON) ?? Buffer.alloc(6);

    expect(buffer.readUInt16LE(2), `${FAVICON} is not an icon resource`).toBe(1);
    expect(icoSizes(buffer), `${FAVICON} does not hold the three declared sizes`)
      .toEqual([ ...FAVICON_SIZES ]);
    expect(buffer.length, `${FAVICON} is too small to hold three images`)
      .toBeGreaterThan(MIN_BYTES);
  });
});
