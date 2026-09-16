# Theme and brand colour

Every colour on the site comes out of **four lines** of `src/app/globals.css`. This document
explains why it is built that way, how the brand is changed, what has to be verified afterwards, and
how the light/dark switch actually works.

## The architecture: two levels and a bridge

`globals.css` is split into numbered, commented blocks. The first four are the colour system, and
the order matters:

```text
DIAL         block 1  ·  :root { --brand-h --brand-c --neutral-h --neutral-c }
LEVEL 1      block 2  ·  primitives: --brand-50…950, --neutral-0…950, --danger-400/500/950
LEVEL 2      blocks 3 and 4  ·  semantic: --background --foreground --primary --muted … --overlay
BRIDGE       block 5  ·  @theme inline { --color-<token>: var(--<token>) }  →  bg-*, text-*
```

- **Level 1 are colours; level 2 are roles.** The primitives are derived from the dial with `calc()`
  and no component uses them, apart from the two closed exceptions at the end of this document. The
  semantic tokens are `var()` of the primitives and they are **shadcn's contract**: there are not
  two token systems, there is one translation. That is why `.dark` (block 4) redefines the whole of
  level 2 and touches neither the dial nor the primitives.
- **The bridge is what makes `bg-primary` exist.** Without the `@theme inline` of block 5, Tailwind
  emits no utility for these names.

Consumption rule, in one line: **components use level 2** (`bg-card`, `text-muted-foreground`,
`border-input`), never level 1 and never a value.

## Why `@theme inline` and not `@theme`

With plain `@theme`, Tailwind declares `--color-primary: var(--primary)` **in `:root`**, where it
resolves to the light value. When `.dark` redefines `--primary` further down the tree,
`--color-primary` is already resolved and **does not change**: dark mode would keep the light
colour.

With `@theme inline` the utility emits `var(--primary)` directly and the variable resolves **in the
scope of the painted element**, which does inherit the `.dark` value. Hence the split:

| Block | What it holds | Why |
|---|---|---|
| `@theme inline` (5) | semantic colours, `--color-brand-*`, radii, shadows | they change with the theme or depend on `--radius`: they need late resolution |
| plain `@theme` (6) | fonts, type scale, spacing, containers | they are constants, and this way they are emitted in `:root` for hand-written CSS |

Two corollaries already exploited in the file:

1. **Transparencies are theme-reactive too**: `bg-primary/10` compiles to
   `color-mix(in oklab, var(--primary) 10%, transparent)`.
2. **A variable from `@theme inline` is not emitted in `:root` unless something references it.** In
   hand-written CSS, consume the semantic token (`var(--card)`), not the bridge alias
   (`var(--color-card)`).

## The dial: the four lines

Block 1 of `src/app/globals.css` (today, lines 12–15). **It is the only place a rebrand touches.**

```css
:root {
  --brand-h: 155;               /* 1. brand hue in oklch degrees (0–360) */
  --brand-c: 1;                 /* 2. chroma: 0.6 muted, 1 base, 1.15 the useful ceiling */
  --neutral-h: var(--brand-h);  /* 3. hue of the greys. `0` = pure greys */
  --neutral-c: 1;               /* 4. how much the greys are tinted. `0` = fully neutral */
}
```

- **`--brand-c` above ~1.15** pushes several steps out of the sRGB gamut and the browser clips them:
  contrast still passes (`check:contrast` verifies it), but the scale loses perceptual uniformity
  and the rebrand looks "dirty" in the light steps.
- **Reference hues in oklch:** red 25 · amber 70 · lime 120 · **green 155** · teal 185 · cyan 200 ·
  blue 250 · indigo 265 · violet 300 · pink 340.
- **`--neutral-h: var(--brand-h)` is deliberate**: the greys are tinted with the brand hue (chroma
  0.004 → 0.013), which is what makes a rebrand drag the whole site rather than just the buttons. If
  pure greys are ever wanted, that line becomes a literal number — and `check-contrast.ts` detects
  it and reads it as a literal instead of following the dial.

**What the dial does NOT move, correctly:** `--danger-400/500/950` (block 2, lines 48–50) carries a
hand-written hue because **an error must stay red**; `--neutral-0` is pure white; `--overlay` and
the two `--elevation-*` are black with alpha. All four are literals inside `globals.css`, the only
file where that is allowed.

## Rebrand, step by step

1. **Change the dial.** Block 1 of `src/app/globals.css`, the four lines above. The 26 primitives
   recompute themselves and the ~32 semantic tokens follow.
2. **Update the first sRGB mirror: `src/lib/palette-srgb.ts`.** 14 hex values (10 in `light`, 4 in
   `dark`); `THEME_COLOR_SRGB` is derived from them and is never edited by hand.
3. **Update the second mirror: the six `EMAIL_*_COLOR` in
   `src/domains/contact/services/mailer.ts`** — `EMAIL_BRAND_COLOR`
   (= `PALETTE_SRGB.light.primary`), `EMAIL_PAGE_COLOR` (`background`), `EMAIL_SURFACE_COLOR`
   (`card`), `EMAIL_BORDER_COLOR` (`border`), `EMAIL_TEXT_COLOR` (`foreground`) and
   `EMAIL_MUTED_COLOR` (`mutedForeground`).
4. **Verify.** Both commands, in this order:

```bash
npm run check   # typecheck + lint + check:style + check:contrast + test
npm run build
```

Nothing has to be computed by hand for steps 2 and 3: `npm run check:contrast` prints the resolved
hex of every pair it measures, and the mirror tests fail saying which value they expected.

> **Step 4 is the whole of `npm run check`, not `check:contrast` on its own.** `check:contrast`
> recomputes the matrix with the new dial and `check:style` confirms no gradient or literal colour
> slipped in, but **neither of them sees the sRGB mirrors**. The only things that detect a moved
> dial with a stale `palette-srgb.ts` or `EMAIL_BRAND_COLOR` are `palette-srgb.test.ts` and
> `mailer.test.ts`, which run under `npm run test`. A half-verified rebrand leaves the OG card, the
> manifest, the CV PDF and the e-mail on the old colour, and nobody notices until someone shares a
> link.

## Why the new colour still passes AA

The contrast contract is encoded in the **lightness** of the primitives, which is what dominates
WCAG relative luminance; hue barely participates. Walking the same lightness ladder across nine
hues, green 155 is the **worst case** of the nine (`brand-700` with white text: 4.98; `brand-400` on
a dark background: 10.38). If green passes, the rebrand passes.

That does not excuse skipping verification:

```bash
npm run check:contrast
```

`scripts/check-contrast.ts` **parses `src/app/globals.css`** and extracts the dial, the primitives
and the semantic mapping from `:root` and from `.dark`. It duplicates no value, so it cannot drift
from the real CSS. It measures 24 combinations × 2 themes — the ones the site actually uses —
requires 4.5:1 for text and 3:1 for graphical components (1.4.11), and exits 1 if any falls below
the minimum. Two cases per theme (`border-strong`) are **informational**: they are measured and
printed, but do not fail.

If something falls below the minimum, what gets adjusted is the **dial** (lower `--brand-c`, move
the hue) or the **semantic mapping** (`--primary: var(--brand-800)` instead of `700`). The minimum
is never relaxed.

## No literal colour outside `globals.css`

> `src/app/globals.css` is the only file in the project with literal colours. Everything else
> consumes a semantic token.

`scripts/check-style-rules.ts` (`npm run check:style`) enforces it, searching for `#rrggbb`,
`oklch()`, `oklab()`, `lch()`, `lab()`, `rgb()`, `rgba()`, `hsl()`, `hsla()` and `color-mix()` in
`src/**/*.{css,svg,ts,tsx}`, `public/**/*.svg` and `messages/*.json`.

There are **two declared exceptions**, and both exist for the same reason: they are consumers that
**cannot resolve `oklch()` or `var()`**. They are not leaks in the system, they are the edge where
the system stops existing.

| Exception | Who forces it | What anchors it |
|---|---|---|
| `src/lib/palette-srgb.ts` | satori (`next/og`), the PWA manifest and the CV print sheet | `palette-srgb.test.ts` compares **every** key against the resolved tokens of `globals.css` |
| `src/domains/contact/services/mailer.ts` | e-mail clients, which understand neither `oklch()` nor modern CSS | `mailer.test.ts` requires `EMAIL_BRAND_COLOR === PALETTE_SRGB.light.primary`, closing the chain back to the CSS |

Three things follow from the table:

1. **The exemption is per path and only for the two colour rules.** The nine anti-gradient rules
   still apply in both files (see [`no-gradients.md`](./no-gradients.md)).
2. **Neither can diverge silently**, which is why step 4 of the rebrand includes `npm run test`.
3. **A third exception requires a new entry in `no-gradients.md`**, with its path, its consumer and
   its anchoring test. If the consumer does resolve `var()`, there is no exception: there is a
   badly consumed token.

Two rules that live inside `palette-srgb.ts` itself:

- **Only the semantic layer is mirrored.** The primitive scales (`brand-700`, `neutral-200`, …) live
  in CSS and never leave it. Mirroring level 1 as well would multiply the surface that can drift
  from the CSS.
- **`palette-srgb.ts` must not import `Theme` — or anything else — from `theme.ts`.** `theme.ts`
  already imports `palette-srgb.ts`, so importing back would close an import cycle. That is why the
  key type of `THEME_COLOR_SRGB` is written out by hand as `{ light: string; dark: string }`.

> **The scanner reads raw file text, comments included.** `src/lib/theme.ts` is not one of its exempt
> files (only `src/app/globals.css`, `src/lib/palette-srgb.ts` and
> `src/domains/contact/services/mailer.ts` are), so it must never contain `oklch`/`rgb`/`hsl`/`lab`/
> `color-mix` followed by a parenthesis, nor a hex literal — not even in a comment discussing colour
> syntax. `npm run check:style` fails on the prose.

## `--brand-*` outside the semantic layer: two uses, and there is no third

The `bg-brand-*` / `text-brand-*` utilities exist (the bridge emits them), which is why a closed list
is needed. They are legal exactly here:

| # | Use | Classes | Condition |
|---|---|---|---|
| 1 | Dots and rail of the Experience timeline | `bg-brand-600` | decorative, `aria-hidden="true"`; carries no information |
| 2 | `SkillBadge` glyphs | `text-brand-600 dark:text-brand-400` | only at **≥ 24 px**, where they meet the 3:1 of 1.4.11 as a graphical component |

**Any other `bg-brand-*` or `text-brand-*` in `src/` is rejected in review.** No lint catches it —
they are perfectly valid classes — so it is a human rule, which is why the list is short and
memorable. The reason is real, though: a brand colour outside level 2 is a colour `check:contrast`
does not measure, because `check:contrast` measures roles, not scale steps.

## Light and dark: how the theme is applied

The theme is a `dark` class on `<html>`, written by an inline pre-paint script that reads a cookie.
There is no theme provider, no React state and no server read. `src/lib/theme.ts` holds the cookie
name, the max-age, the regex and the script; `src/components/theme/ThemeToggle.tsx` writes the
cookie.

**The class, not an attribute.** `globals.css` declares `@custom-variant dark (&:is(.dark *))`, so
the theme has to be applied as the class `dark` on `<html>` — not a data attribute, and not on
`<body>`.

**The cookie is read in the browser, never on the server.**

- The cookie must never be `HttpOnly`: the pre-paint script is its only reader and reads it with
  `document.cookie`. `HttpOnly` would force a server read through `cookies()`, which turns `/` and
  `/es` dynamic and defeats static prerendering. Two identical builds confirmed it: a single
  `await cookies()` in the localized layout turns `● /en` and `● /es` into `ƒ Dynamic` and takes the
  whole tree off the CDN.
- Falling back to the default theme is always a no-op, never a flash: the prerendered static HTML is
  already painted light, so a missing, empty, truncated or foreign cookie value resolves to light
  and matches what is on screen. **Adding `prefers-color-scheme` support would break that
  invariant** — the server-rendered HTML would no longer match the resolved theme and every
  dark-preferring visitor would see a flash.

**The cookie regex, which is easy to break silently.**

- The cookie-reading regex exists **exactly once** and is shared by `THEME_INIT_SCRIPT` and
  `themeFromCookieString()`. Never hand-maintain two copies: the one that would drift is the one no
  unit test can reach, since the inline script only ever runs in a browser before hydration, and a
  mistake there shows up as a flash of the wrong theme and nothing else — no error, no failing test.
  The last assertion in `theme.test.ts` exists solely to prove the two agree.
- Inside the template literal, `\\s` is what emits `\s` into the final string; writing `\s` directly
  emits a bare `s`. It is a syntax error nowhere: the regex silently becomes `;s*` and stops
  matching the second and later cookies in the jar, so the theme is lost for any visitor whose theme
  cookie is not first.
- Both ends stay anchored: the leading `(?:^|;\s*)` and the trailing `(?:;|$)`. Without the leading
  anchor, `mytheme=dark` is read as the theme cookie. Without the trailing one, the "unexpected
  value falls back to light" guarantee breaks for anything that merely *starts* with `light` or
  `dark` (`theme=darkmode`, `theme=light-high-contrast`). The cookie jar is shared with every other
  app on the domain, so those values are not ours to control.

**The inline script.** `THEME_INIT_SCRIPT` is injected with `dangerouslySetInnerHTML` and must never
contain the sequences `</script` or `<!--`: either one ends the `<script>` element early and dumps
the rest of the theme code into the document as visible text. The interpolated constants are the
realistic way such a sequence could ever be introduced, which is why `theme.test.ts` asserts against
both. The script also rewrites `<meta name="theme-color">` with `querySelector()`, so **the meta tag
must be emitted above the script** — `querySelector()` at parse time only sees what is already
above it; reversed, the meta keeps the light colour and the browser chrome disagrees with the page
on every dark visit.

**The toggle.** `src/components/theme/ThemeToggle.tsx`:

- holds **no React state**; the current theme is read from the `dark` class on the root element at
  click time. React state initialised to "light" while the cookie said "dark" is a hydration
  mismatch, and the usual cure — a `mounted` guard — makes the icon flicker on every load;
- has **no `aria-pressed`**: the accessible name comes from an sr-only span and describes the
  action, not a state, because announcing a state would require knowing the theme during the server
  render. Both icons stay in the DOM with the `dark:` variant choosing the visible one, so the same
  markup is valid for both themes;
- applies the theme **synchronously**, because `runThemeSweep` calls `applyTheme` from inside
  `startViewTransition()`; a deferred mutation is taken after the snapshot and the sweep animates
  nothing;
- persists by writing `document.cookie` on the client, **never through a Server Action** — a Server
  Action would revalidate and re-render `<html>` in the middle of the view transition, undoing the
  `classList.toggle` just applied;
- removes the `data-theme-switching` flag inside **nested** `requestAnimationFrame` calls. One frame
  is not enough: style is recalculated within the same frame, so a single rAF lifts the transition
  suppression before the new palette has been applied.

**The sweep.** In `src/lib/motion/theme-sweep.ts`, `transition.ready` **rejects** when the view
transition is skipped — two quick clicks, or the browser calling `skipTransition()`. The trailing
`.catch(() => {})` is mandatory: without it that is an unhandled rejection, a dirty production
console and the Next dev error overlay. There is nothing to repair when it happens — the theme was
already applied inside `startViewTransition`, and `finished` clears the data attribute regardless.

> **What the unit tests do not prove.** `theme.test.ts` runs in Vitest's `node` environment, so no
> assertion in it can show that there is no flash of the wrong theme on a slow connection with
> `theme=dark`. That check is manual and lives in the QA checklist. `THEME_COOKIE_MAX_AGE` is
> asserted from both sides — `legal.test.ts` checks the same number against the published cookie
> policy — so changing it makes the published table lie.
