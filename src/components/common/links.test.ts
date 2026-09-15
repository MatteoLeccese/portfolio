// src/components/common/links.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { opensInNewTab } from "@/components/common/ExternalLink";
import { SITE } from "@/domains/core/config/site";

/**
 * Guards for the three link components. Vitest runs on the `node` environment and these
 * are Server Components that read the request locale, so nothing here mounts them: the
 * pure href logic is imported, the rest is read from the source text.
 */
const ROOT = process.cwd();

const EXTERNAL_LINK = "src/components/common/ExternalLink.tsx";
const SOCIAL_ICON = "src/components/common/SocialIcon.tsx";
const SOCIAL_LINKS = "src/domains/profile/components/SocialLinks.tsx";

/** Source with comments stripped, so a guard matches code and not the prose around it. */
function code (path: string): string {
  return readFileSync(join(ROOT, path), "utf8")
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .replaceAll(/^\s*\/\/.*$/gm, "");
}

describe("opensInNewTab", () => {
  it("is true for the http(s) URLs the site links to", () => {
    expect(opensInNewTab(SITE.github)).toBe(true);
    expect(opensInNewTab(SITE.linkedin)).toBe(true);
  });

  it("is false for the schemes that hand off to another application", () => {
    // A mailto: opens a composer, not a tab: target, rel and the "new tab" suffix would
    // all be lies, and the suffix is read out to every screen-reader user.
    expect(opensInNewTab(`mailto:${SITE.email}`)).toBe(false);
    expect(opensInNewTab("tel:+584246991599")).toBe(false);
  });

  it("does not depend on the case of the scheme", () => {
    expect(opensInNewTab("MAILTO:someone@example.com")).toBe(false);
  });
});

describe("ExternalLink", () => {
  it("emits the two classes the hover rule of globals.css is written against", () => {
    // `.external-link:hover .external-link-icon` is inert unless both land in the markup,
    // and nothing fails when they do not: the arrow simply stops moving.
    const source = code(EXTERNAL_LINK);

    expect(source).toContain(`"external-link`);
    expect(source).toContain(`className="external-link-icon size-4"`);
  });

  it("ties target, rel and the accessible suffix to the same decision", () => {
    const source = code(EXTERNAL_LINK);

    expect(source).toMatch(/const newTab = opensInNewTab\(href\)/);
    expect(source).toContain(`rel={newTab ? "noopener noreferrer" : undefined}`);
    expect(source).toContain(`target={newTab ? "_blank" : undefined}`);
  });

  it("takes the suffix from the catalogue and never writes it in English", () => {
    const source = code(EXTERNAL_LINK);

    expect(source).toContain(`const suffix = t("externalLink")`);
    expect(source.toLowerCase()).not.toContain("opens in a new tab");
  });

  it("hides the arrow from assistive technology", () => {
    expect(code(EXTERNAL_LINK)).toMatch(/<ArrowUpRight\s+aria-hidden="true"/);
  });
});

describe("SocialIcon", () => {
  it("routes `mail` to lucide and every other name to the mask", () => {
    const source = code(SOCIAL_ICON);

    expect(source).toMatch(/if \(icon === "mail"\)/);
    expect(source).toContain("url(/icons/icon-${slug}.svg)");
    expect(source).toContain("bg-current");
  });

  it("imports no brand component from lucide, which ships none", () => {
    const source = code(SOCIAL_ICON);

    expect(source).not.toContain("Github");
    expect(source).not.toContain("Linkedin");
  });

  it("hides the glyph, so the wrapping link owns the accessible name", () => {
    expect(code(SOCIAL_ICON).match(/aria-hidden="true"/g)).toHaveLength(2);
  });
});

describe("SocialLinks", () => {
  it("renders the content file and writes no href of its own", () => {
    const source = code(SOCIAL_LINKS);

    expect(source).toContain(`import { socials } from "@/domains/profile/content/socials"`);
    expect(source).toContain("socials.map");
    expect(source).toContain("href={social.href}");
    expect(source).not.toContain("https://");
  });

  it("names every anchor and hides the glyph inside it", () => {
    const source = code(SOCIAL_LINKS);

    expect(source).toContain("label={social.label}");
    expect(source).toContain("showIcon={false}");
  });

  it("gives every link a 44 px target", () => {
    expect(code(SOCIAL_LINKS)).toContain("touch-target");
  });
});
