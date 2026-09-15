// src/domains/core/seo/JsonLd.tsx
import type { Graph } from "schema-dts";

/**
 * Serialises a graph for a <script> body, escaping every "<" as the six characters
 * \u003c, so that a "</script>" inside a string value cannot close the tag.
 */
export function serializeGraph (graph: Graph): string {
  return JSON.stringify(graph).replace(/</g, "\\u003c");
}

/** Renders a JSON-LD graph as an application/ld+json script. */
export function JsonLd ({ graph }: { graph: Graph; }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeGraph(graph) }}
    />
  );
}
