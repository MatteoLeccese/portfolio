// src/lib/motion/tokens.ts

/**
 * TypeScript mirror of the `--motion-*` custom properties in globals.css.
 * Only the values TypeScript actually consumes are mirrored: distances and
 * stagger intervals live in CSS alone.
 *
 * tokens.test.ts parses globals.css and fails when the two diverge.
 */

export type DurationToken = "base" | "slow" | "slower";

/** Durations in milliseconds, exactly as the CSS declares them. */
export const DURATION_MS: Record<DurationToken, number> = {
  base: 220,
  slow: 380,
  slower: 560,
};

/** Cubic Bezier control points, in `cubic-bezier()` order. */
export type Bezier = [ number, number, number, number ];

export const EASE_STANDARD: Bezier = [ 0.2, 0, 0, 1 ];
export const EASE_ENTRANCE: Bezier = [ 0.16, 1, 0.3, 1 ];

/** Spring configuration for the experience timeline rail. */
export const SPRING_SMOOTH = {
  stiffness: 220,
  damping: 38,
  mass: 0.9,
  restDelta: 0.001,
} as const;

/** Stagger cap. The 13th item and beyond reuse the 12th item's delay. */
export const STAGGER_MAX_ITEMS = 16;

/** Converts milliseconds to seconds, the unit `motion` takes. */
export function seconds (ms: number): number {
  return ms / 1000;
}

/** Serialises a curve to the syntax CSS and the Web Animations API accept. */
export function toCssBezier (curve: Bezier): string {
  return `cubic-bezier(${curve[ 0 ]}, ${curve[ 1 ]}, ${curve[ 2 ]}, ${curve[ 3 ]})`;
}

/**
 * Builds the easing function of a cubic Bezier curve: it maps linear progress in 0..1 to
 * eased progress in the same range. Inverts x(t) by Newton-Raphson, capped at 8 iterations.
 */
export function cubicBezier (curve: Bezier): (progress: number) => number {
  const [ x1, y1, x2, y2 ] = curve;

  const solve = (a: number, b: number, t: number): number => {
    const u = 1 - t;

    return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t;
  };

  return (progress: number): number => {
    let t = progress;

    for (let i = 0; i < 8; i += 1) {
      const error = solve(x1, x2, t) - progress;

      if (Math.abs(error) < 1e-4) {
        break;
      }

      const slope = (solve(x1, x2, t + 1e-4) - solve(x1, x2, t - 1e-4)) / 2e-4;

      if (slope === 0) {
        break;
      }

      t -= error / slope;
    }

    return solve(y1, y2, Math.min(Math.max(t, 0), 1));
  };
}
