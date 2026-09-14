// scripts/check-contrast.ts
// Verifica que la paleta REAL declarada en src/app/globals.css cumple WCAG AA y 1.4.11 en las
// combinaciones semánticas que el sitio usa de verdad, en claro y en oscuro. Parsea el propio CSS:
// no hay valores duplicados que se puedan desincronizar. Sale 1 si alguna combinación exigida baja
// del mínimo. Las combinaciones marcadas como informativas se miden e imprimen, pero no fallan.
import { readFileSync } from "node:fs";

type Family = "brand" | "neutral" | "danger";
type Theme = "claro" | "oscuro";
type LinearRgb = readonly [ number, number, number ];

interface Color {
  hex: string;
  luminance: number;
}

interface ContrastCase {
  label: string;
  foreground: string;
  background: string;
  min: number;
  informative?: boolean;
}

/* -- oklch -> sRGB, con gamut mapping por reducción de croma ------------------------------- */

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

function oklch (lightness: number, chroma: number, hue: number): Color {
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
  // Tupla explicita en vez de `as unknown as LinearRgb`. Con noUncheckedIndexedAccess el
  // resultado de .map() es number[] y el destructuring daria `number | undefined`; la doble
  // asercion silenciaba exactamente la comprobacion que el flag existe para hacer.
  const clamp = (channel: number | undefined): number => Math.min(1, Math.max(0, channel ?? 0));
  const linear: LinearRgb = [ clamp(raw[ 0 ]), clamp(raw[ 1 ]), clamp(raw[ 2 ]) ];
  const [ r, g, b ] = linear;
  const hex = "#" + linear
    .map((channel) => Math.round(gamma(channel) * 255).toString(16).padStart(2, "0"))
    .join("");
  return { hex, luminance: 0.2126 * r + 0.7152 * g + 0.0722 * b };
}

function ratio (a: Color, b: Color): number {
  const high = Math.max(a.luminance, b.luminance);
  const low = Math.min(a.luminance, b.luminance);
  return (high + 0.05) / (low + 0.05);
}

/* -- parseo de globals.css ----------------------------------------------------------------- */

const CSS = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

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

// Constante de modulo, como PRIMITIVE mas abajo: @stylistic/wrap-regex exige parentesis
// alrededor de un literal de regex usado como objeto de un miembro, y `eslint .` lintea
// tambien scripts/ (§4.6). Extraerlo cumple la regla y se lee mejor.
const NEUTRAL_FOLLOWS_BRAND = /--neutral-h\s*:\s*var\(--brand-h\)/;

const brandHue = dial("brand-h");
const neutralHue = NEUTRAL_FOLLOWS_BRAND.test(CSS) ? brandHue : dial("neutral-h");

// El hue de --danger-* se escribe literal en el CSS, así que esta entrada nunca se consulta.
const HUES: Record<Family, number> = { brand: brandHue, neutral: neutralHue, danger: 27 };
const CHROMA: Record<Family, number> = { brand: dial("brand-c"), neutral: dial("neutral-c"), danger: 1 };

const PRIMITIVE = /--(brand|neutral|danger)-(\d+)\s*:\s*oklch\(\s*([0-9.]+)\s+(?:calc\(\s*([0-9.]+)\s*\*\s*var\(--(?:brand|neutral)-c\)\s*\)|([0-9.]+))\s+(?:var\(--(?:brand|neutral)-h\)|([0-9.]+))\s*\)\s*;/g;

const primitives = new Map<string, Color>();
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
  primitives.set(`${family}-${step}`, oklch(Number(lightness), chroma, hue));
}

function semanticMap (blockRegex: RegExp): Map<string, string> {
  const out = new Map<string, string>();
  for (const block of CSS.matchAll(blockRegex)) {
    const body = group(block, 1);
    if (body === undefined) continue;
    const declaration = /--([a-z0-9-]+)\s*:\s*var\(--((?:brand|neutral|danger)-\d+)\)\s*;/g;
    for (const match of body.matchAll(declaration)) {
      const token = group(match, 1);
      const primitive = group(match, 2);
      if (token === undefined || primitive === undefined) continue;
      out.set(token, primitive);
    }
  }
  return out;
}

const LIGHT = semanticMap(/:root\s*\{([\s\S]*?)\n\}/g);
const DARK = new Map([ ...LIGHT, ...semanticMap(/\n\.dark\s*\{([\s\S]*?)\n\}/g) ]);

function color (theme: Theme, token: string): Color {
  const map = theme === "claro" ? LIGHT : DARK;
  const primitive = map.get(token);
  if (primitive === undefined) throw new Error(`[${theme}] --${token} no está mapeado a una primitiva`);
  const resolved = primitives.get(primitive);
  if (resolved === undefined) throw new Error(`[${theme}] la primitiva --${primitive} no existe`);
  return resolved;
}

/* -- combinaciones reales del sitio -------------------------------------------------------- */

const CASES: readonly ContrastCase[] = [
  { label: "foreground / background", foreground: "foreground", background: "background", min: 4.5 },
  { label: "foreground / card", foreground: "foreground", background: "card", min: 4.5 },
  { label: "card-foreground / card", foreground: "card-foreground", background: "card", min: 4.5 },
  { label: "popover-foreground / popover", foreground: "popover-foreground", background: "popover", min: 4.5 },
  { label: "secondary-foreground / secondary", foreground: "secondary-foreground", background: "secondary", min: 4.5 },
  { label: "muted-foreground / background", foreground: "muted-foreground", background: "background", min: 4.5 },
  { label: "muted-foreground / card", foreground: "muted-foreground", background: "card", min: 4.5 },
  { label: "muted-foreground / muted", foreground: "muted-foreground", background: "muted", min: 4.5 },
  { label: "muted-foreground / accent", foreground: "muted-foreground", background: "accent", min: 4.5 },
  { label: "primary (texto) / background", foreground: "primary", background: "background", min: 4.5 },
  { label: "primary (texto) / card", foreground: "primary", background: "card", min: 4.5 },
  { label: "primary-foreground / primary", foreground: "primary-foreground", background: "primary", min: 4.5 },
  { label: "primary-foreground / primary-hover", foreground: "primary-foreground", background: "primary-hover", min: 4.5 },
  { label: "primary-foreground / primary-active", foreground: "primary-foreground", background: "primary-active", min: 4.5 },
  { label: "accent-foreground / accent", foreground: "accent-foreground", background: "accent", min: 4.5 },
  { label: "accent-foreground / accent-hover", foreground: "accent-foreground", background: "accent-hover", min: 4.5 },
  { label: "destructive-foreground / destructive", foreground: "destructive-foreground", background: "destructive", min: 4.5 },
  { label: "destructive (texto) / card", foreground: "destructive", background: "card", min: 4.5 },
  { label: "ring / background", foreground: "ring", background: "background", min: 3.0 },
  { label: "ring / card", foreground: "ring", background: "card", min: 3.0 },
  { label: "input (borde) / background", foreground: "input", background: "background", min: 3.0 },
  { label: "input (borde) / card", foreground: "input", background: "card", min: 3.0 },
  { label: "border-strong / background", foreground: "border-strong", background: "background", min: 3.0, informative: true },
  { label: "border-strong / card", foreground: "border-strong", background: "card", min: 3.0, informative: true },
];

const THEMES: readonly Theme[] = [ "claro", "oscuro" ];

let failed = 0;
let checked = 0;

console.log(
  `Paleta: hue marca ${HUES.brand}, hue neutros ${HUES.neutral}, `
  + `croma marca x${CHROMA.brand}, croma neutros x${CHROMA.neutral}`,
);

for (const theme of THEMES) {
  console.log(`\n-- ${theme.toUpperCase()} --`);
  for (const testCase of CASES) {
    const fg = color(theme, testCase.foreground);
    const bg = color(theme, testCase.background);
    const value = ratio(fg, bg);
    const passes = value >= testCase.min;
    let status = "PASS";
    if (testCase.informative === true) {
      status = "INFO";
    } else {
      checked++;
      if (!passes) {
        status = "FAIL";
        failed++;
      }
    }
    console.log(
      `${status}  ${testCase.label.padEnd(38)} ${fg.hex} / ${bg.hex}`
      + `  ${value.toFixed(2).padStart(6)}  (ref ${testCase.min.toFixed(1)})`,
    );
  }
}

if (failed > 0) {
  console.error(`\n${failed} combinacion(es) por debajo del minimo WCAG. Ajusta la paleta.`);
  process.exit(1);
}

console.log(`\nOK - ${checked} combinaciones exigidas verificadas, todas cumplen.`);
