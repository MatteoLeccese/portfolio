# Zero gradients

> In `portfolio`, **every gradient is forbidden**: background, text, border and mask. No
> `linear-gradient()`, no `radial-gradient()`, no `conic-gradient()`, none of the
> `bg-linear-*` / `bg-radial` / `bg-conic` utilities, not the legacy `bg-gradient-*` alias, not the
> `from-* / via-* / to-*` stops, not the edge masks `mask-t-from-*` / `mask-b-to-*` / `mask-x-*` /
> `mask-y-*`, not `bg-clip-text` with `text-transparent`, not the `shimmer` utility from
> `shadcn/tailwind.css`, and not a `<linearGradient>` inside a project SVG.
>
> Visual hierarchy is built with **lightness, elevation and hairlines**, never with colour
> transitions.

This is the project's first hard rule and two machines enforce it. It is not negotiable in review.

## Why it exists

Three technical consequences hold the rule up.

1. **Surfaces are told apart by lightness, not by material.** `--background` → `--card` →
   `--muted` are three steps along one lightness scale. A gradient introduces a light direction the
   rest of the page does not sustain: the moment a card has a "top" and a "bottom", the card next to
   it looks broken.
2. **A gradient has no contrast ratio.** `npm run check:contrast` measures *foreground /
   background* pairs resolved from `globals.css`. A surface whose colour changes across the element
   cannot be anchored to a pair, so the AA guarantee would stop being verifiable exactly where the
   page is flashiest.
3. **A rebrand would stop being a four-line change.** Every surface is *one* token, which is why
   moving the dial drags the whole site with it (see `theming-and-brand-color.md`). A gradient is
   two or three hand-picked stops: exactly what keeps the old colour when the brand changes.

## What counts as a gradient

All of this is rejected, wherever it is written (`.css`, `.ts`, `.tsx`, `.svg`, `messages/*.json`):

| Form | Examples |
|---|---|
| CSS functions, repeating variants included | `linear-gradient(`, `radial-gradient(`, `conic-gradient(`, `repeating-linear-gradient(` |
| Tailwind v4 utilities **and** the legacy v3 alias | `bg-linear-to-r`, `bg-radial`, `bg-conic`, `bg-gradient-to-b` |
| Colour stops | `from-green-500`, `via-primary`, `to-transparent` |
| Tailwind v4 edge masks | `mask-t-from-50%`, `mask-b-to-black`, `mask-x-from-0%` |
| Text clipped over a background | `bg-clip-text`, `background-clip: text`, `-webkit-background-clip: text` |
| Engine-internal variables | `--tw-gradient-from`, `--tw-gradient-stops` |
| Project SVG | `<linearGradient>`, `<radialGradient>` |
| The `shimmer` family from `shadcn/tailwind.css` | `shimmer`, `shimmer-once`, `shimmer-color-*`, `shimmer-duration-*` |

The last two rows are in the patterns even though their class names never say "gradient": Tailwind
v4 edge masks compile to a real `linear-gradient`, and so do the four opt-in shimmer utilities
shipped by `shadcn/tailwind.css`.

## What does NOT count (and legitimately appears in the code)

- **`bg-clip-padding`.** Clips the background to the padding box; there is no colour transition. It
  comes in the `base-nova` base class and lives today in `src/components/ui/button.tsx` and
  `src/components/ui/sheet.tsx`. The patterns require **exact** `bg-clip-text` so this one is left
  alone.
- **Opacity modifiers.** `bg-primary/10` compiles to
  `color-mix(in oklab, var(--primary) 10%, transparent)`: a colour with alpha, not a transition.
- **The `--elevation-1/2` shadows**, including the luminous hairline `0 0 0 1px oklch(1 0 0 / 0.06)`
  which, in dark, is what actually separates a card from the background.
- **`backdrop-blur`** in its only two allowed places: the header on scroll and the `Sheet` backdrop.
  There is no glassmorphism here, but a blur is not a gradient.
- **English prose and anchors**: `"from Feb 2026 to Present"`, `#back-to-top`, `mask-to-do`,
  `shimmering-water`. The stop patterns require a real colour name from the Tailwind colour
  vocabulary after `from-`, `via-` and `to-`, and an axis after `mask-`, precisely so ordinary
  identifiers do not fire. Without the colour requirement, an anchor like `back-to-top` matches the
  gradient rule and produces a false lint error.

## How depth is built without them

1. **Typographic hierarchy.** A single family — Montserrat variable, body and headings alike: there
   is no second display family — and seven steps with their weight, tracking and line height already
   decided: `text-display`, `text-h2`, `text-h3`, `text-lead`, `text-body`, `text-meta`,
   `text-eyebrow`. The size jump does the work colour does elsewhere.
2. **Hairlines.** `hairline-t` / `hairline-b` and `border-hairline` separate what shares a plane: a
   list, a section, a footer. They cost 1 px and invent no light.
3. **Elevation, two levels and no more.** `shadow-elevation-1` at rest, `shadow-elevation-2` only
   for what really floats: the `Sheet` and the link-card hover. Same plane, hairline; covering
   content, elevation.
4. **One sparing accent.** Green appears on the primary button, links, the focus ring, the timeline
   rail and the skill glyphs: fewer than ten elements per screen. A scarce accent reads as
   hierarchy; an accent spread across gradients reads as decoration.

## How it is enforced

Two mechanisms, because neither is enough alone:

| Mechanism | Scope | Sees | Does not see |
|---|---|---|---|
| ESLint `no-restricted-syntax` (`eslint.config.mjs`) | `src/**/*.{ts,tsx}` | literals and template literals, with AST precision and its own message | `globals.css`, SVG, JSON |
| `scripts/check-style-rules.ts` (`npm run check:style`) | `src/**/*.{css,svg,ts,tsx}`, `public/**/*.svg`, `messages/*.json` | all of the above **plus** CSS, generated SVG and translatable copy | classes built by concatenation; `tests/` and `documentation/` |

Both run inside `npm run check`, which is what CI executes. Four things to know before touching
either one:

- **There is exactly ONE `no-restricted-syntax` block in the whole project, on purpose.** In flat
  config a rule's options do not merge: the last block declaring the rule replaces the previous one.
  Adding a second block — for a motion rule, say — would switch off the first hard rule **without a
  single warning**. New patterns go into the block that already exists.
- **That block is scoped to `src/**` on purpose, and must not be widened to `scripts/`.**
  `eslint.config.mjs` and `scripts/check-style-rules.ts` necessarily contain the forbidden patterns
  as regex literals; widening the scope makes the guard report itself and the lint gate can never
  pass.
- **The compound `shimmer` forms (`shimmer-color-*`, `shimmer-duration-*`, `shimmer-spread-*`,
  `shimmer-angle-*`) are caught by the scanner, not by ESLint**: the ESLint pattern ends in
  `(?![-\w])` and a second pair of hyphens escapes it. One more reason not to skip
  `npm run check:style` because "I only touched a `.tsx`".
- **The scanner's `gradient-utility` pattern closes with a negative lookahead over `[A-Za-z0-9_]`
  only — the hyphen is deliberately excluded.** An earlier closing group `(?:[^A-Za-z0-9_-]|$)`
  required a non-word character after `linear`/`radial`/`conic`. Tailwind v4 utilities carry a
  direction suffix (`bg-linear-to-r`, `bg-conic-180`), so the hyphen made the match fail and the
  guard let the commonest gradient of all through undetected.

`messages/*.json` is scanned even though it sits outside `src/`: translatable copy goes through
`t.rich` with markup, so a gradient utility hidden inside a translation string is invisible both to
the ESLint rule and to any src-only scan.

## The five honest limits

What the two mechanisms do **not** guarantee, and must be checked in review:

1. **Classes built by concatenation** (`` `bg-${tone}-to-r` ``). Mitigation: Tailwind classes in this
   project are **always complete literals** — `cva` and literal maps, never glued fragments — which
   is also what Tailwind's own engine requires in order to detect them.
2. **A PNG or WebP with a gradient baked in.** Policy: third-party logos are stored as PNG, never as
   SVG, so they neither enter the scanner nor force an exception. The one known third-party logo
   with a gradient carries `logo: null`.
3. **`node_modules` is deliberately out of scope.** `shadcn/tailwind.css` contains 13
   `linear-gradient` (12 are `scroll-fade` masks and 1 is the opt-in `shimmer` utility). Nothing is
   patched there: what is forbidden is **using the class** from `src/`.
4. **The literal-colour rule can produce a false positive** with an anchor whose `id` is a valid hex
   triplet (`#abc`). None is today; if one ever were, **rename the id, do not loosen the rule**.
5. **`tests/` and `documentation/` are outside both mechanisms.** A gradient written in a Playwright
   spec or in this very file is caught by nobody — and it never reaches the site, which is why that
   is accepted. `messages/*.json` **is** in scope: it is the only content outside `src/` that is
   rendered, with markup, on the page.

`.baseline/` is globally ignored by ESLint: it holds `cp` backups that stand in for
`git diff` / `git checkout` in this repo's acceptance criteria, including unpatched shadcn
primitives that deliberately violate the formatting rules.

## When the shadcn CLI or a library brings one in

In order of preference, with no creative exceptions:

1. **If it is in a file of ours** (a primitive regenerated by `npx shadcn@4.21.0 add <x>`), delete
   the class and replace it with a hairline or elevation. Record the change as a **mandatory patch**
   in `documentation/conventions/`, written as the *complete final string* and never as a partial
   diff: the CLI regenerates files and a diff stops applying. Review the `src/app/globals.css` diff
   after every `add` as well — the procedure is in `README.md`, with the `cp` + `diff` variant for
   when git is not used.
2. **If it lives in `node_modules`** (`shimmer`, `scroll-fade`), the package is not patched: the
   class is simply not used. The scanner never goes in there, which is why the pattern chases the
   utility name.
3. **If a component drags its own gradient CSS along, it is not installed.** `scroll-area` is on the
   "never installed" list for exactly this reason: it brings the `scroll-fade` masks.
4. **An exemption is never added to the scanner.** The nine gradient rules carry `exempt: []` and
   stay that way. If something seems to need one, the correct answer is a different design.

## The same guard's second rule: no literal colours

`check-style-rules.ts` also enforces that **no file outside `src/app/globals.css` contains a literal
colour** (`#…`, `oklch()`, `rgb()`, `hsl()`, `lab()`, `color-mix()`). The reasoning, the rebrand
procedure and the two declared exceptions — `src/lib/palette-srgb.ts` and
`src/domains/contact/services/mailer.ts` — are in
[`theming-and-brand-color.md`](./theming-and-brand-color.md).

Only the part that concerns this file here: **a third exception requires a new entry in this
document**, with the path, the consumer that cannot resolve `oklch()` and the test anchoring its
values against `globals.css`. There is none today, and that is the point.

> Colour exceptions are **not** gradient exceptions: `mailer.ts` is exempt only from the two
> literal-colour rules; the nine gradient rules still apply there, and `mailer.test.ts` checks them
> again from inside the rendered HTML.
