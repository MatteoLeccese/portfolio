// src/components/motion/Stagger.tsx
"use client";

import { useEffect, useRef, type ReactNode, type Ref } from "react";

import { observeRevealGroup } from "@/lib/motion/reveal-observer";

type StaggerTag = "div" | "ul" | "ol" | "dl";
type StaggerStep = "tight" | "base" | "loose";

interface StaggerProps {
  children: ReactNode;
  className?: string;
  as?: StaggerTag;
  step?: StaggerStep;
}

/**
 * Reveals a group of children in sequence, with a single observer on the group. Every
 * direct child must carry data-reveal="hidden", emitted by whatever renders it.
 *
 * The stagger is CSS: `[data-stagger] > *:nth-child(n)` sets --motion-reveal-index and
 * the transition-delay is derived from it; `step` picks the delay scale. Under
 * prefers-reduced-motion the CSS keeps the fade and drops the translate and the delay.
 */
export function Stagger ({ children, className, as: Tag = "div", step = "base" }: StaggerProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;

    if (node === null) {
      return undefined;
    }

    return observeRevealGroup(node);
  }, []);

  return (
    <Tag ref={ref as Ref<never>} className={className} data-stagger={step}>
      {children}
    </Tag>
  );
}
