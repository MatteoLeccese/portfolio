// src/domains/experience/components/experience-section.test.ts
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { monogram } from "@/domains/experience/components/CompanyLogo";
import { experience } from "@/domains/experience/content/experience";
import { cn } from "@/lib/utils";

/**
 * Guards for the Experience section. Vitest runs on the `node` environment and every file
 * but TimelineProgress is a Server Component, so nothing here mounts them: what is checked
 * is the markup contract the section shares with SectionHeading, Reveal, Stagger, the
 * scroll spy and the timeline CSS, read from the source text.
 */
const ROOT = process.cwd();

const FOLDER = "src/domains/experience/components";
const SECTION = `${FOLDER}/ExperienceSection.tsx`;
const TIMELINE = `${FOLDER}/ExperienceTimeline.tsx`;
const ITEM = `${FOLDER}/ExperienceItem.tsx`;
const LOGO = `${FOLDER}/CompanyLogo.tsx`;
const PROGRESS = `${FOLDER}/TimelineProgress.tsx`;

/** The client directive as a pattern, so counting the islands over src/ skips this file. */
const CLIENT_DIRECTIVE = new RegExp(`^"use\\s+client"`, "m");

/**
 * Every `transition-*` utility written in a file. A module constant because
 * @stylistic/wrap-regex demands parentheses around a regex used as a member expression.
 */
const TRANSITION_UTILITY = /transition-[a-z]+/g;

/** Source with comments stripped, so a guard matches code and not the prose around it. */
function code (path: string): string {
  return readFileSync(join(ROOT, path), "utf8")
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .replaceAll(/^\s*\/\/.*$/gm, "");
}

describe("ExperienceSection", () => {
  it("stays a Server Component", () => {
    expect(code(SECTION)).not.toMatch(CLIENT_DIRECTIVE);
  });

  it("leaves the anchor id to SectionHeading and names the region after its h2", () => {
    const source = code(SECTION);

    expect(source).toContain(`const SECTION_ID: SectionId = "experience"`);
    expect(source).toContain("<SectionHeading");
    expect(source).toContain("id={SECTION_ID}");
    expect(source).toContain("aria-labelledby={`${SECTION_ID}-title`}");
    // A second element with the same id is what useScrollSpy would observe at random.
    expect(source).not.toContain("<section id=");
    // Both belong to SectionHeading; a second copy would move the anchor or rename it.
    expect(source).not.toContain("scroll-mt-header");
    expect(source).not.toContain("aria-label=");
  });

  it("sits in the page container and takes the shared vertical rhythm", () => {
    expect(code(SECTION)).toContain("container-page section-y");
  });

  it("derives the two numbers of the subtitle instead of writing them", () => {
    const source = code(SECTION);

    expect(source).toContain("yearsOfExperienceAt(SITE.careerStart");
    expect(source).toContain("companies: entries.length");
  });

  it("hands the present label to the query rather than defaulting it there", () => {
    expect(code(SECTION)).toContain(`getExperienceTimeline(locale, common("present"))`);
  });

  it("renders the content array and never a hand-written entry", () => {
    const source = code(SECTION);

    expect(source).toContain("entries={entries}");
    for (const entry of experience) expect(source).not.toContain(entry.company);
  });
});

describe("ExperienceTimeline", () => {
  it("stays a Server Component", () => {
    expect(code(TIMELINE)).not.toMatch(CLIENT_DIRECTIVE);
  });

  it("emits the two classes the timeline CSS is written against", () => {
    const source = code(TIMELINE);

    expect(source).toContain(`"timeline`);
    expect(source).toContain(`className="timeline-rail"`);
  });

  it("keeps the rail and the progress fill outside the list", () => {
    const source = code(TIMELINE);

    // An <ol> whose direct children are not <li> is invalid, and a screen reader stops
    // reporting the number of positions.
    expect(source.indexOf("timeline-rail")).toBeLessThan(source.indexOf("<ol"));
    expect(source.indexOf("<TimelineProgress")).toBeLessThan(source.indexOf("<ol"));
    expect(source.indexOf("<ol")).toBeLessThan(source.indexOf("<Reveal"));
  });

  it("makes every entry a list item and registers it with the observer", () => {
    const source = code(TIMELINE);

    expect(source).toContain(`<Reveal as="li" className="relative" key={entry.id} step={index}>`);
    expect(source).toContain("entries.map((entry, index)");
  });

  it("uses the brand scale for the decorative dot and nowhere else", () => {
    const source = code(TIMELINE);

    expect(source).toContain(`<span aria-hidden="true" className={DOT} />`);
    expect(source).toContain("bg-brand-600");
    expect(source.match(/brand-/g)).toHaveLength(1);
  });

  it("leaves the rail visible when nothing hydrates", () => {
    // The rail is plain CSS; only the fill over it belongs to the island.
    expect(code(TIMELINE)).not.toContain("opacity-0");
  });
});

describe("ExperienceItem", () => {
  it("stays a Server Component and renders no list item of its own", () => {
    const source = code(ITEM);

    expect(source).not.toMatch(CLIENT_DIRECTIVE);
    // The surrounding <Reveal as="li"> is the list item; a second one would nest.
    expect(source).toMatch(/return\s*\(\s*<Card/);
  });

  it("carries the reveal attribute on every direct child of the group", () => {
    const source = code(ITEM);

    // <Stagger> observes the group and not the children: a child that arrives without the
    // attribute is never hidden and the stagger plays half-empty.
    expect(source).toContain(`<Stagger as="ul"`);
    expect(source).toContain(`data-reveal="hidden"`);
  });

  it("collapses the long lists with native HTML and no second island", () => {
    const source = code(ITEM);

    expect(source).toContain("<details");
    expect(source).toContain("<summary");
    expect(source).not.toContain("useState");
    expect(source).not.toContain("onClick");
    expect(source).not.toContain("aria-expanded");
  });

  it("shows the first three bullets and keeps the rest reachable at every width", () => {
    const source = code(ITEM);

    expect(source).toContain("const PEEK = 3");
    expect(source).toContain("entry.highlights.slice(PEEK)");
    // Below md the disclosure holds them; from md the one list renders them all.
    expect(source).toContain(`"hidden md:list-item"`);
    expect(source).toContain(`className="group md:hidden"`);
  });

  it("labels the disclosure from the catalogue in both states", () => {
    const source = code(ITEM);

    expect(source).toContain(`t("showAll", { count: entry.highlights.length })`);
    expect(source).toContain(`t("showLess")`);
    // The label alternates from the open attribute, so no script keeps the two in sync.
    expect(source).toContain("group-open:hidden");
    expect(source).toContain("hidden group-open:inline");
  });

  it("keeps the prose at the site measure however wide the card gets", () => {
    const source = code(ITEM);

    expect(source).toContain("max-w-readable");
    // The facts and the story split into two columns only where there is room for both.
    expect(source).toContain("lg:grid lg:grid-cols-3");
    expect(source).not.toContain("md:grid-cols-");
  });

  it("keeps the disclosure at the touch size the project asks for", () => {
    const source = code(ITEM);

    expect(source).toContain("min-h-touch");
    // `touch-target` has two declared consumers and this is not one of them.
    expect(source).not.toContain("touch-target");
  });

  it("gives the chip and the screen-reader wording different jobs", () => {
    const source = code(ITEM);

    expect(source).toContain(`<Badge aria-hidden="true" variant="accent">{t("current")}</Badge>`);
    expect(source).toContain(`<span className="sr-only">{currentLabel}</span>`);
  });

  it("leaves the rail, the dot and the brand scale to the timeline", () => {
    const source = code(ITEM);

    expect(source).not.toContain("brand-");
    expect(source).not.toContain("timeline");
  });

  it("writes no colour of its own and animates only compositable properties", () => {
    const source = code(ITEM);

    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    // The title names the properties and not the blanket utility: `no-restricted-syntax`
    // vetoes that string in any Literal under src/**, and an assertion is a Literal.
    expect([ ...new Set(source.match(TRANSITION_UTILITY) ?? []) ].sort())
      .toEqual([ "transition-colors", "transition-none", "transition-transform" ]);
    expect(source).toContain("motion-reduce:transition-none");
  });
});

describe("TimelineProgress", () => {
  it("is the only client island of the section", () => {
    const islands = readdirSync(join(ROOT, FOLDER))
      .filter((file) => file.endsWith(".tsx"))
      .filter((file) => CLIENT_DIRECTIVE.test(readFileSync(join(ROOT, FOLDER, file), "utf8")));

    expect(islands).toEqual([ "TimelineProgress.tsx" ]);
  });

  it("wraps itself in MotionIsland instead of hoisting it up the tree", () => {
    const source = code(PROGRESS);

    expect(source).toContain("<MotionIsland>");
    expect(source).toContain("</MotionIsland>");
  });

  it("imports motion through the one gate and pins the spring to the token", () => {
    const source = code(PROGRESS);

    expect(source).toContain(`from "@/components/motion/MotionIsland"`);
    expect(source).not.toContain(`"motion/react"`);
    expect(source).toContain("SPRING_SMOOTH");
  });

  it("reads the motion preference itself, because a MotionValue skips MotionConfig", () => {
    expect(code(PROGRESS)).toContain("reduced === true ? 1 : progress");
  });

  it("renders decoration and never content", () => {
    const source = code(PROGRESS);

    expect(source).toContain(`aria-hidden="true"`);
    expect(source).toContain("timeline-progress-track");
    expect(source).toContain("timeline-progress-fill");
    // A motion component that receives data is a component on the wrong side of the line.
    expect(source).not.toContain("entry");
    expect(source).not.toContain("getTranslations");
  });
});

describe("CompanyLogo", () => {
  it("stays a Server Component", () => {
    expect(code(LOGO)).not.toMatch(CLIENT_DIRECTIVE);
  });

  it("takes the first letter of the first two words", () => {
    expect(monogram("Flusso Dynamics Group")).toBe("FD");
    expect(monogram("Bitnat Redes y Sistemas")).toBe("BR");
  });

  it("gives a single-word company a single letter", () => {
    expect(monogram("Servieduca")).toBe("S");
    expect(monogram("SousTitreur.com")).toBe("S");
  });

  it("survives padding, double spaces and line breaks", () => {
    expect(monogram("  Flusso   Dynamics  ")).toBe("FD");
    expect(monogram("Flusso\nDynamics")).toBe("FD");
  });

  it("upper-cases a lower-case name and keeps its accents", () => {
    expect(monogram("école supérieure")).toBe("ÉS");
  });

  it("returns an empty string rather than throwing on an empty name", () => {
    expect(monogram("")).toBe("");
    expect(monogram("   ")).toBe("");
  });

  it("renders the file through next/image and never a raw img", () => {
    const source = code(LOGO);

    expect(source).toContain(`import Image from "next/image"`);
    expect(source).not.toContain("<img");
    // The company name is written next to the mark, so the mark adds nothing to announce.
    expect(source).toContain(`alt=""`);
    expect(source).toContain(`aria-hidden="true"`);
  });

  it("falls back to the initials tile rather than to an empty box", () => {
    const source = code(LOGO);

    expect(source).toContain("logo === null");
    expect(source).toContain("{monogram(company)}");
    // One plate for both variants: same box, same radius, same surface.
    expect(source.match(/const PLATE =/g)).toHaveLength(1);
    expect(source.match(/\$\{PLATE\}/g)).toHaveLength(2);
  });

  it("keeps the lead type scale on the initials", () => {
    const source = code(LOGO);

    expect(source).toContain("text-lead");
    // `cn` would drop `text-lead`: twMerge files it with `text-foreground` and keeps the last.
    expect(source).not.toContain("cn(");
    expect(cn("text-lead", "text-foreground")).toBe("text-foreground");
  });
});

describe("the content the section is shaped for", () => {
  it("has a position to render", () => {
    expect(experience.length).toBeGreaterThan(0);
  });

  it("ships every logo file the content points at", () => {
    // The content test checks the shape of the path; this one opens the directory.
    for (const entry of experience) {
      if (entry.logo === null) continue;
      expect(existsSync(join(ROOT, "public", entry.logo)), `missing logo for "${entry.id}"`)
        .toBe(true);
    }
  });

  it("exercises the initials tile, and only where no logo exists", () => {
    const withoutLogo = experience.filter((entry) => entry.logo === null);

    expect(withoutLogo.map((entry) => entry.id)).toEqual([ "flusso-dynamics-group" ]);
    expect(withoutLogo.map((entry) => monogram(entry.company))).toEqual([ "FD" ]);
  });

  it("gives at least one card more bullets than the disclosure shows at once", () => {
    // With three bullets or fewer everywhere, the disclosure would never render and the
    // two labels in the catalogue would be dead copy.
    const longest = Math.max(...experience.map((entry) => entry.highlights.en.length));

    expect(longest).toBeGreaterThan(3);
  });
});
