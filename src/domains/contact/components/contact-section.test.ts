// src/domains/contact/components/contact-section.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { SITE } from "@/domains/core/config/site";
import en from "../../../../messages/en.json";
import es from "../../../../messages/es.json";

/**
 * Guards for the Contact layout and for the two paths it can mount: the Resend-backed
 * form, and the panel whose only action is a `mailto:` link.
 *
 * NEXT_PUBLIC_USE_RESEND_EMAIL_FORM is inlined at build time, so only one of the two is
 * rendered by a given build and the other cannot be reached from a test at all. What is
 * asserted here is therefore read from the source text; the environment is `node` and all
 * three files are Server Components.
 */
const ROOT = process.cwd();

const SECTION = "src/domains/contact/components/ContactSection.tsx";

const MAIL = "src/domains/contact/components/ContactMailPanel.tsx";

const CHANNELS = "src/domains/contact/components/ContactChannels.tsx";

/** The client directive as a pattern, so counting the islands over src/ skips this file. */
const CLIENT_DIRECTIVE = new RegExp(`^"use\\s+client"`, "m");

/** Any address-shaped token, which SITE.email stands in for. */
const EMAIL_LIKE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

const CATALOGUES = [ [ "en", en ], [ "es", es ] ] as const;

/** Source with comments stripped, so a guard matches code and not the prose around it. */
function code (path: string): string {
  return readFileSync(join(ROOT, path), "utf8")
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .replaceAll(/^\s*\/\/.*$/gm, "");
}

function occurrences (source: string, needle: string): number {
  return source.split(needle).length - 1;
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
    expect(source).toContain("form ?? <ContactForm ownerEmail={SITE.email} />");
  });

  it("puts the contact path first in the DOM and gives it three of the five columns", () => {
    const source = code(SECTION);
    const pathColumn = source.indexOf("md:col-span-3");
    const channelColumn = source.indexOf("md:col-span-2");

    expect(source).toContain("md:grid-cols-5");
    expect(pathColumn).toBeGreaterThan(-1);
    expect(channelColumn).toBeGreaterThan(pathColumn);
  });

  it("branches on the flag itself, which a build can fold to a constant", () => {
    const source = code(SECTION);

    expect(source).toContain(`import { SITE, USE_RESEND_EMAIL_FORM } from "@/domains/core/config/site"`);
    expect(source).toContain("{USE_RESEND_EMAIL_FORM");
    expect(occurrences(source, "USE_RESEND_EMAIL_FORM")).toBe(2);
    expect(source, "the flag is read once, in the config module").not.toContain("process.env");
  });

  it("mounts one path per branch, so the unused one can be dropped", () => {
    const source = code(SECTION);

    expect(source).toContain("? (form ?? <ContactForm ownerEmail={SITE.email} />)");
    expect(source).toContain(": <ContactMailPanel />");
    expect(occurrences(source, "<ContactForm")).toBe(1);
    expect(occurrences(source, "<ContactMailPanel")).toBe(1);
  });

  it("keeps the heading, the lead and the channels on both paths", () => {
    const source = code(SECTION);
    const heading = source.indexOf("<SectionHeading");
    const branch = source.indexOf("{USE_RESEND_EMAIL_FORM");
    const channels = source.indexOf("<ContactChannels />");

    expect(source).toContain(`subtitle={t("subtitle")}`);
    expect(heading).toBeGreaterThan(-1);
    expect(branch, "the branch sits after the heading, which both paths keep")
      .toBeGreaterThan(heading);
    expect(channels, "the channels sit after the branch, which both paths keep")
      .toBeGreaterThan(branch);
    expect(occurrences(source, "<ContactChannels />")).toBe(1);
  });

  it("puts up no control of its own: each path brings its own", () => {
    const source = code(SECTION);

    for (const element of [ "<form", "<input", "<textarea", "<button", "<Button", "placeholder" ]) {
      expect(source, `${element} is rendered by the section itself`).not.toContain(element);
    }
  });
});

describe("ContactMailPanel", () => {
  it("stays a Server Component", () => {
    expect(code(MAIL)).not.toMatch(CLIENT_DIRECTIVE);
  });

  it("reads its destination from SITE and holds no address of its own", () => {
    const source = code(MAIL);

    expect(source).toContain("mailto:${SITE.email}");
    expect(source).not.toContain(SITE.email);
    expect(source).not.toMatch(EMAIL_LIKE);
  });

  it("offers a real link, which the keyboard reaches and the button treatment makes obvious", () => {
    const source = code(MAIL);

    expect(source).toContain("<a");
    expect(source).toContain("buttonVariants(");
    expect(source).not.toContain("<Button");
    expect(source).not.toContain("onClick");
  });

  it("names that link with its visible label and the address it points at", () => {
    expect(code(MAIL)).toContain(`aria-label={t("ctaAria", { email: SITE.email })}`);

    for (const [ locale, catalogue ] of CATALOGUES) {
      const { cta, ctaAria } = catalogue.Contact.mail;

      expect(ctaAria.startsWith(cta), `${locale}: the accessible name drops the visible label`)
        .toBe(true);
      expect(ctaAria, `${locale}: the accessible name omits the address`).toContain("{email}");
    }
  });

  it("puts up no field and submits nothing", () => {
    const source = code(MAIL);

    for (const element of [ "<form", "<input", "<textarea", "action=", "placeholder" ]) {
      expect(source, `${element} belongs to the form path`).not.toContain(element);
    }
  });

  it("heads the panel with an h3, so the outline skips no level", () => {
    const source = code(MAIL);

    expect(source).toContain("<h3");
    expect(source).not.toContain("<h2");
  });

  it("reads every string from the Contact namespace, and none of its own", () => {
    const source = code(MAIL);

    expect(source).toContain(`getTranslations("Contact.mail")`);

    for (const key of [ "title", "body", "cta", "ctaAria", "note" ]) {
      expect(en.Contact.mail, `Contact.mail.${key} is missing`).toHaveProperty(key);
      expect(es.Contact.mail, `Contact.mail.${key} is missing`).toHaveProperty(key);
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
