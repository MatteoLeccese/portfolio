// src/components/motion/MotionIsland.tsx
"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/** The project's single entry point to the `motion` API. */
export { AnimatePresence, m, useReducedMotion, useScroll, useSpring } from "motion/react";

/**
 * Loads the `domAnimation` feature bundle — animation, exit, inView, hover, focus and
 * tap, without `layout` or `drag` — from its own chunk.
 */
const loadDomAnimation = () => import("./features").then((mod) => mod.default);

/**
 * Wrapper required around any subtree that uses `m.*`.
 *
 * Runs LazyMotion in `strict` mode, which throws on `motion.*`, and sets
 * `reducedMotion="user"`, which skips transforms and keeps opacity and colour whenever
 * the visitor asks for reduced motion.
 */
export function MotionIsland ({ children }: { children: ReactNode; }) {
  return (
    <LazyMotion strict features={loadDomAnimation}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
