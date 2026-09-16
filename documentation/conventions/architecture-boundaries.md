# Domain boundaries

> Dependencies run **in one direction only** and they all end in `domains/core`. No domain imports a
> sibling; `core` imports nobody; `app/` is the **only** composition layer. This is not a review
> convention: `eslint-plugin-boundaries` enforces it in `npm run lint`, with `default: "disallow"`.

## The six laws

1. **`core` imports nobody** except `lib/` and itself.
2. **Sibling domains do not import each other.** What is shared goes up to `core`; composition goes
   down to `app/`.
3. **`lib/` does not import `domains/`.** It is the lowest layer.
4. **`components/` (generic UI) imports only `lib/`, `i18n/`, `hooks/` and `core`.** It knows no
   domain.
5. **`app/` may import everything.** Being the only composition layer is what keeps the rule closed
   without exceptions.
6. **Inside a domain:** `components` → `hooks`/`services`/`actions`/`queries` → `content` → `types`.
   Additionally `content/`, `queries/` and `types/` import neither `react`, `react-dom`, `next/*` nor
   `motion`; and `hooks/`, `services/` and `actions/` **may not import `content/`** — their data
   arrives as props from the server.

```text
                 ┌──────────────────────────────────────────┐
                 │                 app/                     │  ← only composition layer
                 └───┬───────────────┬──────────────┬───────┘
                     │               │              │
        ┌────────────▼─────┐  ┌──────▼───────┐  ┌───▼──────┐
        │ domains/<X>/     │  │ components/  │  │  i18n/   │
        │  components      │  │  ui|common|  │  └────┬─────┘
        │     ↓            │  │  motion|theme│       │
        │  hooks|services  │  └──────┬───────┘       │
        │  |actions        │         │               │
        │     ↓            │      hooks/             │
        │  queries         │         │               │
        │     ↓            │         │               │
        │  content → types │         │               │
        └────────┬─────────┘         │               │
                 │                   │               │
                 └──────► domains/core ◄─────────────┘
                              │
                              ▼
                            lib/
```

No arrow goes up, and none goes from `domains/X` to `domains/Y` except towards `core`.

**The root of `core` is `config/locales.ts`, and it stays completely import-free.** It is the root of
the locale dependency graph: every module that needs to know which languages exist depends on it,
never the other way round. An import added there creates a cycle through whatever it imports.
Relatedly, `core/types/index.ts` derives `Locale` from `LOCALES` rather than from next-intl, so the
i18n library never enters the content type chain — pulling the locale type from next-intl would
couple every content type in the domain model to the i18n library.

## Why

**A lateral import between siblings does not stay put.** The day `profile` imports `experience`, the
next thing is `skills` importing `profile` and `experience` importing `skills`: the graph loses its
topological order, changing one CV type drags four domains along, and no domain can be read on its
own any more. With seven content domains that happens within a month.

**And because the correct coupling already has a home.** If two domains need the same thing, that
thing belongs to the **core** (`Locale`, `LocalizedText`, `YearMonth`, `localize()`, `period.ts`,
`SITE`) and goes up. If what they need is to be combined, the one who combines them is the **page**,
the only piece that legitimately knows the whole site. The rule does not remove the relationship: it
puts it where it can be seen.

Law 6 has its own, different reason: `content/` and `queries/` are **pure data**, evaluable at build
time and in Vitest with no DOM and no React runtime. That is why neither `react` nor `next/*` get in
there, and why `hooks/`, `services/` and `actions/` — which are client or I/O — may not read
`content/`: if a hook imports the CV, the whole CV ends up in the browser bundle.

## How it is really enforced

`eslint-plugin-boundaries` **7.2.0**, inside the same `npm run lint`, over `src/**/*.{ts,tsx}`. The
whole configuration is in `eslint.config.mjs`; this is what each part does.

### The elements: how a file is classified

```js
"boundaries/include": [ "src/**/*" ],
"boundaries/elements": [
  { type: "app",         pattern: "src/app" },
  { type: "domain",      pattern: "src/domains/*/*", capture: [ "domain", "layer" ] },
  { type: "social-icon", pattern: "src/components/common/SocialIcon.tsx", mode: "file" },
  { type: "ui",          pattern: "src/components" },
  { type: "hooks",       pattern: "src/hooks" },
  { type: "lib",         pattern: "src/lib" },
  { type: "i18n",        pattern: "src/i18n" },
  { type: "root",        pattern: "src/*.ts", mode: "file" },
],
```

- **`capture: [ "domain", "layer" ]`** is what makes law 2 scale.
  `src/domains/experience/content/experience.ts` is classified as
  `domain{ domain: "experience", layer: "content" }`, so the law is written **once** with the
  `{{from.domain}}` template instead of N×N hand-written rules. It still holds at the tenth domain.
- **Order matters: the first matching pattern wins.** That is why `social-icon` comes **before** `ui`
  (see exception 3) and why `root` exists: without it, `src/proxy.ts` and `src/global.d.ts` would
  have no policy at all and `default: "disallow"` would block everything they import.
- **`mode: "file"`** narrows the element to one specific file instead of a folder.

### The policies: who may import whom

`default: "disallow"` — what is not allowed is forbidden. Each policy declares a `from` and its
`allow` list. The three that hold the system up:

```js
// Law 1: core imports nobody except lib/ and itself.
{ from: { element: { type: "domain", captured: { domain: "core" } } },
  allow: [ { to: { element: { type: "lib" } } },
           { to: { element: { type: "domain", captured: { domain: "core" } } } } ] },

// Law 6 (pure layers) + law 2: no siblings, no framework.
{ from: { element: { type: "domain", captured: { layer: [ "content", "queries", "types" ] } } },
  allow: [ { to: { element: { type: "lib" } } },
           { to: { element: { type: "domain",
                              captured: { domain: "core", layer: [ "types", "config", "utils" ] } } } },
           { to: { element: { type: "domain",
                              captured: { domain: "{{from.domain}}",
                                          layer: [ "content", "queries", "types" ] } } } } ] },

// Law 6 (client and I/O): they may NOT import content/.
{ from: { element: { type: "domain", captured: { layer: [ "hooks", "services", "actions" ] } } },
  allow: [ …, { to: { element: { type: "domain",
                                 captured: { domain: "{{from.domain}}",
                                             layer: [ "types", "services", "hooks", "queries" ] } } } } ] },
```

`{{from.domain}}` resolves to the domain of the importing file: "you may see your own layers, not
your neighbour's". It is a single line and it covers all seven content domains.

### Precedence, the detail that makes or breaks law 4

**In `boundaries/dependencies` policies are evaluated in order and the LAST match wins.** They do not
extend: they **replace**. That is why the three declared exceptions sit at the end of the array and
each one **repeats** its layer's general permissions on top of its own; declaring only the new edge
would silently revoke the normal ones. An exception placed earlier in the array is simply dead.

And it is why an exception written as `from: { element: { type: "ui" } }` would have been a disaster:
it would have replaced law 4's policy **for the whole of `src/components/**`**, and any shadcn
primitive could have imported `domains/profile` with the lint staying silent. The written rule and
the enforced rule would have stopped matching, quietly.

### The three declared exceptions, and their limits

| # | Edge | Why it exists | How it is bounded |
|---|---|---|---|
| 1 | `profile/types` → `skills/content/icons.ts` | `SocialIconName = IconSlug \| "mail"`: the icon-slug vocabulary **is** content (the SVG generator consumes it) and typing it as `string` would let a non-existent icon through without error. | Type only: it disappears at compile time. `from` bounded to `{ domain: "profile", layer: "types" }`, `to` to `{ domain: "skills", layer: "content" }`. |
| 2 | `skills/components` → `profile/components` | `SkillBadge` renders `BrandGlyph`. Duplicating six lines of CSS mask across two domains is worse than declaring the edge. | Folder level, and a conscious decision: `skills/components` is four files. `to` bounded to `{ domain: "profile", layer: [ "components", "types" ] }`. |
| 3 | `components/common/SocialIcon.tsx` → `profile` | The project's only violation of law 4: the component routes brand → `BrandGlyph`, `"mail"` → lucide. | **To one real file**: `SocialIcon.tsx` is its own element (`mode: "file"`, declared **before** `ui`) and the policy starts from that element, not from `ui`. |

Two details that are easy to get wrong when editing exception 3:

- The `social-icon` element must stay declared **before** `ui`, since the first matching pattern wins.
  With `ui` first, `SocialIcon.tsx` would be typed `ui` and the exception written for one file would
  replace the generic-UI policy for all of `src/components/**`.
- `social-icon` still has to be listed as an allowed **destination** in every policy that allows
  `ui`. Giving a file its own element narrows what that file may import, not who may import it —
  `ContactChannels` and `SocialLinks` render `SocialIcon`, so dropping it from the destination lists
  breaks legitimate imports.

All three are written down, bounded to concrete pairs and verified in CI. That is preferable to a
rule with no exceptions held up by duplication.

## The import bans that sit alongside the boundaries

`no-restricted-imports` carries three more rules in the same config, and their ordering and spelling
matter:

- **The block gating the motion packages must be declared BEFORE the pure-data-layers block**, which
  declares the same rule. Rule options do not merge in ESLint flat config; the last matching config
  wins outright. With the motion gate second, the pure domain layers lose their bans on `react`,
  `react-dom` and `server-only`.
- **The restricted patterns are anchored with a leading slash** (`/motion`, not `motion`). `group`
  uses gitignore semantics, where a pattern without a slash matches any path segment: the unanchored
  form also banned the project's own `@/lib/motion/*` helpers, including the theme sweep
  `ThemeToggle` has to import. That bug was already hit once.
- **The npm package `cn` is banned.** `npx shadcn add <component>` writes `import { cn } from "cn"`
  into every primitive it generates and adds the package with a caret range; without the rule,
  regenerating any primitive reintroduces both silently. This project's `cn()` lives in
  `@/lib/utils` (clsx + tailwind-merge).

## `motion` has exactly one gateway

The animation library is a boundary of its own. `src/components/motion/MotionIsland.tsx` is the
**single gateway** to `motion`: every other module re-imports the API from there, and eslint's
`no-restricted-imports` blocks direct `"motion/react"` imports everywhere else —
`src/components/motion/` is the only folder in that rule's `ignores`. A direct import from anywhere
else bypasses `LazyMotion` and pulls the full feature bundle into the route bundle.

Four rules hold that gateway together:

- **`MotionIsland` is never hoisted into the localized layout.** It is `LazyMotion` + `MotionConfig`,
  i.e. React context: hoisting it makes the whole document a client subtree and drags `motion` into
  the shared bundle of every route, including the two legal pages that animate nothing. It also
  destroys the documented escape hatch for the motion budget, which is to push `MotionIsland` *down*
  into `next/dynamic` inside `TimelineProgress` and `ContactForm` — impossible from a place it never
  was. Both of those components wrap themselves.
- **The dynamic import inside it points at `./features`, never at `"motion/react"` directly.**
  `MotionIsland` already imports `"motion/react"` statically, so `import("motion/react")` would
  resolve to a chunk the bundler has already pulled in and nothing would be split. A separate module
  is the only way the feature bundle lands in its own chunk, and the bundle budget assumes it does.
- **`features.ts` holds one re-export and nothing more, and declares no `"use client"`.** Any extra
  export gets dragged into the deferred chunk; a directive there marks it as a second client entry
  point and gives the bundler a reason to merge it back into the module that dynamically imports it.
- **`LazyMotion` stays in `strict` mode and `MotionConfig` keeps `reducedMotion="user"`.** `strict`
  throws if a subtree uses `motion.*` instead of `m.*`, which would silently defeat the code
  splitting. `reducedMotion="user"` is not optional: motion's default is `"never"`, which **ignores**
  `prefers-reduced-motion`.

The motion primitives themselves receive content as children-as-props and **never import next-intl
or call `useTranslations`** (a guard in `primitives.test.ts` asserts it). If a primitive translated
or rendered data itself, it would drag the entire surrounding section into the client bundle instead
of leaving it server-rendered.

## The worked case: `profile` needs the current position

The site owner's current role is stated in six places (`Meta.title`, `Hero.currentRole`,
`About.paragraphOne`, `About.factRole`, the JSON-LD and the PDF). That role belongs to the position
with no end date, and positions live in `domains/experience`. Written naively:

```ts
// ❌ profile/queries/getJobTitle.ts
import { experience } from "@/domains/experience/content/experience";  // law 2: lint error
```

**What was actually done** was to parameterise the query over **the minimal shape it reads**,
declared structurally inside `profile`:

```ts
// src/domains/profile/queries/getCurrentPosition.ts
export interface PositionLike {
  readonly role: LocalizedText;
  readonly company: string;
  readonly endDate: string | null;
}

export function getCurrentPosition<T extends PositionLike> (positions: readonly T[]): T | null {
  return positions.find((position) => position.endDate === null) ?? null;
}
```

```ts
// src/domains/profile/queries/getJobTitle.ts
export function getJobTitle (current: PositionLike | null, locale: Locale): string {
  return current === null ? FALLBACK_JOB_TITLE[ locale ] : current.role[ locale ];
}
```

An `ExperienceEntry` **satisfies `PositionLike` without a single import**: TypeScript's structural
typing does the work the dependency would have done. And the one who knows both domains — the page,
in `app/[locale]/` — is the one who joins them:

```tsx
const current = getCurrentPosition(experience);        // experience comes from its own domain
const role = getJobTitle(current, locale);             // the query does not know where it came from
```

**Why this is better than the lateral import**, and not merely "legal":

- **`getJobTitle` is pure and trivial to test.** `getJobTitle.test.ts` builds two three-field objects
  and covers both branches without loading the whole CV. With the import, every title test would
  drag the real content along and change every time the owner changes job.
- **The fallback branch can be exercised.** `FALLBACK_JOB_TITLE` is what renders on the day there is
  no ongoing position — `getCurrentPosition` returns `null`, which *is* `openToWork` — and that day
  cannot be simulated while coupled to `experience.ts`.
- **`profile` still reads on its own.** Its input contract is written in its own file, with a name.
  `PositionLike` says exactly what the domain needs: three fields, not sixteen.
- **The coupling points the right way.** It is `app/` that depends on both domains, and `app/` is the
  layer rewritten when the page changes, not when the CV changes.

> **Trade-off, written down:** signatures come out longer than `getJobTitle(locale)`. Gladly paid.
> The same technique applies elsewhere: `formatPeriod` and `getExperienceTimeline` receive the
> "Present" label as a parameter instead of reading the catalogue, because a pure layer does not talk
> to next-intl.

## When the rule gets in your way

There is almost always one of these four ways out, **in this order**:

1. **Compose higher up.** Need data from two domains at once? Read them in the `app/` Server
   Component and pass them down as props. That is what the case above does, and it is the right
   answer 90 % of the time.
2. **Parameterise over the shape, not the domain.** Declare in your domain the minimal interface you
   consume (`PositionLike`) and let structural typing close the edge. It costs five lines and no
   dependency.
3. **Move what is shared up to `core`.** If it really is common vocabulary — a type, a date utility,
   an identity datum — its home is `domains/core`, which imports nobody and can therefore be imported
   by everybody.
4. **Only then, declare an exception.** And then: bound it to the narrowest `from`/`to` pair possible
   (a file with `mode: "file"` if one file will do), put it at the end of the array repeating its
   layer's general permissions, write the reason **next to the policy**, and add it to the table in
   this document.

What is **never** the answer: promoting the exception policy to a whole `type`, widening a `to` "in
passing", or silencing the rule with an `eslint-disable`. All three turn a verified boundary into a
comment.

> **How we know this works and is not a promise.** Enforcement was tested with **seven violations
> written on purpose** — including **type-only** imports between siblings, which were the likeliest
> leak — `eslint .` was confirmed to fail on all seven, and they were deleted. The same run confirmed
> that the three declared edges and the legitimate imports (`app → domain`,
> `domain/content → core/types`, `domain/components → lib`) pass **without a single false positive**.

## Two version notes that save an afternoon

`eslint-plugin-boundaries` v7 renamed the rule `element-types` → `dependencies` and `rules` →
`policies`, selectors became objects, and templates moved from `${…}` to `{{…}}` (the old syntax
prints deprecation warnings on every run). And the `{{file.type}}` interpolation in the rule's
`message` field **renders empty** in 7.2.0: that is why no custom message is defined — the default
one is verbose, but it names the element, the domain and the layer at both ends, which is exactly
what is needed to fix the import.
