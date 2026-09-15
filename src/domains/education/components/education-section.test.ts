// src/domains/education/components/education-section.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { education } from "@/domains/education/content/education";

/**
 * Guards for the Education section. Vitest runs on the `node` environment and both files
 * are Server Components, so nothing here mounts them: what is checked is the markup
 * contract the section shares with SectionHeading, Stagger and the scroll spy, read from
 * the source text.
 */
const ROOT = process.cwd();

const SECTION = "src/domains/education/components/EducationSection.tsx";
const ITEM = "src/domains/education/components/EducationItem.tsx";

/** The client directive as a pattern, so counting the islands over src/ skips this file. */
const CLIENT_DIRECTIVE = new RegExp(`^"use\\s+client"`, "m");

/** Source with comments stripped, so a guard matches code and not the prose around it. */
function code (path: string): string {
  return readFileSync(join(ROOT, path), "utf8")
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .replaceAll(/^\s*\/\/.*$/gm, "");
}

describe("EducationSection", () => {
  it("stays a Server Component", () => {
    expect(code(SECTION)).not.toMatch(CLIENT_DIRECTIVE);
  });

  it("leaves the anchor id to SectionHeading and names the region after its h2", () => {
    const source = code(SECTION);

    expect(source).toContain(`<SectionHeading id="education"`);
    expect(source).toContain(`aria-labelledby="education-title"`);
    // A second element with the same id is what useScrollSpy would observe at random.
    expect(source).not.toContain("<section id=");
    // Both belong to SectionHeading; a second copy would move the anchor or rename it.
    expect(source).not.toContain("scroll-mt-header");
    expect(source).not.toContain("aria-label=");
  });

  it("sits in the page container and takes the shared vertical rhythm", () => {
    expect(code(SECTION)).toContain("container-page section-y");
  });

  it("renders the content array rather than the one entry that is in it today", () => {
    const source = code(SECTION);

    expect(source).toContain("education.map(");
    expect(source).toContain("key={entry.id}");
  });

  it("stacks the entries in one column at every width", () => {
    const source = code(SECTION);

    expect(source).toContain("flex flex-col");
    expect(source).not.toContain("grid-cols-");
  });
});

describe("the content the section is shaped for", () => {
  it("has at least one entry", () => {
    expect(education.length).toBeGreaterThan(0);
  });

  it("gives every entry a distinct id, which is the React key", () => {
    expect(new Set(education.map((entry) => entry.id)).size).toBe(education.length);
  });
});

describe("EducationItem", () => {
  it("stays a Server Component", () => {
    expect(code(ITEM)).not.toMatch(CLIENT_DIRECTIVE);
  });

  it("carries the attribute <Stagger> needs on each of its direct children", () => {
    // Stagger observes the group and never touches the children: a child without the
    // attribute is never hidden and the sequence plays with a hole in it.
    expect(code(ITEM)).toContain(`<li data-reveal="hidden">`);
  });

  it("titles the card with an h3, so the outline skips no level", () => {
    const source = code(ITEM);

    expect(source).toContain("<h3");
    expect(source).not.toContain("<h2");
  });

  it("translates the degree and leaves the proper nouns untranslated", () => {
    const source = code(ITEM);

    expect(source).toContain("localize(entry.degree, locale)");
    expect(source).toContain("{entry.institution}");
    expect(source).not.toContain("localize(entry.institution");
    expect(source).not.toContain("localize(entry.location");
  });

  it("offers no hover affordance, because the card is not a link", () => {
    const source = code(ITEM);

    expect(source).not.toContain("card-interactive");
    expect(source).not.toContain("<a ");
  });
});
