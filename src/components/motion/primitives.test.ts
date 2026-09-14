// src/components/motion/primitives.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { EASE_ENTRANCE, STAGGER_MAX_ITEMS, cubicBezier } from "@/lib/motion/tokens";

/**
 * Guards for the motion primitives.
 *
 * Vitest runs on the `node` environment (vitest.config.ts), so there is no DOM to mount:
 * this file covers the pure counter logic and the structural invariants that are readable
 * from the source text. Anything that needs painting is declared as manual verification.
 */
const ROOT = process.cwd();

function read (path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

/** Source with comments stripped, so the guards match code and not the prose around it. */
function code (path: string): string {
  return read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const REVEAL = "src/components/motion/Reveal.tsx";
const STAGGER = "src/components/motion/Stagger.tsx";
const COUNT_UP = "src/components/motion/CountUp.tsx";
const ISLAND = "src/components/motion/MotionIsland.tsx";
const FEATURES = "src/components/motion/features.ts";
const USE_PASSED = "src/hooks/usePassed.ts";
const USE_SCROLL_SPY = "src/hooks/useScrollSpy.ts";
const SENTINEL = "src/app/[locale]/_components/ScrollSentinel.tsx";

/** The three primitives that wrap visitor content. */
const PRIMITIVES = [ REVEAL, STAGGER, COUNT_UP ];

/** Every module of this group that reaches the browser. */
const OWNED = [ REVEAL, STAGGER, COUNT_UP, ISLAND, FEATURES, USE_PASSED, USE_SCROLL_SPY, SENTINEL ];

/** The modules that are client islands. */
const CLIENT_MODULES = [ REVEAL, STAGGER, COUNT_UP, ISLAND, SENTINEL ];

const NEW_OBSERVER = /new IntersectionObserver/g;
const SCROLL_LISTENER = /addEventListener\(\s*["']scroll["']/;
const INLINE_OPACITY = /opacity/;
const JS_DELAY = /setTimeout\(|transitionDelay|animationDelay/;
const DYNAMIC_FEATURES = /import\(\s*"\.\/features"\s*\)/;
const DYNAMIC_MOTION = /import\(\s*["']motion\/react["']\s*\)/;
const HARDCODED_ROOT_MARGIN = /rootMargin:\s*["'`]-?\d/;
const USE_CLIENT = /"use client";/;

function occurrences (source: string, pattern: RegExp): number {
  return (source.match(pattern) ?? []).length;
}

describe("motion island", () => {
  it("re-exports the animation bundle and nothing else from features.ts", () => {
    const statements = code(FEATURES)
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    expect(statements).toEqual([ `export { domAnimation as default } from "motion/react";` ]);
  });

  it("loads features through a dynamic import instead of the eagerly imported module", () => {
    const island = code(ISLAND);

    expect(island).toMatch(DYNAMIC_FEATURES);
    expect(island).not.toMatch(DYNAMIC_MOTION);
  });

  it("runs LazyMotion in strict mode and lets MotionConfig follow the user setting", () => {
    const island = code(ISLAND);

    expect(island).toContain("<LazyMotion strict");
    expect(island).toContain(`reducedMotion="user"`);
  });

  it("re-exports the motion API the rest of the project consumes", () => {
    const island = code(ISLAND);

    for (const name of [ "AnimatePresence", "m", "useReducedMotion", "useScroll", "useSpring" ]) {
      expect(island, name).toContain(name);
    }
  });
});

describe("server and client boundary", () => {
  it("declares the client directive on every primitive and on the scroll sentinel", () => {
    for (const path of CLIENT_MODULES) {
      expect(read(path), path).toMatch(USE_CLIENT);
    }
  });

  it("leaves the client directive off the hooks", () => {
    for (const path of [ USE_PASSED, USE_SCROLL_SPY ]) {
      expect(read(path), path).not.toMatch(USE_CLIENT);
    }
  });

  it("wraps children instead of rendering content of its own", () => {
    for (const path of PRIMITIVES) {
      const source = code(path);

      expect(source, path).toContain("children");
      expect(source, path).not.toContain("next-intl");
      expect(source, path).not.toContain("useTranslations");
    }
  });
});

describe("content stays visible without JavaScript", () => {
  it("hides nothing from JavaScript", () => {
    for (const path of PRIMITIVES) {
      expect(code(path), path).not.toMatch(INLINE_OPACITY);
    }
  });

  it("has Reveal mark only the state the stylesheet governs", () => {
    expect(code(REVEAL)).toContain(`data-reveal="hidden"`);
  });

  it("has Stagger observe the group and leave its children untouched", () => {
    const stagger = code(STAGGER);

    expect(stagger).toContain("data-stagger={step}");
    expect(stagger).not.toContain("data-reveal");
    expect(stagger).not.toContain("cloneElement");
    expect(stagger).not.toContain("Children.map");
  });
});

describe("intersection observer budget", () => {
  it("has Reveal and Stagger use the shared observer instead of building one", () => {
    expect(code(REVEAL)).not.toMatch(NEW_OBSERVER);
    expect(code(REVEAL)).toContain("observeReveal(node)");
    expect(code(STAGGER)).not.toMatch(NEW_OBSERVER);
    expect(code(STAGGER)).toContain("observeRevealGroup(node)");
  });

  it("builds at most one observer per hook", () => {
    expect(occurrences(code(USE_PASSED), NEW_OBSERVER)).toBe(1);
    expect(occurrences(code(USE_SCROLL_SPY), NEW_OBSERVER)).toBe(1);
  });

  it("has useScrollSpy watch every section through that single observer", () => {
    const spy = code(USE_SCROLL_SPY);

    expect(spy).toContain("SECTION_IDS");
    expect(spy).toContain("observer.observe(node)");
  });

  it("listens for no scroll event", () => {
    for (const path of OWNED) {
      expect(code(path), path).not.toMatch(SCROLL_LISTENER);
    }
  });
});

describe("stagger timing comes from CSS", () => {
  it("computes no delay in JavaScript", () => {
    for (const path of PRIMITIVES) {
      expect(code(path), path).not.toMatch(JS_DELAY);
    }
  });

  it("clamps the reveal index against STAGGER_MAX_ITEMS", () => {
    const reveal = code(REVEAL);

    expect(reveal).toContain("STAGGER_MAX_ITEMS - 1");
    expect(reveal).toContain("--motion-reveal-index");
    expect(STAGGER_MAX_ITEMS).toBe(12);
  });

  it("emits the index inline style only when a step is passed", () => {
    expect(code(REVEAL)).toContain("step === undefined");
  });
});

describe("header height probe", () => {
  it("derives the root margin from the token instead of a hardcoded pixel value", () => {
    const spy = code(USE_SCROLL_SPY);

    expect(spy).toContain("var(--header-height)");
    expect(spy).toContain("headerHeightPx()");
    expect(spy).not.toMatch(HARDCODED_ROOT_MARGIN);
  });

  it("avoids getPropertyValue, which returns the declaration and not pixels", () => {
    expect(code(USE_SCROLL_SPY)).not.toContain("getPropertyValue");
  });
});

describe("CountUp value sequence", () => {
  const ease = cubicBezier(EASE_ENTRANCE);

  /** The exact expression CountUp writes to textContent on each frame. */
  function valueAt (progress: number, to: number): number {
    return Math.round(ease(progress) * to);
  }

  it("starts at zero", () => {
    expect(valueAt(0, 5)).toBe(0);
  });

  it("lands exactly on the target value", () => {
    for (const to of [ 1, 5, 12, 40 ]) {
      expect(valueAt(1, to), `to=${to}`).toBe(to);
    }
  });

  it("never counts backwards", () => {
    let previous = 0;

    for (let step = 0; step <= 60; step += 1) {
      const current = valueAt(step / 60, 5);

      expect(current, `frame ${step}`).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });

  it("never overshoots the target value", () => {
    for (let step = 0; step <= 60; step += 1) {
      expect(valueAt(step / 60, 5), `frame ${step}`).toBeLessThanOrEqual(5);
    }
  });

  it("counts once and disconnects the observer", () => {
    const countUp = code(COUNT_UP);

    expect(countUp).toContain("startedRef");
    expect(countUp).toContain("observer.disconnect()");
  });

  it("writes textContent through a ref instead of React state", () => {
    const countUp = code(COUNT_UP);

    expect(countUp).toContain("textContent");
    expect(countUp).not.toContain("useState");
  });

  it("delivers the final value under reduced motion before creating the observer", () => {
    const countUp = code(COUNT_UP);
    const guard = countUp.indexOf("prefers-reduced-motion");
    const observer = countUp.search(NEW_OBSERVER);

    expect(guard).toBeGreaterThan(-1);
    expect(observer).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(observer);
  });
});

describe("scroll sentinel", () => {
  it("sets the attribute on the root element and renders nothing", () => {
    const sentinel = code(SENTINEL);

    expect(sentinel).toContain("dataset.scrolled");
    expect(sentinel).toContain("return null;");
  });

  it("observes the id the layout renders", () => {
    expect(code(SENTINEL)).toContain(`usePassed("scroll-sentinel")`);
  });
});
