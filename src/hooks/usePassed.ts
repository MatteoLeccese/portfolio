// src/hooks/usePassed.ts
import { useEffect, useState } from "react";

/**
 * True once the element with that id has left the viewport through the top.
 *
 * Uses a single IntersectionObserver at threshold 0 that keeps reporting in both
 * directions. No "use client" of its own: a hook inherits the directive of the component
 * that imports it.
 */
export function usePassed (id: string): boolean {
  const [ passed, setPassed ] = useState(false);

  useEffect(() => {
    const node = document.getElementById(id);

    if (node === null) {
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[ 0 ];

      if (entry === undefined) {
        return;
      }

      setPassed(!entry.isIntersecting);
    }, { threshold: 0 });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [ id ]);

  return passed;
}
