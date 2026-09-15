// src/domains/projects/components/projects-section.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { ProjectCard } from "@/domains/projects/components/ProjectCard";
import type { Project } from "@/domains/projects/types";

/**
 * Guards for the Projects section, its empty state and the card nothing renders yet.
 *
 * ProjectCard is the reason half of this file exists: it ships ahead of its first entry,
 * so the only thing that can keep it from rotting is a check that fails the day its props
 * and the content model stop agreeing. The two fixtures below are typed as `Project` and
 * assigned to the component's own parameter type, which puts that agreement in the hands
 * of the typechecker. Nothing here mounts anything: the environment is `node` and every
 * file under test is a Server Component.
 */
const ROOT = process.cwd();

const SECTION = "src/domains/projects/components/ProjectsSection.tsx";
const EMPTY_STATE = "src/domains/projects/components/ProjectsEmptyState.tsx";
const CARD = "src/domains/projects/components/ProjectCard.tsx";

/** The client directive as a pattern, so counting the islands over src/ skips this file. */
const CLIENT_DIRECTIVE = new RegExp(`^"use\\s+client"`, "m");

/** Source with comments stripped, so a guard matches code and not the prose around it. */
function code (path: string): string {
  return readFileSync(join(ROOT, path), "utf8")
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .replaceAll(/^\s*\/\/.*$/gm, "");
}

/** Every field the model allows, including the four optional ones. */
const FULL_PROJECT: Project = {
  slug: "example-project",
  name: "Example",
  year: 2026,
  status: "live",
  summary: { en: "What it is.", es: "Qué es." },
  role: { en: "Sole author.", es: "Autor único." },
  tech: [ "Next.js", "TypeScript" ],
  cover: {
    src: "/projects/example-project.webp",
    width: 1600,
    height: 900,
    alt: { en: "A screenshot.", es: "Una captura." },
  },
  links: { live: "https://example.com", repo: "https://example.com/repo" },
  featured: true,
};

/** The other end of the model: no role, no cover, no links. */
const MINIMAL_PROJECT: Project = {
  slug: "minimal-project",
  name: "Minimal",
  year: 2026,
  status: "archived",
  summary: { en: "What it was.", es: "Qué fue." },
  tech: [],
  cover: null,
  links: {},
  featured: false,
};

describe("ProjectsSection", () => {
  it("stays a Server Component", () => {
    expect(code(SECTION)).not.toMatch(CLIENT_DIRECTIVE);
  });

  it("leaves the anchor id to SectionHeading and names the region after its h2", () => {
    const source = code(SECTION);

    expect(source).toContain(`<SectionHeading id="projects"`);
    expect(source).toContain(`aria-labelledby="projects-title"`);
    expect(source).not.toContain("<section id=");
    expect(source).not.toContain("scroll-mt-header");
    expect(source).not.toContain("aria-label=");
  });

  it("sits in the page container and takes the shared vertical rhythm", () => {
    expect(code(SECTION)).toContain("container-page section-y");
  });

  it("branches on the content file being empty, and on nothing else", () => {
    const source = code(SECTION);

    expect(source).toContain("entries.length === 0");
    expect(source).toContain("<ProjectsEmptyState");
    expect(source).toContain("<ProjectCard");
  });

  it("orders featured entries first and reads the rest from the array", () => {
    // The status never orders anything: the array plus the featured flag do.
    const source = code(SECTION);

    expect(source).toContain("Number(b.featured) - Number(a.featured)");
    expect(source).not.toContain("status");
  });

  it("goes to two columns only from md", () => {
    const source = code(SECTION);

    expect(source).toContain("md:grid-cols-2");
    expect(source).not.toContain("sm:");
    expect(source).not.toContain("max-width:");
  });
});

describe("ProjectsEmptyState", () => {
  it("stays a Server Component", () => {
    expect(code(EMPTY_STATE)).not.toMatch(CLIENT_DIRECTIVE);
  });

  it("uses the five keys the catalogue holds for it", () => {
    const source = code(EMPTY_STATE);

    for (const key of [
      "emptyKicker",
      "emptyTitle",
      "emptyBody",
      "emptyPrimaryCta",
      "emptySecondaryCta",
    ]) {
      expect(source, `${key} is not rendered`).toContain(`t("${key}")`);
    }
  });

  it("wears the surface of a real card, so the reader sees where the cards go", () => {
    const source = code(EMPTY_STATE);

    expect(source).toContain("rounded-xl border border-hairline bg-card");
    expect(source).toContain("shadow-elevation-1");
  });

  it("puts the icon inside the reveal that triggers it", () => {
    // The CSS is `[data-reveal="hidden"] .empty-state-icon`: outside a <Reveal> the class
    // is inert and the icon simply never animates.
    const source = code(EMPTY_STATE);
    const reveal = source.indexOf("<Reveal");
    const icon = source.indexOf("empty-state-icon");

    expect(reveal).toBeGreaterThan(-1);
    expect(icon).toBeGreaterThan(reveal);
  });

  it("pretends nothing: no ghost cards, no skeletons, no fake grid", () => {
    const source = code(EMPTY_STATE);

    expect(source).not.toContain("skeleton");
    expect(source).not.toContain("animate-pulse");
    expect(source).not.toContain("grid-cols-");
  });

  it("points its primary action at a section that exists", () => {
    // Typed as SectionId, so renaming the section is a build error rather than a link
    // that silently scrolls nowhere.
    const source = code(EMPTY_STATE);

    expect(source).toContain(`const EXPERIENCE_ANCHOR: SectionId = "experience"`);
    expect(source).toContain("href={`#${EXPERIENCE_ANCHOR}`}");
  });
});

describe("ProjectCard's prop contract", () => {
  it("takes a project with every optional field filled in", () => {
    const props: Parameters<typeof ProjectCard>[ 0 ] = { project: FULL_PROJECT, locale: "en" };

    expect(props.project.slug).toBe("example-project");
    expect(props.locale).toBe("en");
  });

  it("takes a project with no role, no cover and no links", () => {
    const props: Parameters<typeof ProjectCard>[ 0 ] = { project: MINIMAL_PROJECT, locale: "es" };

    expect(props.project.role).toBeUndefined();
    expect(props.project.cover).toBeNull();
    expect(props.project.links).toEqual({});
  });
});

describe("ProjectCard", () => {
  it("stays a Server Component", () => {
    expect(code(CARD)).not.toMatch(CLIENT_DIRECTIVE);
  });

  it("emits the slot the contract names it by", () => {
    expect(code(CARD)).toContain(`data-slot="project-card"`);
  });

  it("carries the attribute <Stagger> needs on each of its direct children", () => {
    expect(code(CARD)).toContain(`<li data-reveal="hidden">`);
  });

  it("exposes one link, and prefers the live site to the repository", () => {
    const source = code(CARD);

    expect(source).toContain("links.live ?? links.repo ?? links.caseStudy");
  });

  it("raises on hover only when the whole card is a link", () => {
    const source = code(CARD);

    expect(source).toContain(`href === undefined ? undefined : "card-interactive"`);
    // The one link stretches over the surface, which is what makes the card the target.
    expect(source).toContain("after:absolute after:inset-0");
  });

  it("reserves the space of the screenshot instead of shifting the layout", () => {
    const source = code(CARD);

    expect(source).toContain("height={cover.height}");
    expect(source).toContain("width={cover.width}");
    expect(source).toContain(`sizes="(min-width: 768px) 50vw, 100vw"`);
  });

  it("renders no media area at all when there is no cover", () => {
    expect(code(CARD)).toContain("cover === null");
  });

  it("labels the stack with the shared key instead of a string of its own", () => {
    expect(code(CARD)).toContain(`t("stack")`);
  });

  it("never prints the status", () => {
    expect(code(CARD)).not.toContain("status");
  });
});
