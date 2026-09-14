// scripts/check-style-rules.ts
// Guard for two hard rules:
//   1. No gradients in src/**/*.{css,svg,ts,tsx}, public/**/*.svg and messages/*.json.
//   2. No literal colours outside src/app/globals.css (two declared exemptions).
// Complements the ESLint `no-restricted-syntax` rule, which only sees TS/TSX and only covers the
// from-/via-/to- stops, where a plain grep would produce false positives. Exits 1 on any finding.
import { readdirSync, readFileSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

interface Rule {
  id: string;
  pattern: RegExp;
  exempt: readonly string[];
}

interface Finding {
  file: string;
  line: number;
  rule: string;
  text: string;
}

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const SCAN: readonly { dir: string; extensions: readonly string[]; }[] = [
  { dir: "src", extensions: [ ".css", ".svg", ".ts", ".tsx" ] },
  { dir: "public", extensions: [ ".svg" ] },
  // messages/ lives at the root, not under src/, and its copy passes through t.rich with
  // markup, so a gradient class inside a translatable string is not seen anywhere else.
  { dir: "messages", extensions: [ ".json" ] },
];

const COLOR_EXEMPT: readonly string[] = [
  "src/app/globals.css",
  "src/lib/palette-srgb.ts",
  "src/domains/contact/services/mailer.ts",
];

const RULES: readonly Rule[] = [
  { id: "gradient-css-function", pattern: /(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(/, exempt: [] },
  { id: "gradient-legacy-utility", pattern: /(?:^|[^A-Za-z0-9_-])bg-gradient-/, exempt: [] },
  // The closing lookahead excludes only [A-Za-z0-9_], so the Tailwind v4 direction suffixes
  // (`bg-linear-to-r`, `bg-conic-180`) still match while `bg-linears` does not.
  { id: "gradient-utility", pattern: /(?:^|[^A-Za-z0-9_-])(?:bg|mask|border)-(?:linear|radial|conic)(?![A-Za-z0-9_])/, exempt: [] },
  { id: "gradient-mask-edge", pattern: /(?:^|[^A-Za-z0-9_-])mask-[tblrxy]-(?:from|to)-/, exempt: [] },
  { id: "gradient-clip-text-utility", pattern: /(?:^|[^A-Za-z0-9_-])bg-clip-text(?:[^A-Za-z0-9_-]|$)/, exempt: [] },
  { id: "gradient-clip-text-css", pattern: /(?:-webkit-)?background-clip\s*:\s*text/, exempt: [] },
  { id: "gradient-tailwind-var", pattern: /--tw-gradient-/, exempt: [] },
  { id: "gradient-svg-element", pattern: /<(?:linear|radial)Gradient/, exempt: [] },
  { id: "gradient-shimmer-class", pattern: /(?:^|[\s:'"`[])shimmer(?:-[a-z0-9]|[\s'"`\]]|$)/, exempt: [] },
  { id: "literal-color-hex", pattern: /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9A-Za-z_-])/, exempt: COLOR_EXEMPT },
  { id: "literal-color-function", pattern: /(?:^|[^A-Za-z0-9_-])(?:oklch|oklab|lch|lab|rgba?|hsla?|color-mix)\s*\(/, exempt: COLOR_EXEMPT },
];

function collect (dir: string, extensions: readonly string[]): string[] {
  const absolute = join(ROOT, dir);
  let entries: string[] = [];
  try {
    entries = readdirSync(absolute, { recursive: true, encoding: "utf8" });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => extensions.some((extension) => entry.endsWith(extension)))
    .map((entry) => posix.join(dir, entry.split(sep).join(posix.sep)));
}

const findings: Finding[] = [];

for (const target of SCAN) {
  for (const file of collect(target.dir, target.extensions)) {
    const source = readFileSync(join(ROOT, file), "utf8");
    const lines = source.split("\n");
    for (const rule of RULES) {
      if (rule.exempt.includes(file)) continue;
      lines.forEach((text, index) => {
        if (rule.pattern.test(text)) {
          findings.push({ file, line: index + 1, rule: rule.id, text: text.trim() });
        }
      });
    }
  }
}

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line}  ${finding.rule}  ${finding.text}`);
  }
  console.error(`
--------------------------------------------------------------------------
REGLA DURA VIOLADA (${findings.length} hallazgo(s)).
  · Gradientes  -> prohibidos en fondo, texto, borde y mascara.
                   Diferencia por elevacion (shadow-elevation-*) o hairline.
  · Colores     -> el unico fichero con colores literales es src/app/globals.css.
                   Consume un token semantico (bg-card, text-muted-foreground...).
Documentado en documentation/conventions/no-gradients.md
--------------------------------------------------------------------------`);
  process.exit(1);
}

const scanned = SCAN.map((target) => `${target.dir}/`).join(" y ");
console.log(`OK - cero gradientes y cero colores literales en ${scanned}`);
console.log(`(relativo a ${relative(process.cwd(), ROOT) || "."})`);
