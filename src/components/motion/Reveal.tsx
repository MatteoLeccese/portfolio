// src/components/motion/Reveal.tsx
"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode, type Ref } from "react";

import { observeReveal } from "@/lib/motion/reveal-observer";
import { STAGGER_MAX_ITEMS } from "@/lib/motion/tokens";

type RevealTag = "div" | "section" | "article" | "li" | "ul" | "ol" | "p" | "span" | "figure";

interface RevealProps {
  children: ReactNode;
  className?: string;
  as?: RevealTag;

  /**
   * Stagger index, 0 to 11. Feeds the CSS custom property the delay is derived from;
   * it is not a duration. Omit it inside <Stagger>, where the index comes from
   * :nth-child.
   */
  step?: number;
}

/**
 * Wraps its children and fades and lifts them in, once, when they enter the viewport.
 *
 * It marks the element with `data-reveal="hidden"` and registers it with the shared
 * observer; the hidden state and the transition live in CSS, behind `html[data-motion]`,
 * and only `opacity` and `transform` animate. `children` arrives already rendered from a
 * Server Component and is never hydrated.
 */
export function Reveal ({ children, className, as: Tag = "div", step }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;

    if (node === null) {
      return undefined;
    }

    return observeReveal(node);
  }, []);

  const style = step === undefined
    ? undefined
    : ({ "--motion-reveal-index": Math.min(Math.max(step, 0), STAGGER_MAX_ITEMS - 1) } as CSSProperties);

  return (
    <Tag ref={ref as Ref<never>} className={className} data-reveal="hidden" style={style}>
      {children}
    </Tag>
  );
}
