// src/components/common/section-primitives.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

/**
 * Guards for the two primitives every home section shares. Vitest runs on the `node`
 * environment and both are Server Components, so nothing here mounts them: what matters is
 * the markup contract the sections program against, and that is read from the source text.
 */
const ROOT = process.cwd();

const SECTION_HEADING = "src/components/common/SectionHeading.tsx";
const PROSE = "src/components/common/Prose.tsx";

/**
 * The client directive, written as a pattern instead of a literal so that counting the
 * islands with `grep -rl` over src/ does not count this file among them.
 */
const CLIENT_DIRECTIVE = new RegExp(`^"use\\s+client"`, "m");

/** The arguments Prose hands to `cn()`, up to the caller's own `className`. */
const PROSE_BASE_CLASSES = /className=\{cn\(([\s\S]*?)\n\s*className,/;

/** Source with comments stripped, so a guard matches code and not the prose around it. */
function code (path: string): string {
  return readFileSync(join(ROOT, path), "utf8")
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .replaceAll(/^\s*\/\/.*$/gm, "");
}

describe("SectionHeading", () => {
  it("stays a Server Component", () => {
    expect(code(SECTION_HEADING)).not.toMatch(CLIENT_DIRECTIVE);
  });

  it("owns the anchor id and writes it on exactly two elements", () => {
    const source = code(SECTION_HEADING);

    // The wrapper takes the raw id and the <h2> takes `<id>-title`. A third id, or the same
    // id on the <section> as well, is a duplicate the scroll spy would observe at random.
    expect(source.match(/\sid=\{/g)).toHaveLength(2);
    expect(source).toContain("id={id}");
    expect(source).toContain("id={`${id}-title`}");
  });

  it("clears the sticky header on an anchor jump", () => {
    expect(code(SECTION_HEADING)).toContain("scroll-mt-header");
  });

  it("renders the title as an h2 and nothing else", () => {
    const source = code(SECTION_HEADING);

    expect(source).toContain("<h2");
    expect(source).not.toContain("<h1");
    expect(source).not.toContain("<h3");
  });

  it("takes translated strings and never translates on its own", () => {
    const source = code(SECTION_HEADING);

    expect(source).not.toContain("next-intl");
    expect(source).not.toContain("useTranslations");
  });

  it("keeps one call signature, with no class escape hatch", () => {
    const source = code(SECTION_HEADING);

    expect(source).not.toContain("className?");
    expect(source).not.toContain("children");
  });

  it("omits the eyebrow and the subtitle rather than rendering an empty node", () => {
    const source = code(SECTION_HEADING);

    expect(source).toContain("eyebrow === undefined");
    expect(source).toContain("subtitle === undefined");
  });
});

describe("Prose", () => {
  it("stays a Server Component", () => {
    expect(code(PROSE)).not.toMatch(CLIENT_DIRECTIVE);
  });

  it("bounds the reading measure", () => {
    expect(code(PROSE)).toContain("max-w-readable");
  });

  it("keeps the body type scale after the class merge", () => {
    const call = PROSE_BASE_CLASSES.exec(code(PROSE))?.[ 1 ] ?? "";
    const literals = [ ...call.matchAll(/"([^"]*)"/g) ].map((match) => match[ 1 ] ?? "");

    expect(literals.length).toBeGreaterThan(0);
    // twMerge files `text-body` with the `text-<colour>` utilities and keeps only the last
    // of the group, so a colour in the same call would delete the scale.
    expect(cn(literals.join(" "))).toContain("text-body");
  });

  it("underlines links without waiting for a hover", () => {
    const source = code(PROSE);

    // Colour is never the only carrier of information: the underline has to be there from
    // the start, and the hover only changes it.
    expect(source).toContain("[&_a]:underline");
    expect(source).toMatch(/\[&_a:hover\]:/);
  });

  it("spaces headings but never sizes them, so the caller keeps the scale", () => {
    const source = code(PROSE);

    expect(source).toContain("[&_h2:not(:first-child)]:mt-10");
    expect(source).not.toMatch(/\[&_h[23]\]:text-/);
  });

  it("opens every block flush, so no margin has to be reset", () => {
    const source = code(PROSE);

    for (const element of [ "p", "ul", "ol", "li", "section" ]) {
      expect(source, `${element} has an unconditional top margin`)
        .not.toMatch(new RegExp(`\\[&_${element}\\]:mt-`));
    }
  });
});
