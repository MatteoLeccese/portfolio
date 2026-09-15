// src/domains/experience/components/TimelineProgress.tsx
"use client";

import { useRef } from "react";

import {
  m,
  MotionIsland,
  useReducedMotion,
  useScroll,
  useSpring,
} from "@/components/motion/MotionIsland";
import { SPRING_SMOOTH } from "@/lib/motion/tokens";

/**
 * The progress fill of the experience rail, scaled by the scroll position. The only thing
 * that hydrates in this section: the <ol> and its cards are Server Components.
 *
 * Two nested spans: useScroll measures the track with getBoundingClientRect(), so
 * measuring the same element that is scaled would feed the transform back into its own
 * measurement. The offsets start the fill when the top of the rail reaches 65 % of the
 * window and complete it when the bottom reaches 70 %.
 *
 * useReducedMotion() is read here because MotionConfig's reducedMotion="user" only
 * neutralises animations towards a target, and a MotionValue bound to `style` never takes
 * that path.
 */
export function TimelineProgress () {
  const trackRef = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: [ "start 65%", "end 70%" ],
  });

  const progress = useSpring(scrollYProgress, SPRING_SMOOTH);

  return (
    <MotionIsland>
      <span ref={trackRef} aria-hidden="true" className="timeline-progress-track">
        <m.span
          className="timeline-progress-fill"
          style={{ scaleY: reduced === true ? 1 : progress }}
        />
      </span>
    </MotionIsland>
  );
}
