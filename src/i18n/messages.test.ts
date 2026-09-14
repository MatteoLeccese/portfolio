// src/i18n/messages.test.ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import es from "../../messages/es.json";

/**
 * The eight invariants of §8.9. `src/global.d.ts` types the keys against en.json and does not
 * see three real failures: a key missing from es.json (next-intl falls back in silence), t.rich
 * tags that diverge between languages (that THROWS at runtime) and code calling a key that
 * exists in neither catalogue (renders the literal key in production).
 *
 * Nota de transcripción: §8.9 escribe `match[ 1 ]` sin más, y `noUncheckedIndexedAccess`
 * (tsconfig, §4.3) tipa eso como `string | undefined`. Los `?? ""` y los guardas de
 * `undefined` de abajo son la corrección mínima para que el fichero compile; no cambian
 * el comportamiento, porque un grupo de captura obligatorio siempre casa.
 */

type MessageTree = { [ key: string ]: string | MessageTree; };

/** Flattens the message tree into sorted dot-separated paths. */
function flattenKeys (tree: MessageTree, prefix = ""): string[] {
  const keys: string[] = [];

  for (const [ key, value ] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") keys.push(path);
    else keys.push(...flattenKeys(value, path));
  }

  return keys.sort();
}

/** Flattens the message tree into a path -> text map, to compare the values. */
function flattenEntries (tree: MessageTree, prefix = ""): Record<string, string> {
  const entries: Record<string, string> = {};

  for (const [ key, value ] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") entries[ path ] = value;
    else Object.assign(entries, flattenEntries(value, path));
  }

  return entries;
}

/** Walks the raw tree so arrays, numbers and nulls stay visible as leaves. */
function rawLeaves (value: unknown, prefix = ""): [ string, unknown ][] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return [ [ prefix, value ] ];

  return Object.entries(value).flatMap(([ key, child ]) =>
    rawLeaves(child, prefix.length > 0 ? `${prefix}.${key}` : key),
  );
}

/** Keys must be alphabetically sorted inside every namespace, at every level. */
function assertSorted (value: unknown, path: string, failures: string[]): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return;

  const keys = Object.keys(value);
  if (keys.join("|") !== [ ...keys ].sort().join("|")) failures.push(path.length > 0 ? path : "<root>");

  for (const [ key, child ] of Object.entries(value)) {
    assertSorted(child, path.length > 0 ? `${path}.${key}` : key, failures);
  }
}

/** "{count, plural, one {# year} other {# years}}" -> [ "count" ] */
function icuPlaceholders (message: string): string[] {
  return [ ...message.matchAll(/\{\s*(\w+)/g) ].map((match) => match[ 1 ] ?? "").sort();
}

/** "as described in the <privacy>Privacy Policy</privacy>." -> [ "privacy", "privacy" ] */
function richTags (message: string): string[] {
  return [ ...message.matchAll(/<\/?([a-zA-Z][\w-]*)>/g) ].map((match) => match[ 1 ] ?? "").sort();
}

// Constantes de modulo: @stylistic/wrap-regex prohibe usar un literal de regex como
// objeto de un member expression sin parentesis.
const SOURCE_FILE = /\.tsx?$/;
const TEST_FILE = /\.test\.tsx?$/;

/** Every .ts/.tsx file under src/, so the code can be compared against the catalogue. */
function sourceFiles (dir: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...sourceFiles(full));
    else if (SOURCE_FILE.test(entry) && !TEST_FILE.test(entry)) files.push(full);
  }

  return files;
}

const NAMESPACE_BINDING =
  /(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:"([^"]+)"|\{[^}]*namespace:\s*"([^"]+)"[^}]*\})\s*\)/g;

/**
 * Keys the regex scanner cannot see, because the code builds them at runtime or reads
 * them as plain properties of the imported JSON. Listed by hand, which is the whole
 * point: this array is the ONLY place a key can hide from both directions of the check.
 * Adding an entry here is a decision someone has to write down and a reviewer can see.
 */
const DYNAMIC_KEYS = [
  // LocaleSwitcher calls t(locale) and t("switchTo", { language: t(locale) }).
  "Locale.en", "Locale.es",
  // ContactForm builds t(`errors.${code}`) from ContactErrorCode + ContactFieldErrorCode.
  "Contact.errors.email_invalid", "Contact.errors.email_send_failed",
  "Contact.errors.email_too_long", "Contact.errors.internal_error",
  "Contact.errors.message_too_long", "Contact.errors.message_too_short",
  "Contact.errors.name_too_long", "Contact.errors.name_too_short",
  "Contact.errors.spam_rejected", "Contact.errors.subject_too_long",
  "Contact.errors.subject_too_short", "Contact.errors.too_many_requests",
  "Contact.errors.validation_error",
  // ContactForm builds t(`form.${field}Label`) and t(`form.${field}Placeholder`).
  "Contact.form.nameLabel", "Contact.form.namePlaceholder",
  "Contact.form.emailLabel", "Contact.form.emailPlaceholder",
  "Contact.form.subjectLabel", "Contact.form.subjectPlaceholder",
  "Contact.form.messageLabel", "Contact.form.messagePlaceholder",
  // scripts/cv-template.ts reads the imported JSON as properties, not through t().
  "Cv.education", "Cv.experience", "Cv.profile", "Cv.skills", "Common.present",
  "Skills.categoryAi", "Skills.categoryBackend", "Skills.categoryData",
  "Skills.categoryFrontend", "Skills.categoryPlatform",
];

const englishKeys = flattenKeys(en as MessageTree);
const spanishKeys = flattenKeys(es as MessageTree);

const CATALOGUES = [ [ "en", en ], [ "es", es ] ] as const;

describe("message catalogues", () => {
  it("has no key missing in Spanish", () => {
    const missing = englishKeys.filter((key) => !spanishKeys.includes(key));
    expect(missing, `Missing in messages/es.json: ${missing.join(", ")}`).toEqual([]);
  });

  it("has no extra key in Spanish", () => {
    const extra = spanishKeys.filter((key) => !englishKeys.includes(key));
    expect(extra, `Unexpected in messages/es.json: ${extra.join(", ")}`).toEqual([]);
  });

  it("uses the same ICU placeholders in both languages", () => {
    const englishEntries = flattenEntries(en as MessageTree);
    const spanishEntries = flattenEntries(es as MessageTree);
    const mismatches: string[] = [];

    for (const [ key, englishValue ] of Object.entries(englishEntries)) {
      const spanishValue = spanishEntries[ key ];
      if (typeof spanishValue !== "string") continue;

      const expected = icuPlaceholders(englishValue).join(",");
      const actual = icuPlaceholders(spanishValue).join(",");
      if (expected !== actual) mismatches.push(`${key}: en=[${expected}] es=[${actual}]`);
    }

    expect(mismatches, `Different ICU placeholders:\n${mismatches.join("\n")}`).toEqual([]);
  });

  it("uses the same t.rich tags in both languages", () => {
    const englishEntries = flattenEntries(en as MessageTree);
    const spanishEntries = flattenEntries(es as MessageTree);
    const mismatches: string[] = [];

    for (const [ key, englishValue ] of Object.entries(englishEntries)) {
      const spanishValue = spanishEntries[ key ];
      if (typeof spanishValue !== "string") continue;

      const expected = richTags(englishValue).join(",");
      const actual = richTags(spanishValue).join(",");
      if (expected !== actual) mismatches.push(`${key}: en=[${expected}] es=[${actual}]`);
    }

    expect(mismatches, `Different t.rich tags:\n${mismatches.join("\n")}`).toEqual([]);
  });

  it("keeps every namespace alphabetically sorted, at every level", () => {
    for (const [ locale, catalogue ] of CATALOGUES) {
      const failures: string[] = [];
      assertSorted(catalogue, "", failures);

      expect(failures, `${locale}: unsorted keys`).toEqual([]);
    }
  });

  it("contains only non-empty strings: no arrays, no numbers, no null", () => {
    for (const [ locale, catalogue ] of CATALOGUES) {
      for (const [ key, value ] of rawLeaves(catalogue)) {
        expect(typeof value, `${locale}: ${key} must be a string`).toBe("string");
        expect(String(value).trim(), `${locale}: ${key} is empty`).not.toBe("");
      }
    }
  });

  it("nests at most two levels inside a namespace", () => {
    for (const [ locale, catalogue ] of CATALOGUES) {
      for (const [ key ] of rawLeaves(catalogue)) {
        expect(key.split(".").length, `${locale}: ${key} is nested too deep`).toBeLessThanOrEqual(3);
      }
    }
  });

  it("closes every t.rich tag it opens", () => {
    for (const [ locale, catalogue ] of CATALOGUES) {
      for (const [ key, value ] of Object.entries(flattenEntries(catalogue as MessageTree))) {
        const opening = [ ...value.matchAll(/<([a-zA-Z][\w-]*)>/g) ].map((match) => match[ 1 ] ?? "").sort();
        const closing = [ ...value.matchAll(/<\/([a-zA-Z][\w-]*)>/g) ].map((match) => match[ 1 ] ?? "").sort();

        expect(closing, `${locale}: unbalanced tags at ${key}`).toEqual(opening);
      }
    }
  });

  it("only calls keys that exist in the catalogue", () => {
    const missing: string[] = [];

    for (const file of sourceFiles(join(process.cwd(), "src"))) {
      const source = readFileSync(file, "utf8");
      const bindings = new Map<string, string>();

      for (const match of source.matchAll(NAMESPACE_BINDING)) {
        const binding = match[ 1 ];
        const namespace = match[ 2 ] ?? match[ 3 ];
        if (binding !== undefined && namespace !== undefined) bindings.set(binding, namespace);
      }

      for (const [ binding, namespace ] of bindings) {
        const calls = new RegExp(`\\b${binding}(?:\\.rich)?\\(\\s*"([^"]+)"`, "g");
        for (const call of source.matchAll(calls)) {
          const key = `${namespace}.${call[ 1 ] ?? ""}`;
          if (!englishKeys.includes(key)) missing.push(`${file}: ${key}`);
        }
      }
    }

    expect(missing, `Keys called from code but absent from en.json:\n${missing.join("\n")}`)
      .toEqual([]);
  });

  it("has the keys that are looked up dynamically", () => {
    const missing = DYNAMIC_KEYS.filter((key) => !englishKeys.includes(key));
    expect(missing, `Missing dynamic keys: ${missing.join(", ")}`).toEqual([]);
  });

  /*
   * The mirror of "only calls keys that exist". Without it, a key whose consumer is
   * deleted stays in both catalogues for ever: dead copy that someone keeps translating.
   *
   * SKIPPED UNTIL PHASE 6 (§14.6). The catalogue is complete from phase 2, but its
   * consumers are not: the home page, its sections, the header, the footer, the contact
   * form and the CV template arrive in later phases, so today almost every one of the 138
   * keys would be reported as an orphan, and the only way to keep the suite green would be
   * to delete copy that is already final. Phase 6 closes the home page — that is when this
   * flips back to `it()` and the check becomes real. Do not re-enable it earlier, and do
   * not "fix" it by moving keys into DYNAMIC_KEYS: that list is for keys the static scanner
   * CANNOT see, not for keys whose consumer has not been written yet.
   */
  it.skip("has no key that nobody calls", () => {
    const called = new Set(DYNAMIC_KEYS);
    const roots = [ join(process.cwd(), "src"), join(process.cwd(), "scripts") ];

    for (const root of roots) {
      for (const file of sourceFiles(root)) {
        const source = readFileSync(file, "utf8");
        const bindings = new Map<string, string>();

        for (const match of source.matchAll(NAMESPACE_BINDING)) {
          const binding = match[ 1 ];
          const namespace = match[ 2 ] ?? match[ 3 ];
          if (binding !== undefined && namespace !== undefined) bindings.set(binding, namespace);
        }

        for (const [ binding, namespace ] of bindings) {
          const calls = new RegExp(`\\b${binding}(?:\\.rich)?\\(\\s*"([^"]+)"`, "g");
          for (const call of source.matchAll(calls)) called.add(`${namespace}.${call[ 1 ] ?? ""}`);
        }
      }
    }

    const orphans = englishKeys.filter((key) => !called.has(key));

    expect(
      orphans,
      `Keys in en.json that nothing calls. Delete them, or add them to DYNAMIC_KEYS with `
      + `a comment saying who reads them:\n${orphans.join("\n")}`,
    ).toEqual([]);
  });
});
