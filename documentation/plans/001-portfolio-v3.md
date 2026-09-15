# 001 — portfolio-v3

> The plan of record for the rebuild, with its **real** status. The specification it executes is
> `~/projects/personal/PLANIFICACION-portfolio-v3.md`; section references below (§4, §12.10, §14.14.1)
> point into that document. This file does not restate the specification — it says what each phase
> actually delivered, where the build diverged from the plan, and what is still open.

Phases 0 to 10 block A are **done**. Block B — production deployment — belongs to the owner. Phase
11, the projects section, is **deferred by his explicit decision** until there is work worth showing.

---

## Status at a glance

| Phase | What it covers | Status |
|---|---|---|
| 0 | Bootstrap and toolchain | Done |
| 1 | Design system: tokens, typography, primitives, style guards | Done |
| 2 | i18n, routing, message catalogues, route shell | Done |
| 3 | Theme, cookies, motion engine | Done |
| 4 | Domain model and CV content | Done |
| 5 | Site chrome | Done |
| 6 | The seven home sections | Done |
| 7 | Contact form and security | Done |
| 8 | Legal pages and the storage inventory | Done |
| 9 | SEO, metadata, generated assets | Done, minus the CV PDFs |
| 10 A | The quality gate: Docker, Lighthouse, documentation | Done, minus the Playwright suite |
| 10 B | Production: Vercel, DNS, Resend domain, the `v3.0.0` tag | **Owner's. Not started.** |
| 11 | Projects section | **Deferred.** Architecture shipped in phase 6; content does not exist. |

---

## The numbers, measured

Measured on 2026-09-15 against Next 16.3.4, Node 24, on the development machine.

| | |
|---|---|
| `npm run check` | **exit 0** |
| Unit tests | **623 passing, 1 skipped** (624 total) across **37 test files** |
| Build | **exit 0**, 21 static pages generated |
| Prerendered as SSG (`●`) | **12**: six pages and six Open Graph images |
| Prerendered as static (`○`) | **6**: `/_not-found`, `/apple-icon.png`, `/icon.png`, `/manifest.webmanifest`, `/robots.txt`, `/sitemap.xml` |
| Rendered on demand (`ƒ`) | **1**: `/api/health`, and the locale proxy |
| Contrast combinations enforced | **44** (24 pairs × 2 themes, less 4 marked informative) |
| Message catalogue | **137 leaf keys** per language, 17 namespaces, EN and ES at parity |
| `"use client"` source modules | **17** (13 by decision, 4 shipped that way by shadcn) |
| shadcn primitives | 9 |
| Generated icons | 23 SVG under `public/icons/` plus 3 PWA PNGs and the favicon set |

**The six SSG pages** are `/`, `/es`, `/privacy`, `/es/privacy`, `/cookies`, `/es/cookies` (the build
table prints them under their `/en` prefix; the proxy serves the default locale unprefixed). **The
six OG images** are one card per page per language.

### What `npm run check` covers

```
typecheck → lint → check:style → check:contrast → test
```

- **`typecheck`** — `tsc --noEmit` over `src/`, `scripts/`, `tests/` and `next.config.ts`, with
  `strict` plus `noUncheckedIndexedAccess`, `noImplicitOverride`, `noUnusedLocals`,
  `noUnusedParameters` and `noFallthroughCasesInSwitch`.
- **`lint`** — `eslint .` with `--max-warnings 0` and `--report-unused-disable-directives`. Formatting
  (`@stylistic`), the dependency laws (`eslint-plugin-boundaries`), the gradient patterns in TS/TSX
  (`no-restricted-syntax`) and the import gate on `motion` and `cn`.
- **`check:style`** — gradients and literal colours across `src/**/*.{css,svg,ts,tsx}`,
  `public/**/*.svg` and `messages/*.json`.
- **`check:contrast`** — 44 WCAG AA pairs resolved from `globals.css`, not from a hard-coded table.
- **`test`** — Vitest, `node` environment, `src/**/*.test.ts`.

**This is the only list of quality checks in the project**, and nothing runs it automatically.

### What it does not cover

`npm run check` never opens a browser. Everything with a DOM — focus order, the focus trap, the
theme cookie round trip, axe, Core Web Vitals, the canonical and `hreflang` contract — belongs to
Playwright, and the Playwright suite is deferred (see **Open items**). The build is also outside the
gate: `npm run build` is a separate command, and its routes table is the only place a route that has
quietly turned dynamic shows up.

---

## Phase by phase

### Phase 0 — Bootstrap and toolchain

Scaffolded with `shadcn@4.21.0 init`, then lifted to the exact versions of §4.2. Prettier, which the
scaffold installs, was removed on purpose. `next.config.ts` landed complete on day one, CSP included,
so that the phase introducing a violation is the phase that fails. `vitest.config.ts` and
`playwright.config.ts` both shipped here, so every later phase could verify its own work.

Delivered: `package.json` with exact pins, the committed lockfile, `tsconfig.json`,
`eslint.config.mjs`, `.editorconfig`, `postcss.config.mjs`, `components.json`, `next.config.ts`,
`src/app/api/health/route.ts`, `.nvmrc`, `.gitignore`, `.dockerignore`, both `.env.example.*`
templates, `README.md`.

### Phase 1 — Design system

`globals.css` in full: the four-line brand dial, the derived primitive scale, the semantic tokens and
the `@theme inline` bridge. Nine shadcn primitives installed and patched (`transition-all` and
`outline-none` removed). Typography self-hosted with `next/font/local`. The two guard scripts
written, and the zero-gradients rule handed to a machine.

**Divergence from the specification: the typeface is Montserrat, not Inter.** §6.8 specified Inter.
Montserrat was chosen during the phase, and the whole type scale was recomputed from measured
metrics — x-height parity put the body at 17 px, the measure at 36.5 rem, the tracking ramp
remeasured for a geometric, wide family. The arithmetic and its traps are in
`documentation/conventions/gotchas.md`. Anyone changing the family again has to redo it.

Delivered, beyond the spec list: `src/lib/palette-srgb.ts` and its parity test,
`scripts/check-style-rules.ts`, `scripts/check-contrast.ts`, `scripts/prepare-fonts.md`,
`documentation/conventions/no-gradients.md` and `theming-and-brand-color.md`.

### Phase 2 — i18n, routing and the catalogues

The six URLs exist, `en` carries no prefix, the site sets no cookie on a first visit, and the 404 is
a real 404 with server-rendered HTML in the right theme. Both catalogues landed complete.

**`src/proxy.ts`, not `middleware.ts`** — Next 16 renamed the file. The matcher excludes `api`,
framework internals, the metadata image routes and anything with an extension.

**137 leaf keys per language, not the 138 the specification counted.** The difference is
`Meta.ogImageAlt`, which §11 dropped once `generateImageMetadata` took over the card's alt text; the
catalogue in §9.11 was already written without it.

### Phase 3 — Theme, cookies and the motion engine

The `theme` cookie is the only cookie the site ever writes, and only after a click. The pre-paint
script ships inline in the prerendered HTML, so a `dark` cookie paints no white flash.
`COOKIE_REGISTRY` imports the cookie name from `src/lib/theme.ts`, so the policy page cannot drift
from the code.

Motion: one shared `IntersectionObserver` rather than `whileInView`, three primitives (`Reveal`,
`Stagger`, `CountUp`), the hidden state living entirely in CSS behind `html[data-motion]`, and a 3 s
fail-safe that reveals everything if the bundle dies. `prefers-reduced-motion` is answered rule by
rule — 24 of them — never with a global `!important` reset.

### Phase 4 — Domain model and content

Seven content domains typed and populated from the CV. **No fact is written twice**: years of
experience, the current role, the company count and the footer year are computed from
`SITE.careerStart` and the `YearMonth` dates in `experience.ts`. The dependency laws were written
down and handed to `eslint-plugin-boundaries` in this phase.

Delivered documentation: `content-authoring.md`, `architecture-boundaries.md`.

### Phase 5 — Site chrome

Header, footer, section navigation, locale switcher, skip link and the mobile `Sheet`. The header is
a Server Component; only the active-section indicator is an island. The locale switcher renders two
real anchors, so it works without JavaScript.

### Phase 6 — The seven home sections

Hero, About, Skills, Experience, Education, Projects and the Contact shell. The Projects section
decides on `projects.length === 0` and renders the empty state; the card component exists and
compiles against an empty typed array.

The `resource-summary` budgets in `lighthouserc.json` were supposed to be measured here and promoted
from `warn` to `error`. **They are still `warn`** — see Open items.

### Phase 7 — Contact form and security

One Server Action, not a route handler. Zod schema shared between client and server, three anti-abuse
layers (honeypot, a fixed-window in-memory rate limit keyed on a hashed IP, and payload bounds), mail
through Resend with a hand-written HTML template and a plain-text alternative. **Nothing is stored.**
An empty `RESEND_API_KEY` logs to stdout instead of sending, which is what lets the contact E2E
exercise the success path without real mail.

Delivered documentation: `security-and-cookies.md`.

### Phase 8 — Legal pages

`/privacy` and `/cookies` in both languages, prose written **after** the cookie inventory was frozen,
and a cookie table rendered from `COOKIE_REGISTRY` rather than typed by hand. The prose contains no
literal domain: `{domain}` and `{ownerEmail}` are substituted at render time.

### Phase 9 — SEO, metadata and generated assets

Canonical URLs, `hreflang` including `x-default`, a six-URL sitemap with alternates, JSON-LD built by
pure functions, `robots.ts` with `Disallow: /` outside production, a minimal manifest, and the full
icon set generated from one 500×500 PNG. The OG card is flat colour on flat colour — the zero-gradient
rule applies to it like everything else.

**Two divergences, both resolved in the build's favour:**

- **Six OG images, not two.** The specification's phase list expected one card per language. The
  legal pages got their own cards as well, so `/privacy` and `/cookies` do not fall back to the home
  card when shared.
- **The `generateImageMetadata` URL shape was the open risk of §11.4.4, and it did not bite.** The
  built route is `/en/opengraph-image`, not `/en/opengraph-image/card`. The proxy matcher's `$`
  anchor is correct as written and needs no widening.

**The CV PDFs were not delivered.** `scripts/generate-cv.ts` and `scripts/cv-template.ts` were never
written; `npm run cv` is a script pointing at a file that does not exist. See Open items.

### Phase 10 block A — the quality gate

The deliverables of §14.14.1: the Lighthouse budgets, the `Dockerfile` and `docker-compose.yml`,
`DEPLOYMENT.md`, the two deployment guides, and the two documents in `documentation/` — this plan and
`conventions/deviations-from-guidelines.md`.

Two of the block's deliverables could not be produced or verified here, and both are recorded as
open rather than pretended closed: **`tests/e2e/a11y.spec.ts`** (Playwright is deferred by the owner)
and **the Docker build** (Docker is not installed on this machine).

### Phase 10 block B — production

**The owner's, entirely.** Vercel project wired to `main`, the environment variables of §11.1.2 filled
from `.env.example.production`, the domain and DNS, the Resend domain verified with SPF and DKIM, one
real message sent from the production form, and the `v3.0.0` tag. The acceptance commands are in
§14.14.2. HSTS preload submission comes **after** confirming the whole domain serves over HTTPS, not
before.

### Phase 11 — Projects

Deferred by explicit decision. **This is not debt.** `Project`, `ProjectImage`, `ProjectLinks` and
`ProjectStatus` are typed; `projects.ts` exports an empty typed array; `ProjectsSection` branches on
its length; `ProjectCard` exists and compiles; the empty state is written in both languages. Adding
the first project is adding one object to the array plus its images under `public/projects/`. The
site goes to production without it.

---

## Where the plan and the build differ

| Specification | Build | Note |
|---|---|---|
| Inter (§6.8) | Montserrat | Type scale recomputed from measured metrics. |
| 14 unit test files (§12.4) | 37 files, 623 tests | The inventory listed the files the spec itself owned; each phase added its own. |
| 138 leaf keys (§9.11) | 137 | `Meta.ogImageAlt` has no consumer; `OpenGraph.imageAlt` serves the card's alt. |
| 2 OG images (§14.13) | 6 | The legal pages got their own cards. |
| `/{locale}/opengraph-image/card` marked **[uncertain]** (§11.4.4) | `/{locale}/opengraph-image` | The risk did not materialise; the matcher needs no change. |
| 13 files with `"use client"` (§5.9) | 17 | The 13 of the catalogue plus four shadcn primitives that ship with the directive. Recorded in `deviations-from-guidelines.md`. |
| `middleware.ts` | `src/proxy.ts` | Renamed by Next 16. |
| `npm run cv` generates two PDFs (§9.12) | Script absent | See Open items. |

---

## Open items

Six things are genuinely unfinished. None of them blocks block B.

### 1. The two CV PDFs

`public/cv/` does not exist. `SITE.cvPath(locale)` resolves to `/cv/matteo-leccese-cv-{en,es}.pdf`
and `DownloadCvButton` renders in the hero, so **the download link on the live site would 404 today**.
`scripts/generate-cv.ts` and `scripts/cv-template.ts` were never written and `npm run cv` fails.

The procedure is §9.12: an HTML template, rendered to PDF by **Playwright's Chromium**, which is not
installed here. The template reads `PALETTE_SRGB.light.*` by semantic name, and the PDF is the only
surface that prints `SITE.phone` — which is why `/cv/:path*` is served `noindex, noarchive` and with
a short `s-maxage` rather than an immutable cache.

Until the PDFs exist, either generate them or remove the button. A 404 behind a primary call to
action is worse than no button.

### 2. The Playwright suite

`tests/e2e/` is **empty**. `playwright.config.ts` is complete and correct — two projects, desktop and
mobile, a `webServer` that owns `npm run build && npm run start` and every environment variable the
E2E build needs — and its `testMatch` lists seven spec files that do not exist yet: `a11y`,
`cookies`, `contact`, `keyboard`, `motion`, `seo`, `theme-locale`.

`npm run test:e2e` therefore exits non-zero: Playwright treats "no tests found" as a failure. Phases
3 through 9 each named a spec as an acceptance criterion; those criteria are currently manual checks,
and the ones that matter are marked as such in `documentation/conventions/gotchas.md`.

### 3. The Flusso logo

`experience.ts` carries `logo: null` for the current employer. `CompanyLogo` renders the monogram
tile for that case, which is a designed fallback and not a bug — but three of the four companies
show a real mark and the current one does not. The file goes in `public/companies/`, and setting
`logo` is the whole change.

### 4. The Lighthouse budgets

The five `resource-summary:*:size` budgets in `lighthouserc.json` are still `warn`. §14.10 made
promoting them to `error` a deliverable of phase 6: collect one run against the finished home page,
then write each measured value back multiplied by 1.15. Nothing enforces the file either way:
`npx lhci autorun` against a local `npm run start` is the only thing that reads it.

### 5. The orphan-key invariant is still skipped

`src/i18n/messages.test.ts:254` — *"has no key that nobody calls"* — is `it.skip`, and its comment
still says the catalogue's consumers are being written. They are not: the home page, both legal pages
and the contact form all shipped. §14.6 scheduled this invariant to be re-enabled in **phase 6**.
This is the single skipped test in the suite. Turning it on is the check that no dead copy is still
being translated.

### 6. `documentation/conventions/` is git-ignored

`.gitignore` ends with `/documentation/conventions`. The seven files in that folder — the
architecture boundaries, the content rules, the gotchas, the no-gradients rule, security and cookies,
theming, and the deviations list — **are not under version control**. This plan is, because
`documentation/plans/` is not excluded.

Nothing depends on the exclusion. It needs a decision from the owner: either the folder is versioned
like the rest of the documentation, or the reason for keeping it local is written down. Until then
the most valuable documentation in the project exists on exactly one machine.

### Verification deferred

Two things are written but have never been executed anywhere:

- **`Dockerfile` and `docker-compose.yml`.** Docker is not installed on the development machine, so
  no image has ever been built from them.
- **The Lighthouse budgets.** `lighthouserc.json` has never been collected against. Running it is
  `npx lhci autorun`, by hand, against a local `npm run start`.

---

## What "closed" looks like

Block A is closed when `npm run check` and `npm run build` are green — they are — and when
`npm run check` **fails** on a `.tsx` that introduces `bg-linear-to-r`. That is the criterion that
proves the project's first hard rule is enforced by a machine and not by memory.

Block B is closed when the acceptance commands of §14.14.2 pass against the live domain and a real
message sent from the production form arrives in the owner's inbox.
