// src/domains/core/seo/graphs.test.ts
import { describe, expect, it } from "vitest";

import { LOCALES } from "@/domains/core/config/locales";
import type { Locale } from "@/domains/core/types";

/**
 * The origin every assertion is written against. site.ts reads NEXT_PUBLIC_SITE_URL once,
 * at module load, so it is assigned before the dynamic imports below.
 */
const ORIGIN = "https://matteoleccese.com";

process.env.NEXT_PUBLIC_SITE_URL = ORIGIN;

const { SITE } = await import("@/domains/core/config/site");
const { buildHomeGraph, buildLegalGraph } = await import("@/domains/core/seo/graphs");
const { serializeGraph } = await import("@/domains/core/seo/JsonLd");

type Graph = ReturnType<typeof buildHomeGraph>;
type Node = Record<string, unknown>;

/** The copy the graphs are built from, standing in for the content domains. */
const HOME_COPY = {
  title: "Matteo Leccese Full Stack Developer",
  description: "Full Stack Developer building web platforms and backend systems.",
  jobTitle: "Full Stack Developer",
  knowsAbout: [ "TypeScript", "Next.js", "Laravel" ],
  currentEmployer: "Flusso Dynamics Group",
  alumniOf: { name: "Universidad Rafael Belloso Chacín", alternateName: "URBE" },
};

const LEGAL_COPY = {
  title: "Privacy policy",
  description: "What this site does, and does not do, with your data.",
  homeLabel: "Home",
};

const LEGAL_ROUTES = [ "/privacy", "/cookies" ] as const;

function isNode (value: unknown): value is Node {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Every object in a graph, the root included, in depth-first order. */
function objectsOf (value: unknown, found: Node[] = []): Node[] {
  if (Array.isArray(value)) {
    for (const item of value) objectsOf(item, found);

    return found;
  }

  if (!isNode(value)) return found;

  found.push(value);
  for (const item of Object.values(value)) objectsOf(item, found);

  return found;
}

/** Every string in a graph, at any depth. */
function stringsOf (value: unknown, found: string[] = []): string[] {
  if (typeof value === "string") found.push(value);
  if (Array.isArray(value)) for (const item of value) stringsOf(item, found);
  if (isNode(value)) for (const item of Object.values(value)) stringsOf(item, found);

  return found;
}

function idOf (node: Node): string | null {
  const id = node[ "@id" ];

  return typeof id === "string" ? id : null;
}

/** The @ids of the nodes a graph defines: an @id next to an @type. */
function declaredIds (graph: Graph): string[] {
  return objectsOf(graph)
    .filter((node) => node[ "@type" ] !== undefined)
    .map(idOf)
    .filter((id): id is string => id !== null);
}

/** The @ids a graph points at: an @id with no @type beside it. */
function referencedIds (graph: Graph): string[] {
  return objectsOf(graph)
    .filter((node) => node[ "@type" ] === undefined)
    .map(idOf)
    .filter((id): id is string => id !== null);
}

function nodeOfType (graph: Graph, type: string): Node {
  const node = objectsOf(graph).find((candidate) => candidate[ "@type" ] === type);

  expect(node, `no ${type} node in the graph`).toBeDefined();

  return node ?? {};
}

const homeGraph = (locale: Locale): Graph => buildHomeGraph(locale, HOME_COPY);

/** Every graph the site emits, in both locales. */
function everyGraph (): Graph[] {
  return LOCALES.flatMap((locale) => [
    homeGraph(locale),
    ...LEGAL_ROUTES.map((route) => buildLegalGraph(locale, route, LEGAL_COPY)),
  ]);
}

describe("graph shape", () => {
  it("declares the context and the nodes each page needs", () => {
    const home = homeGraph("en");

    expect(home[ "@context" ]).toBe("https://schema.org");
    expect(home[ "@graph" ].map((node) => (node as Node)[ "@type" ]))
      .toEqual([ "ProfilePage", "Person", "WebSite" ]);

    const legal = buildLegalGraph("en", "/privacy", LEGAL_COPY);

    expect(legal[ "@context" ]).toBe("https://schema.org");
    expect(legal[ "@graph" ].map((node) => (node as Node)[ "@type" ]))
      .toEqual([ "WebPage", "BreadcrumbList" ]);
  });
});

describe("@id uniqueness", () => {
  it("defines every @id once inside each graph", () => {
    for (const graph of everyGraph()) {
      const ids = declaredIds(graph);

      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("names the same Person and WebSite from every locale", () => {
    const english = homeGraph("en");
    const spanish = homeGraph("es");

    expect(idOf(nodeOfType(spanish, "Person"))).toBe(idOf(nodeOfType(english, "Person")));
    expect(idOf(nodeOfType(spanish, "WebSite"))).toBe(idOf(nodeOfType(english, "WebSite")));
  });

  it("gives each page of each locale its own page @id", () => {
    const pageIds = [
      ...LOCALES.map((locale) => idOf(nodeOfType(homeGraph(locale), "ProfilePage"))),
      ...LOCALES.flatMap((locale) => LEGAL_ROUTES.map((route) => (
        idOf(nodeOfType(buildLegalGraph(locale, route, LEGAL_COPY), "WebPage"))
      ))),
    ];

    expect(new Set(pageIds).size).toBe(pageIds.length);
  });
});

describe("reference resolution", () => {
  it("resolves every reference of a graph inside the graph or on the home page", () => {
    const defined = new Set(LOCALES.flatMap((locale) => declaredIds(homeGraph(locale))));

    for (const graph of everyGraph()) {
      for (const id of declaredIds(graph)) defined.add(id);
    }

    for (const graph of everyGraph()) {
      for (const id of referencedIds(graph)) expect([ ...defined ]).toContain(id);
    }
  });

  it("resolves the home page's own references without leaving the graph", () => {
    for (const locale of LOCALES) {
      const graph = homeGraph(locale);
      const defined = new Set(declaredIds(graph));

      for (const id of referencedIds(graph)) expect([ ...defined ]).toContain(id);
    }
  });

  it("points the profile page at the Person and at the WebSite", () => {
    const graph = homeGraph("en");
    const profile = nodeOfType(graph, "ProfilePage");

    expect(profile.mainEntity).toEqual({ "@id": idOf(nodeOfType(graph, "Person")) });
    expect(profile.isPartOf).toEqual({ "@id": idOf(nodeOfType(graph, "WebSite")) });
    expect(nodeOfType(graph, "WebSite").publisher)
      .toEqual({ "@id": idOf(nodeOfType(graph, "Person")) });
  });

  it("points a legal page at its own breadcrumb", () => {
    for (const route of LEGAL_ROUTES) {
      const graph = buildLegalGraph("es", route, LEGAL_COPY);

      expect(nodeOfType(graph, "WebPage").breadcrumb)
        .toEqual({ "@id": idOf(nodeOfType(graph, "BreadcrumbList")) });
    }
  });
});

describe("URLs", () => {
  it("are absolute and https everywhere in every graph", () => {
    for (const graph of everyGraph()) {
      for (const value of stringsOf(graph)) {
        expect(value.startsWith("/")).toBe(false);
        if (value.includes("://")) expect(value.startsWith("https://")).toBe(true);
      }
    }
  });

  it("address every page at its own canonical URL", () => {
    expect(nodeOfType(homeGraph("en"), "ProfilePage").url).toBe(`${ORIGIN}/`);
    expect(nodeOfType(homeGraph("es"), "ProfilePage").url).toBe(`${ORIGIN}/es`);
    expect(nodeOfType(buildLegalGraph("en", "/privacy", LEGAL_COPY), "WebPage").url)
      .toBe(`${ORIGIN}/privacy`);
    expect(nodeOfType(buildLegalGraph("es", "/cookies", LEGAL_COPY), "WebPage").url)
      .toBe(`${ORIGIN}/es/cookies`);
  });

  it("walk the breadcrumb from the home of the same locale", () => {
    const graph = buildLegalGraph("es", "/privacy", LEGAL_COPY);

    expect(nodeOfType(graph, "BreadcrumbList").itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: `${ORIGIN}/es` },
      { "@type": "ListItem", position: 2, name: LEGAL_COPY.title, item: `${ORIGIN}/es/privacy` },
    ]);
  });
});

describe("no personal data beyond what the page already shows", () => {

  /** The only properties the Person node may carry. */
  const ALLOWED_PERSON_KEYS = [
    "@type", "@id", "name", "givenName", "familyName", "url", "image", "jobTitle",
    "description", "address", "knowsLanguage", "knowsAbout", "hasOccupation", "sameAs",
    "alumniOf", "worksFor",
  ];

  const FORBIDDEN_KEYS = [
    "email", "telephone", "faxNumber", "contactPoint", "birthDate", "birthPlace",
    "nationality", "streetAddress", "postalCode", "taxID", "vatID",
  ];

  it("never prints the unpublished phone number, in any shape", () => {
    const digits = SITE.phone.replace(/\D/g, "");

    expect(digits.length).toBeGreaterThan(8);

    for (const graph of everyGraph()) {
      const json = JSON.stringify(graph);

      expect(json).not.toContain(SITE.phone);
      expect(json.replace(/\D/g, "")).not.toContain(digits);
    }
  });

  it("never prints the email address", () => {
    for (const graph of everyGraph()) {
      const json = JSON.stringify(graph);

      expect(json).not.toContain(SITE.email);
      expect(json).not.toContain("mailto:");
      expect(json).not.toContain("@gmail");
    }
  });

  it("carries none of the properties that would leak contact or identity data", () => {
    for (const graph of everyGraph()) {
      for (const node of objectsOf(graph)) {
        for (const key of FORBIDDEN_KEYS) expect(Object.keys(node)).not.toContain(key);
      }
    }
  });

  it("keeps the Person node to the properties this test allows", () => {
    expect(Object.keys(nodeOfType(homeGraph("en"), "Person")).sort())
      .toEqual([ ...ALLOWED_PERSON_KEYS ].sort());
  });

  it("locates the Person at region and country level only", () => {
    expect(nodeOfType(homeGraph("en"), "Person").address).toEqual({
      "@type": "PostalAddress",
      addressRegion: SITE.location.region,
      addressCountry: SITE.location.country,
    });
  });

  it("links only the two public profiles", () => {
    expect(nodeOfType(homeGraph("en"), "Person").sameAs).toEqual([ SITE.github, SITE.linkedin ]);
  });
});

describe("facts the Person states", () => {
  it("lists the skills it is given alongside the subject areas", () => {
    const person = nodeOfType(homeGraph("en"), "Person");

    expect(person.knowsAbout).toEqual(expect.arrayContaining([ ...HOME_COPY.knowsAbout ]));
    expect(person.knowsAbout).toEqual(expect.arrayContaining([ "Full stack web development" ]));
  });

  it("states the job title it is given, in the occupation too", () => {
    const person = nodeOfType(homeGraph("es"), "Person");

    expect(person.jobTitle).toBe(HOME_COPY.jobTitle);
    expect(person.hasOccupation).toMatchObject({ "@type": "Occupation", name: HOME_COPY.jobTitle });
  });

  it("declares the employer and the degree only when it is given them", () => {
    const withBoth = nodeOfType(homeGraph("en"), "Person");

    expect(withBoth.worksFor).toEqual({
      "@type": "Organization",
      name: HOME_COPY.currentEmployer,
    });
    expect(withBoth.alumniOf).toMatchObject({ alternateName: "URBE" });

    const graph = buildHomeGraph("en", { ...HOME_COPY, currentEmployer: null, alumniOf: null });
    const person = nodeOfType(graph, "Person");

    expect(Object.keys(person)).not.toContain("worksFor");
    expect(Object.keys(person)).not.toContain("alumniOf");
  });

  it("writes the page in the locale it is built for", () => {
    for (const locale of LOCALES) {
      expect(nodeOfType(homeGraph(locale), "ProfilePage").inLanguage).toBe(locale);
      expect(nodeOfType(homeGraph(locale), "WebSite").inLanguage).toBe(locale);
    }
  });
});

describe("serializeGraph", () => {
  it("escapes < so a string can never close the script tag", () => {
    const graph = buildLegalGraph("en", "/privacy", {
      ...LEGAL_COPY,
      title: "</script><script>alert(1)</script>",
    });
    const json = serializeGraph(graph);

    expect(json).not.toContain("<");
    expect(json).toContain("\\u003c/script");
  });

  it("stays valid JSON that parses back to the graph", () => {
    const graph = homeGraph("es");

    expect(JSON.parse(serializeGraph(graph))).toEqual(JSON.parse(JSON.stringify(graph)));
  });
});
