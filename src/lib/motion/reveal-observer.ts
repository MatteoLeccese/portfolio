// src/lib/motion/reveal-observer.ts

/**
 * One lazily created IntersectionObserver shared by every reveal on the page. Each element is
 * unobserved as soon as it has been revealed, so a reveal never runs twice.
 *
 * Imports neither React nor any animation library: it is called from a useEffect.
 */

const REVEAL_ATTRIBUTE = "data-reveal";
const GROUP_ATTRIBUTE = "data-reveal-group";

/** Reveals at 15 % visibility, discounting 12 % of the bottom edge. */
const ROOT_MARGIN = "0px 0px -12% 0px";
const THRESHOLD = 0.15;

/**
 * Inline script for <head>. It sets `data-motion="on"` on <html> and, if nothing has promoted
 * that to "ready" within 3 s, drops it to "off" so no content stays hidden.
 */
export const MOTION_BOOT_SCRIPT =
  `(function(){var d=document.documentElement;d.dataset.motion="on";`
  + `setTimeout(function(){if(d.dataset.motion==="on"){d.dataset.motion="off";}},3000);})();`;

let observer: IntersectionObserver | null = null;

function reveal (target: Element): void {
  if (target.hasAttribute(GROUP_ATTRIBUTE)) {
    for (const child of Array.from(target.children)) {
      child.setAttribute(REVEAL_ATTRIBUTE, "visible");
    }

    return;
  }

  target.setAttribute(REVEAL_ATTRIBUTE, "visible");
}

function handleEntries (entries: IntersectionObserverEntry[], instance: IntersectionObserver): void {
  for (const entry of entries) {
    if (!entry.isIntersecting) {
      continue;
    }

    reveal(entry.target);
    instance.unobserve(entry.target);
  }
}

function getObserver (): IntersectionObserver | null {
  if (typeof IntersectionObserver === "undefined") {
    return null;
  }

  observer ??= new IntersectionObserver(handleEntries, {
    rootMargin: ROOT_MARGIN,
    threshold: THRESHOLD,
  });

  return observer;
}

/**
 * Promotes `data-motion` from "on" to "ready". A root already switched to "off" by the
 * fail-safe is left alone.
 */
function markMotionReady (): void {
  const root = document.documentElement;

  if (root.dataset.motion === "on") {
    root.dataset.motion = "ready";
  }
}

/** Observes one element and reveals it once it intersects. Returns a cleanup function. */
export function observeReveal (node: Element): () => void {
  const instance = getObserver();

  if (instance === null) {
    reveal(node);

    return () => {};
  }

  markMotionReady();
  instance.observe(node);

  return () => {
    instance.unobserve(node);
  };
}

/** Registers a group: when it intersects, every direct child is revealed at once. */
export function observeRevealGroup (node: Element): () => void {
  node.setAttribute(GROUP_ATTRIBUTE, "");

  return observeReveal(node);
}
