// src/components/motion/CountUp.tsx
"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { EASE_ENTRANCE, cubicBezier } from "@/lib/motion/tokens";

/** Duration of the count animation, in milliseconds. */
const COUNT_DURATION_MS = 900;

interface CountUpProps {

  /** Final value. `children` already contains it, rendered on the server. */
  to: number;
  children: ReactNode;
}

/**
 * Counts from 0 to `to` once, the first time the element enters the viewport.
 *
 * Under prefers-reduced-motion it animates nothing and leaves the server-rendered value
 * in `children` on screen. Each frame writes `textContent` through a ref; the component
 * holds no React state.
 */
export function CountUp ({ to, children }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const node = ref.current;

    if (node === null || startedRef.current) {
      return undefined;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const ease = cubicBezier(EASE_ENTRANCE);
    let frame = 0;

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[ 0 ];

      if (entry === undefined || !entry.isIntersecting || startedRef.current) {
        return;
      }

      startedRef.current = true;
      observer.disconnect();

      const start = performance.now();

      const tick = (now: number): void => {
        const progress = Math.min((now - start) / COUNT_DURATION_MS, 1);

        node.textContent = String(Math.round(ease(progress) * to));

        if (progress < 1) {
          frame = requestAnimationFrame(tick);
        }
      };

      frame = requestAnimationFrame(tick);
    }, { threshold: 0.6 });

    observer.observe(node);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [ to ]);

  return <span ref={ref}>{children}</span>;
}
