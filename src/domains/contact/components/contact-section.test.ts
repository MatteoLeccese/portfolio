// src/domains/contact/components/contact-section.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { SITE } from "@/domains/core/config/site";

/**
 * Guards for the Contact layout, which ships before the form it is laid out around.
 *
 * Two things have to hold while the slot is empty: the section must not fake a form, and
 * it must not publish anything the privacy decision keeps off the web surface. Both are
 * read from the source text; the environment is `node` and both files are Server
 * Components.
 */
const ROOT = process.cwd();

const SECTION = "src/domains/contact/components/ContactSection.tsx";
const CHANNELS = "src/domains/contact/components/ContactChannels.tsx";

/** The client directive as a pattern, so counting the islands over src/ skips this file. */
const CLIENT_DIRECTIVE = new RegExp(`^"use\\s+client"`, "m");

/** Source with comments stripped, so a guard matches code and not the prose around it. */
function code (path: string): string {
  return readFileSync(join(ROOT, path), "utf8")
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .replaceAll(/^\s*\/\/.*$/gm, "");
}

describe("ContactSection", () => {
  it("stays a Server Component", () => {
    expect(code(SECTION)).not.toMatch(CLIENT_DIRECTIVE);
  });

  it("leaves the anchor id to SectionHeading and names the region after its h2", () => {
    const source = code(SECTION);

    expect(source).toContain(`<SectionHeading id="contact"`);
    expect(source).toContain(`aria-labelledby="contact-title"`);
    expect(source).not.toContain("<section id=");
    expect(source).not.toContain("scroll-mt-header");
    expect(source).not.toContain("aria-label=");
  });

  it("sits in the page container and takes the shared vertical rhythm", () => {
    expect(code(SECTION)).toContain("container-page section-y");
  });

  it("holds the form as a slot, so mounting it is a composition and not a rewrite", () => {
    const source = code(SECTION);

    expect(source).toContain("readonly form?: ReactNode;");
    expect(source).toContain("{form}");
  });

  it("puts the form first in the DOM and gives it three of the five columns", () => {
    const source = code(SECTION);
    const formColumn = source.indexOf("md:col-span-3");
    const channelColumn = source.indexOf("md:col-span-2");

    expect(source).toContain("md:grid-cols-5");
    expect(formColumn).toBeGreaterThan(-1);
    expect(channelColumn).toBeGreaterThan(formColumn);
  });

  it("is one column while the slot is empty, instead of half a grid", () => {
    const source = code(SECTION);

    expect(source).toContain("const hasForm = form !== undefined");
    expect(source).toContain(`hasForm && "md:grid-cols-5`);
  });

  it("puts up no controls that do nothing", () => {
    const source = code(SECTION);

    for (const element of [ "<form", "<input", "<textarea", "<button", "<Button", "placeholder" ]) {
      expect(source, `${element} is rendered before the form exists`).not.toContain(element);
    }
  });
});

describe("ContactChannels", () => {
  it("stays a Server Component", () => {
    expect(code(CHANNELS)).not.toMatch(CLIENT_DIRECTIVE);
  });

  it("reads its three destinations from SITE and holds none of its own", () => {
    const source = code(CHANNELS);

    expect(source).toContain("mailto:${SITE.email}");
    expect(source).toContain("href={SITE.linkedin}");
    expect(source).toContain("href={SITE.github}");
    expect(source).not.toMatch(/href="https?:/);
  });

  it("takes nothing from the profile domain, whose socials are the footer's", () => {
    // The dependency rule forbids the arrow; this says the same thing where the file is
    // read, since SITE is what both the CV and this section agree on.
    expect(code(CHANNELS)).not.toContain("@/domains/profile");
  });

  it("never publishes the phone number", () => {
    const source = code(CHANNELS);

    expect(source).not.toContain("SITE.phone");
    expect(source).not.toContain(SITE.phone);
  });

  it("shows the address in the clear, so it can be copied and read out", () => {
    expect(code(CHANNELS)).toContain("{SITE.email}");
  });

  it("underlines the mail link, which has no other non-colour affordance", () => {
    // The two external links carry the arrow glyph instead; this one opens no tab.
    const source = code(CHANNELS);

    expect(source).toContain("underline underline-offset-4");
  });

  it("heads the block with an h3, so the outline skips no level", () => {
    const source = code(CHANNELS);

    expect(source).toContain("<h3");
    expect(source).not.toContain("<h2");
  });
});
