// src/app/[locale]/_components/ScrollSentinel.tsx
"use client";

import { useEffect } from "react";

import { usePassed } from "@/hooks/usePassed";

/**
 * Sets html[data-scrolled] to "true" once the page has moved off the top and back to
 * "false" at the top. Renders nothing: the 1 px sentinel it watches lives in
 * [locale]/layout.tsx, as the first child of <main>.
 *
 * The header resolves its own state from that attribute in CSS, so no class is toggled
 * on it and no component re-renders while the page scrolls.
 */
export function ScrollSentinel () {
  const scrolled = usePassed("scroll-sentinel");

  useEffect(() => {
    document.documentElement.dataset.scrolled = scrolled ? "true" : "false";
  }, [ scrolled ]);

  return null;
}
