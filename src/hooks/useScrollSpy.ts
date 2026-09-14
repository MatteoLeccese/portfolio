// src/hooks/useScrollSpy.ts
import { useEffect, useState } from "react";

import { SECTION_IDS, type SectionId } from "@/domains/core/config/navigation";

/** Reads --header-height in pixels, by measuring a throwaway hidden probe element. */
function headerHeightPx (): number {
  const probe = document.createElement("div");

  probe.style.cssText = "position:absolute;top:0;left:0;visibility:hidden;height:var(--header-height)";

  document.body.appendChild(probe);

  const height = probe.getBoundingClientRect().height;

  probe.remove();

  return height;
}

/**
 * Id of the section occupying the band under the header, or null until one matches.
 *
 * A single IntersectionObserver watches all seven sections; there is no scroll listener
 * and no layout read while scrolling. Takes no argument: the ids come from SECTION_IDS.
 */
export function useScrollSpy (): SectionId | null {
  const [ activeId, setActiveId ] = useState<SectionId | null>(null);

  useEffect(() => {
    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.add(entry.target.id);
          } else {
            visible.delete(entry.target.id);
          }
        }

        // Several in the band: the first in document order wins.
        // None in the band (gap between sections): keep the previous one.
        const next = SECTION_IDS.find((id) => visible.has(id));

        if (next !== undefined) {
          setActiveId(next);
        }
      },
      { rootMargin: `-${headerHeightPx()}px 0px -62% 0px`, threshold: 0 }
    );

    for (const id of SECTION_IDS) {
      const node = document.getElementById(id);

      if (node !== null) {
        observer.observe(node);
      }
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return activeId;
}
