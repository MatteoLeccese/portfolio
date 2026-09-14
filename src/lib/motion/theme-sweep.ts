// src/lib/motion/theme-sweep.ts
import { DURATION_MS, EASE_ENTRANCE, toCssBezier } from "./tokens";

/** Mirror of Tailwind's `md` breakpoint (48rem = 768px). Below it the sweep is skipped. */
const SWEEP_MIN_WIDTH_PX = 768;

export interface ThemeSweepOptions {

  /** Viewport coordinates the circle grows from: the centre of the toggle. */
  origin: { x: number; y: number; };

  /** Applies the theme to the DOM. Must be synchronous. */
  apply: () => void;

  /** Writes the `theme` cookie on the client. */
  persist: () => void;
}

/**
 * Circular sweep growing from the toggle. Falls back to an instant theme swap
 * under reduced motion, without View Transitions support, or on small screens.
 */
export function runThemeSweep ({ origin, apply, persist }: ThemeSweepOptions): void {
  const root = document.documentElement;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const supported = typeof document.startViewTransition === "function";
  const tooSmall = window.innerWidth < SWEEP_MIN_WIDTH_PX;

  if (prefersReduced || !supported || tooSmall) {
    apply();
    persist();

    return;
  }

  root.dataset.themeSweep = "active";

  const transition = document.startViewTransition(apply);

  // Radius to the farthest corner from the click origin.
  const radius = Math.hypot(
    Math.max(origin.x, window.innerWidth - origin.x),
    Math.max(origin.y, window.innerHeight - origin.y)
  );

  // `ready` rejects when the transition is skipped, and the rejection is swallowed: the theme
  // has already been applied inside startViewTransition and `finished` still clears the
  // attribute.
  void transition.ready.then(() => {
    root.animate(
      {
        clipPath: [
          `circle(0px at ${origin.x}px ${origin.y}px)`,
          `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
        ],
      },
      {
        duration: DURATION_MS.slower,
        easing: toCssBezier(EASE_ENTRANCE),
        pseudoElement: "::view-transition-new(root)",
      }
    );
  }).catch(() => {});

  void transition.finished.finally(() => {
    delete root.dataset.themeSweep;
  });

  persist();
}
