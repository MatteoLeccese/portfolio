// src/app/document-shell.test.ts
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { COOKIE_REGISTRY } from "@/domains/core/config/cookies";
import { MOTION_BOOT_SCRIPT } from "@/lib/motion/reveal-observer";
import { THEME_COOKIE_NAME, THEME_INIT_SCRIPT } from "@/lib/theme";

/**
 * What the two document shells emit, and what the site is therefore allowed to store on a
 * visitor's machine. It answers "the only cookie is `theme`, and only after pressing the
 * toggle" from the source side: no line of src/ is capable of writing another one, and the
 * single line that writes this one sits behind an onClick.
 *
 * The wiring assertions read the .tsx files as TEXT and never import them: both shells are
 * async React Server Components that pull in next/font/local, a build-time transform that
 * throws outside the Next compiler. src/lib/fonts.test.ts does the same, for the same
 * reason.
 */
const APP_DIR = fileURLToPath(new URL("./", import.meta.url));
const SRC_DIR = fileURLToPath(new URL("../", import.meta.url));

const LOCALE_LAYOUT = join(APP_DIR, "[locale]", "layout.tsx");
const ROOT_NOT_FOUND = join(APP_DIR, "not-found.tsx");
const THEME_TOGGLE = join(SRC_DIR, "components", "theme", "ThemeToggle.tsx");
const ROUTING = join(SRC_DIR, "i18n", "routing.ts");

/** The two files allowed to render an <html> element. Kept in step by fonts.test.ts. */
const DOCUMENT_SHELLS = [ LOCALE_LAYOUT, ROOT_NOT_FOUND ];

function read (path: string): Promise<string> {
  return readFile(path, "utf8");
}

/**
 * Source with every comment stripped, so a substring assertion cannot be satisfied by prose
 * ABOUT the code rather than by the code itself.
 */
function code (source: string): string {
  return source
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .replaceAll(/^\s*\/\/.*$/gm, "");
}

/* ────────────────────────────────────────────────────────────────────────────
   1. The cookie inventory: one cookie, and the registry knows its name.
   ──────────────────────────────────────────────────────────────────────────── */

describe("the site's cookie inventory", () => {
  it("declares exactly one cookie, and it is the theme one", () => {
    // The published /cookies table renders this array: a row the browser never sets, or a
    // cookie with no row here, makes the policy false.
    expect(COOKIE_REGISTRY.map((cookie) => cookie.name)).toEqual([ THEME_COOKIE_NAME ]);
  });

  it("takes the name from src/lib/theme.ts instead of spelling it out", async () => {
    const source = code(await read(join(SRC_DIR, "domains", "core", "config", "cookies.ts")));

    expect(source).toContain(`import { THEME_COOKIE_NAME } from "@/lib/theme"`);
    expect(source, "the registry hardcodes the cookie name instead of importing it")
      .not.toMatch(/name:\s*"/);
  });

  it("keeps next-intl from adding a second cookie behind the toggle's back", async () => {
    // next-intl writes NEXT_LOCALE even with localeDetection false; syncCookie() reads only
    // routing.localeCookie, so this line is the one that stops it.
    expect(code(await read(ROUTING))).toMatch(/localeCookie:\s*false/);
  });
});

/* ────────────────────────────────────────────────────────────────────────────
   2. Nothing else in src/ can write a cookie at all.
   ──────────────────────────────────────────────────────────────────────────── */

describe("which files can write a cookie", () => {

  /** Every .ts/.tsx under src/, minus the tests, as [relative path, source]. */
  async function sources (): Promise<[ string, string ][]> {
    const entries = await readdir(SRC_DIR, { recursive: true });
    const files: [ string, string ][] = [];

    for (const entry of entries) {
      const name = entry.replaceAll("\\", "/");

      if (!name.endsWith(".ts") && !name.endsWith(".tsx")) continue;
      if (name.endsWith(".test.ts") || name.endsWith(".d.ts")) continue;

      files.push([ name, await read(join(SRC_DIR, entry)) ]);
    }

    return files;
  }

  it("finds the project's files, so an empty walk cannot pass as a clean result", async () => {
    expect((await sources()).length).toBeGreaterThan(20);
  });

  it("has exactly one file that assigns to document.cookie", async () => {
    const writers = (await sources())
      .filter(([ , source ]) => (/document\.cookie\s*=[^=]/).test(code(source)))
      .map(([ name ]) => name);

    expect(writers).toEqual([ "components/theme/ThemeToggle.tsx" ]);
  });

  it("never sets a cookie from the server either", async () => {
    // Three separate spellings: an import of cookies() from next/headers, a
    // cookies().set() call, and a Set-Cookie header written by hand. The read-only
    // headers() of the same module is the one thing the contact action needs from it.
    for (const [ name, source ] of await sources()) {
      const body = code(source);

      expect(body, `${name} imports cookies() from next/headers`)
        .not.toMatch(/import[^;]*\bcookies\b[^;]*from\s*["'`]next\/headers["'`]/);
      expect(body, `${name} writes a cookie from the server`).not.toMatch(/cookies\(\)\.set\(/);
      expect(body, `${name} writes a Set-Cookie header`).not.toMatch(/["'`]Set-Cookie/i);
    }
  });
});

/* ────────────────────────────────────────────────────────────────────────────
   3. …and that one file writes it only when the visitor presses the switch.
   ──────────────────────────────────────────────────────────────────────────── */

describe("the cookie appears only after the toggle is pressed", () => {
  it("keeps the write inside a handler, never at module scope or in an effect", async () => {
    const toggle = code(await read(THEME_TOGGLE));

    // An effect or a module-scope call would write the cookie on a visit where nobody
    // touched anything.
    expect(toggle, "an effect could write the cookie on a plain visit").not.toContain("useEffect");
    expect(toggle, "a layout effect could too").not.toContain("useLayoutEffect");

    // The whole reachability chain, one link per assertion:
    //   onClick={handleToggle} -> runThemeSweep({ persist }) -> persistTheme -> document.cookie
    expect(toggle).toContain("onClick={handleToggle}");
    expect(toggle).toMatch(/function handleToggle\s*\(/);
    expect(toggle).toMatch(/persist:\s*\(\)\s*=>\s*\{\s*persistTheme\(next\);\s*\}/);
    expect(toggle).toMatch(/function persistTheme\s*\([^)]*\):\s*void\s*\{\s*document\.cookie =/);

    // `persistTheme` and `handleToggle` are each named exactly twice: one declaration and
    // one use. A third occurrence is a second call site.
    expect(toggle.match(/persistTheme/g)).toHaveLength(2);
    expect(toggle.match(/handleToggle/g)).toHaveLength(2);
  });

  it("has a pre-paint script that reads the cookie and never writes one", async () => {
    // The script runs on every visit, so it may read the cookie but must never write one.
    expect(THEME_INIT_SCRIPT).toContain("document.cookie.match");
    expect(THEME_INIT_SCRIPT).not.toMatch(/document\.cookie\s*=[^=]/);
  });
});

/* ────────────────────────────────────────────────────────────────────────────
   4. The shells: what makes a cookie-less server render possible in the first place.
   ──────────────────────────────────────────────────────────────────────────── */

describe("both document shells apply the theme before the first paint", () => {
  it("injects THEME_INIT_SCRIPT itself, not a hand-copied duplicate", async () => {
    for (const shell of DOCUMENT_SHELLS) {
      const source = code(await read(shell));

      expect(source, `${shell}: does not import THEME_INIT_SCRIPT`)
        .toContain(`import { THEME_INIT_SCRIPT } from "@/lib/theme"`);
      expect(source, `${shell}: does not render the script`)
        .toContain("<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />");
    }
  });

  it("runs it after the meta tag it rewrites", async () => {
    for (const shell of DOCUMENT_SHELLS) {
      const source = code(await read(shell));
      const meta = source.indexOf(`<meta name="theme-color"`);
      const script = source.indexOf("THEME_INIT_SCRIPT }} />");

      expect(meta, `${shell}: no theme-color meta`).toBeGreaterThan(-1);
      expect(script, `${shell}: no theme script`).toBeGreaterThan(-1);
      // The script rewrites the meta with querySelector(), which at parse time only sees
      // what is already above it.
      expect(script, `${shell}: the script runs before the meta it rewrites`).toBeGreaterThan(meta);
    }
  });

  it("carries no nonce on any inline script", async () => {
    // The CSP is script-src 'self' 'unsafe-inline'. Per CSP level 3 a nonce or a hash in
    // that directive makes the browser ignore 'unsafe-inline', which would block Next's own
    // bootstrap along with these.
    for (const shell of DOCUMENT_SHELLS) {
      for (const tag of code(await read(shell)).match(/<script[^>]*>/g) ?? []) {
        expect(tag, `${shell}: an inline script carries a nonce`).not.toContain("nonce");
      }
    }
  });

  it("never reads the cookie on the server, which is what keeps / and /es prerendered", async () => {
    // One `await cookies()` in the localized layout takes / and /es out of the build table
    // and turns the whole tree dynamic. The pre-paint script is what keeps that from being
    // necessary.
    for (const shell of DOCUMENT_SHELLS) {
      const source = code(await read(shell));

      expect(source, `${shell}: imports next/headers`).not.toContain("next/headers");
      expect(source, `${shell}: calls cookies() on the server`).not.toMatch(/\bcookies\(\)/);
    }
  });
});

/* ────────────────────────────────────────────────────────────────────────────
   5. The two motion hooks the localized layout wires, and nowhere else.
   ──────────────────────────────────────────────────────────────────────────── */

describe("the localized layout wires the motion subsystem", () => {
  it("boots html[data-motion] with its own fail-safe", async () => {
    // Without this script the attribute never exists, the
    // Without this script html[data-motion] never exists, the
    // html[data-motion="on"|"ready"] [data-reveal="hidden"] selectors never match and every
    // reveal on the page is dead code: the content stays visible, but nothing animates.
    const source = code(await read(LOCALE_LAYOUT));

    expect(source).toContain(`import { MOTION_BOOT_SCRIPT } from "@/lib/motion/reveal-observer"`);
    expect(source).toContain(
      `<script id="motion-boot" dangerouslySetInnerHTML={{ __html: MOTION_BOOT_SCRIPT }} />`
    );
    expect(MOTION_BOOT_SCRIPT).toContain(`dataset.motion="on"`);
    expect(MOTION_BOOT_SCRIPT).toContain(`dataset.motion="off"`);
  });

  it("paints the colour before it boots the animation", async () => {
    const source = code(await read(LOCALE_LAYOUT));

    expect(source.indexOf("MOTION_BOOT_SCRIPT }} />"))
      .toBeGreaterThan(source.indexOf("THEME_INIT_SCRIPT }} />"));
  });

  it("renders the sentinel component and the 1 px div it observes", async () => {
    // Two halves of one mechanism: the component writes the attribute, the div is what it
    // observes. primitives.test.ts asserts the other side, that ScrollSentinel watches this
    // exact id.
    const source = code(await read(LOCALE_LAYOUT));

    expect(source).toContain(`import { ScrollSentinel } from "./_components/ScrollSentinel"`);
    expect(source).toContain("<ScrollSentinel />");
    expect(source).toContain(`<div id="scroll-sentinel" aria-hidden="true" className="h-px" />`);
  });

  it("puts the sentinel div inside <main> and before the page, not in page.tsx", async () => {
    // In <main> so every route under [locale] inherits the same header behaviour; before
    // {children} so it is the first thing to leave the viewport.
    const source = code(await read(LOCALE_LAYOUT));
    const main = source.indexOf(`<main id="main"`);
    const sentinel = source.indexOf(`<div id="scroll-sentinel"`);
    const children = source.indexOf("{children}");

    expect(main).toBeGreaterThan(-1);
    expect(sentinel).toBeGreaterThan(main);
    expect(children).toBeGreaterThan(sentinel);
  });

  it("renders ScrollSentinel above <main>", async () => {
    const source = code(await read(LOCALE_LAYOUT));

    expect(source.indexOf("<ScrollSentinel />")).toBeLessThan(source.indexOf(`<main id="main"`));
  });

  it("does not boot motion on the root 404, which animates nothing", async () => {
    // That shell has no reveals and no header, so it injects the theme script and nothing
    // else.
    const source = code(await read(ROOT_NOT_FOUND));

    expect(source).not.toContain("MOTION_BOOT_SCRIPT");
    expect(source).not.toContain("scroll-sentinel");
    expect(source.match(/<script/g)).toHaveLength(1);
  });
});

/* ────────────────────────────────────────────────────────────────────────────
   6. The layout is a composition point, not a motion island.
   ──────────────────────────────────────────────────────────────────────────── */

describe("motion island placement", () => {
  it("is not hoisted into the layout", async () => {
    // MotionIsland is LazyMotion + MotionConfig, i.e. React context: hoisting it here would
    // make the whole document a client subtree and drag `motion` into the shared bundle of
    // every route, including the two legal pages that animate nothing. TimelineProgress and
    // ContactForm each wrap themselves instead.
    expect(code(await read(LOCALE_LAYOUT))).not.toContain("MotionIsland");
    expect(code(await read(ROOT_NOT_FOUND))).not.toContain("MotionIsland");
  });
});
