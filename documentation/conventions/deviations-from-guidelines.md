# Deviations from the guidelines

> The house standard is `~/projects/personal/guidelines/`. It was distilled from two reference
> projects — a Laravel REST API and the Next.js admin panel in front of it — so it describes a
> **two-repository client/server system with a database**. This project is **one statically
> prerendered content site with no data and no backend**. Most of the gap is not disagreement: it is
> subject matter that does not exist here.

This file lists every place the project departs from the guidelines, and why. It has a second job:
**adding a `"use client"` that is not in the island catalogue requires a new entry here.** This is
where conscious debt is made visible.

Each entry says what the guideline asks, what this project does instead, and what the decision
costs. The last section lists the things that *look* like deviations and are not, because a list
that cries wolf is a list nobody reads.

---

## The shape of the mismatch

| What the guidelines assume | What this project is |
|---|---|
| Two repositories talking over REST | One repository. No network hop, no contract. |
| A Laravel API, PostgreSQL, Redis, Sanctum | No backend. No database. No session. |
| An interactive admin panel behind a login | A public content site with one form. |
| Data fetched at runtime per tenant | Content compiled into the bundle at build time. |
| Traefik owning TLS on a shared host | Vercel owns TLS; Docker is the fallback path. |

Everything below follows from that one difference.

---

## 1. The entire backend-facing layer does not exist

`frontend.md` calls the BFF proxy "the security cornerstone". It exists to keep a Sanctum bearer
token out of the browser. **There is no token**, so there is nothing to keep out of anywhere.

| Guideline piece | Status here |
|---|---|
| `src/app/api/proxy/[...path]/route.ts` (catch-all BFF) | Absent. |
| `src/app/api/auth/{login,logout,me}/route.ts` | Absent. There is no authentication. |
| `src/lib/backend.ts`, `BACKEND_API_URL` | Absent. |
| `src/lib/session.ts`, the httpOnly token cookie | Absent. The only cookie is `theme`. |
| A single axios instance with interceptors | Absent. `axios` is not a dependency. |
| A Zustand store with `persist` + `partialize` | Absent. `zustand` is not a dependency. |
| `ApiResponse<T>`, `ApiError`, `lib/error-codes.ts` | Absent. Nothing returns an envelope. |
| `X-Tenant-ID` and multi-tenancy | Absent. There is one tenant and he owns the domain. |
| `NEXT_PUBLIC_PASSWORD_SALT` and the SHA-512 pre-hash | Absent. No password is ever typed. |
| The whole of `api-contract.md` | No subject. |

**The only route handler in the project is `GET /api/health`**, and it exists for the container
healthcheck, not for the browser. It is also the only `ƒ` (dynamic) entry in the build table.

### What replaced `services/`

The guidelines' `domains/<d>/services/` is an API client: async functions wrapping endpoints. Here
the equivalent role is split in two, and neither is a client:

- **`domains/<d>/content/*.ts`** — the content repository. Typed, `Record<Locale, …>` data that *is*
  the answer, compiled in at build time. `experience.ts`, `skills.ts`, `privacy.ts`. This is what a
  `service` would have gone to the network for.
- **`domains/<d>/queries/*.ts`** — pure read functions over that content: `getExperienceTimeline`,
  `getCurrentPosition`, `getJobTitle`. They take content and a locale and return view data. No
  React, no Next, no `motion` — enforced by a `no-restricted-imports` block in `eslint.config.mjs`.

**`services/` still exists, and means the opposite of what the guidelines mean by it.** In
`domains/contact/services/` live `mailer.ts` and `rate-limit.ts`: server-only outbound code, both
importing `server-only`. A guideline `service` runs in the browser and calls inward; these run on the
server and call outward. The name was kept because there is no better one; the difference is
recorded here so nobody looks for an axios instance in that folder.

### The layer vocabulary is different

| Guidelines | Here |
|---|---|
| `services` `hooks` `types` `components` `store` `utils` | `content` `queries` `actions` `services` `components` `types` |
| `domains/core` = axios + global store + shared DTOs | `domains/core` = `config` + `seo` + `types` + `utils` |

`core` holds no store and no HTTP client because there is neither. It holds `SITE`, the locale and
navigation constants, the cookie registry, the SEO builders and the date/localization helpers. The
dependency direction the guidelines require — everything points at `core`, `core` points at nobody —
is unchanged and is enforced by `eslint-plugin-boundaries`. See
[`architecture-boundaries.md`](./architecture-boundaries.md).

### Golden rules with no subject

| Rule | Why it does not apply |
|---|---|
| 3 — PostgreSQL is the default database | There is no database. Nothing is stored, not even a contact message. |
| 6 — frontend and backend in separate repositories | There is one repository. |
| 8 — one response shape, one error shape | Nothing produces a response shape. The contact form's error codes are a closed union validated by Zod, translated through `messages/`; they never cross a network. |
| 9 — money as integers | No money. |
| 10 — UUIDs as primary identifiers | No rows. Content ids are human-readable kebab-case slugs, because they appear in URLs, anchors and test assertions. |

**Golden rule 2 deserves an honest answer rather than a dash.** It says backends are REST APIs,
never monoliths, with no server-rendered views. This project *is* a single Next.js application that
server-renders its views — at build time, into static HTML. The rule exists to stop a presentation
layer being welded to a data layer; here there is no data layer to weld it to. The only server-side
write path is one Server Action that validates a form and hands it to Resend. If this site ever
grows something worth storing, the rule applies again and the answer is a separate REST service, not
a route handler with a database client in it.

---

## 2. Server Components by default, not `"use client"` pages

`frontend.md` says that in the reference project **every page is `"use client"`**, and then
authorises the divergence in the same paragraph: *"a project that prefers RSC data-fetching may
diverge here; the rest of the conventions transfer regardless."* This project diverges. The copy is
resolved at build time; shipping React to the browser to paint an `<h2>` is waste.

**Everything is a Server Component except a closed catalogue of islands.** Thirteen source files
carry the directive by decision:

| File | Why it needs the browser |
|---|---|
| `components/motion/MotionIsland.tsx` | `LazyMotion` + `MotionConfig` are React context |
| `components/motion/Reveal.tsx` | registers with the shared `IntersectionObserver` |
| `components/motion/Stagger.tsx` | the same, for a group |
| `components/motion/CountUp.tsx` | `requestAnimationFrame` |
| `components/common/CopyButton.tsx` | `navigator.clipboard` and a "copied" state |
| `components/theme/ThemeToggle.tsx` | writes the cookie, mutates `classList`, runs the sweep |
| `domains/contact/components/ContactForm.tsx` | `useActionState` and live validation |
| `domains/experience/components/TimelineProgress.tsx` | `useScroll` + `useSpring` |
| `app/[locale]/_components/LocaleSwitcher.tsx` | `usePathname` |
| `app/[locale]/_components/MobileNav.tsx` | the Base UI `Sheet` |
| `app/[locale]/_components/SectionNav.tsx` | `useScrollSpy` |
| `app/[locale]/_components/ScrollSentinel.tsx` | the header's `IntersectionObserver` |
| `app/[locale]/error.tsx` | Next requires it: an error boundary is a class component |

**Four more carry it because shadcn ships them that way**, and they are the honest addition to the
count: `components/ui/field.tsx`, `label.tsx`, `separator.tsx` and `sheet.tsx`. They wrap Base UI
primitives that use context and refs. They were not written here and the directive was not removed,
because removing it would mean forking the primitive. **Seventeen source modules carry
`"use client"`**; that is the number to check against, and `grep -rl '"use client"' src/` returns
more than that only because test files and comments mention the string.

**Hooks do not carry the directive here.** The guidelines say hooks are "`use*` camelCase, always
`"use client"`". `src/hooks/usePassed.ts` and `useScrollSpy.ts` have no directive: a hook inherits it
from the component that imports it, and a directive of its own would let a Server Component import
it without failing. This is stricter than the guideline, not looser.

---

## 3. `next-themes` is not installed

`tech-stack.md` lists `next-themes` and `frontend.md` specifies `attribute="class"`,
`enableSystem`. The brief for this site required the theme to persist in a **cookie**, and
`next-themes` persists to `localStorage` only — there is no adapter, and its stored value is invisible
to the server.

What exists instead: `src/lib/theme.ts` (the cookie name, the serializer and `THEME_INIT_SCRIPT`,
an inline pre-paint script), `src/components/theme/ThemeToggle.tsx` (an island that writes the
cookie and toggles `.dark`), and `domains/core/config/cookies.ts` (`COOKIE_REGISTRY`, which imports
the name from `theme.ts` so the cookie policy page cannot drift from the code).

**The cost is real and accepted.** Three things `next-themes` would have given for free are now
this project's problem: the pre-paint script, the hydration-safe toggle, and system-preference
tracking. The last one is not implemented at all — the site is **light by default**, dark is opt-in,
and `prefers-color-scheme` is deliberately not consulted. The gain is that the cookie is declarable
in a cookie table that matches what the browser actually stores, which is what
[`security-and-cookies.md`](./security-and-cookies.md) is about.

---

## 4. Fonts are self-hosted, not loaded through `next/font/google`

`frontend.md` says "fonts via `next/font/google` as CSS variables". This project uses
`next/font/local` against a committed WOFF2 subset (`src/lib/fonts.ts`). The Google loader reaches
the network on **every** build — CI, Vercel and local — and then self-hosts the result anyway, so all
it adds is an external point of failure in the build.

The price is paid in maintenance: the `.woff2` is versioned in the repository and has to be
regenerated by hand when the family is bumped. The procedure is `scripts/prepare-fonts.md` and the
traps are in [`gotchas.md`](./gotchas.md).

---

## 5. `output: "standalone"` is conditional

The guidelines make it unconditional, for a minimal Docker image. Here it is
`process.env.DOCKER_BUILD === "1" ? "standalone" : undefined`.

Vercel is the primary target and a standalone build is the wrong artefact for it: Vercel builds its
own serverless output and the extra tracing is dead work. The Dockerfile sets `DOCKER_BUILD=1`, so
the Docker path gets exactly the image the guidelines describe. One flag, two correct outputs.

---

## 6. Routing goes through a proxy, and there are no guard components

`frontend.md` specifies **guards as wrapper components, not middleware** — `AuthGuard`,
`RequireTenant`, `RequireSuperAdmin`. None of them exist: there is nothing to guard.

What does exist is `src/proxy.ts` — the file Next 16 renamed from `middleware.ts` — holding
next-intl's locale routing. It serves `/` and `/es`, redirects `/en` to `/`, and 404s unknown
prefixes. It is routing, not authorization, and it is the only way to get `localePrefix: "as-needed"`
without making every page dynamic.

`loading.tsx` / `error.tsx` route files: the guidelines say they are not used and that loading and
error states live in the component. Half of that holds. `app/[locale]/error.tsx` **is** used, because
a statically prerendered page has no in-component place to put a render failure. There is no
`loading.tsx` anywhere, and there is no `<ErrorAlert>` / `<ErrorBoundary key={pathname}>` chrome,
because nothing on the page can fail at runtime.

---

## 7. The folder layout differs in three places

| Guidelines | Here | Why |
|---|---|---|
| `src/components/layout/` — app chrome | `src/app/[locale]/_components/` | The chrome is locale-scoped and used by exactly one layout. A private route folder says that; `components/layout/` would imply reuse that does not exist. |
| `src/components/ui/` + generics | `ui/` `common/` `motion/` `theme/` | `ui/` stays what the guidelines say it is: shadcn primitives, nothing else. The project's own generics live next to it, split by what they do. |
| Hooks inside their domain | `src/hooks/` | `usePassed` and `useScrollSpy` belong to no domain: the header and the timeline both use them. Putting them in a domain would mean a sibling import, which `boundaries` forbids. |

`src/lib/` matches the guidelines' intent — app-wide helpers below every domain — and holds `cn()`,
the fonts, the theme cookie, the motion layer and the sRGB palette mirror.

---

## 8. Stricter than the guidelines ask

These are deviations upward. They are listed because a future project may want to copy them back.

- **Four extra `tsconfig.json` flags** beyond the three `code-style.md` names: `noUncheckedIndexedAccess`,
  `noImplicitOverride`, `allowJs: false` and `moduleDetection: "force"`. The first is the one with
  teeth — `array[i]` is `T | undefined` everywhere, tests and scripts included.
- **`eslint-plugin-boundaries`** enforces the dependency laws that the guidelines state as prose.
  `default: "disallow"`: an import that no policy names is an error.
- **A type-discipline block over `src/`, `scripts/` and `tests/` alike**: `no-explicit-any`,
  **`no-non-null-assertion`**, `ban-ts-comment` and `consistent-type-imports`. The guidelines forbid
  `any`; forbidding `any` while leaving `!` open is half a rule, and `noUncheckedIndexedAccess` is
  exactly the flag that pushes people towards `!`.
- **Two guard scripts that are not in the guidelines at all**: `check-style-rules.ts` (zero
  gradients, no colour literal outside `globals.css`) and `check-contrast.ts` (44 WCAG AA
  combinations over the resolved tokens). Both are steps of `npm run check`.
- **Exact version pins, no `^` and no `~`.** The guidelines say "latest stable major"; this project
  pins the resolved version and commits the lockfile, so `npm ci` reproduces a tree that was
  verified rather than a tree that satisfies a range.
- **Tests exist.** `checklist.md` marks testing as "(Recommended) — the reference frontend has
  none". This project runs 623 Vitest assertions in the gate and has Playwright configured.

---

## 9. Three `@stylistic` rules from `code-style.md` are not in the config

`code-style.md` prints a full `eslint.config.mjs` and this project's is that file plus its own
blocks — with three differences, all forced by the plugin version:

| Rule | Status |
|---|---|
| `@stylistic/jsx-indent` | Removed in `@stylistic/eslint-plugin` 5. `@stylistic/indent` covers JSX. |
| `@stylistic/jsx-props-no-multi-spaces` | Removed in 5, folded into `@stylistic/no-multi-spaces`. |
| `@stylistic/wrap-regex` | Present, and it is why regexes are extracted to module constants instead of written inline as `/re/.test(x)`. |

One rule was **added**: `@stylistic/computed-property-spacing: [ "error", "always" ]`, for symmetry
with `array-bracket-spacing: always`, which the guidelines do set. Everything else — double quotes,
2-space indent, space before the definition parenthesis, the JSX block — is the guidelines' config
unchanged.

---

## 10. DevOps: Vercel first, Docker as the fallback

`devops.md` describes one deployment model: Docker Compose on a shared host, with the backend owning
Traefik and the shared network. **There is no backend to own anything**, so that model has no root.

| Guideline | Here |
|---|---|
| Traefik service, labels, Let's Encrypt resolver | Absent. Vercel terminates TLS and routes. |
| A shared external Docker network | Absent. Nothing to attach to. |
| `deploy.sh` with `wait_healthy`, `persist_tag`, `PREV_TAG` | Absent. Vercel deploys from `main`; the Docker path is three commands and a dated `IMAGE_TAG`, documented in `documentation/deployment/docker.md`. |
| One Compose file per environment (`staging`, `local`, `dev`, `local-test`) | One `docker-compose.yml`, which is production. |
| Four `.env.example.<env>` templates + `local-test` | **Two**: `.env.example.local` and `.env.example.production`. |
| `node:22-alpine` | `node:24-alpine`. `.nvmrc` says `24` and `engines.node` says `>=22.18.0`, so a 22 LTS machine is not blocked. |
| Split durable/cache Redis, `pg-backup` sidecar | No subject. |

**On the two environments.** Golden rule 7 separates environments by file, and that is honoured; what
is missing is `staging` and `dev`. `dev` in the guidelines means "infra in Docker, app on the host" —
here the infra is nothing, so `npm run dev` *is* that environment. `staging` would be a second paid
deployment of a portfolio; Vercel preview deployments cover the same need, per branch, for free. If a
staging host ever appears, adding `.env.example.staging` and a second Compose file is the whole
change.

**What is kept in full**: a multi-stage Dockerfile with a non-root runner, `HEALTHCHECK` against
`/api/health`, public config baked at build time and secrets injected at runtime, `${VAR:?}`
fail-fast interpolation for the critical variables, a lean `.dockerignore`, and real `.env*` files
git-ignored with `!.env.example.*` re-allowed. Golden rule 4 — dockerizable from day one, up with one
command — holds.

> **Not verified here.** `Dockerfile` and `docker-compose.yml` were written on a machine with no
> Docker installed. Neither has ever been built. The CI `docker` job is what will first execute them.

---

## 11. The `documentation/` folder

The guidelines' README lists five subfolders. Two were dropped and one is a problem.

- **`documentation/api/` and `documentation/postman/` do not exist.** They are integration guides and
  request collections for API consumers. There is no API and there are no consumers.
- **`documentation/conventions/` is listed in `.gitignore`.** The guidelines call it "the most
  valuable folder: it records the rules you can't infer from the code" — and right now **the seven
  files in it, this one included, are not under version control**. The line is `/documentation/conventions`
  at the bottom of `.gitignore`. Nothing in the project depends on that exclusion; it needs a
  decision from the owner, and until it is made, this documentation exists only on one machine.
- `documentation/deployment/` and `documentation/plans/` are present and match.

---

## 12. What the test suite deliberately does not cover

The guidelines recommend "Vitest + Testing Library and/or Playwright". Testing Library is **not**
installed, and that is a decision, not an omission:

- **No `jsdom`, no `@testing-library/*`, no `@vitejs/plugin-react`.** Vitest runs in the `node`
  environment over pure functions, content invariants and source text. Asserting that a presentation
  component renders the JSX it was written with tests nothing.
- **No coverage threshold and no `@vitest/coverage-v8`.** On a content site the percentage measures
  how much JSX was rendered, not how much risk was covered.
- **No visual regression snapshots.** A portfolio changes appearance on purpose; snapshots would be
  red every iteration and approved blind.
- **Anything with a DOM belongs to Playwright**, which is configured (`playwright.config.ts`, two
  projects, desktop and mobile) but whose specs are deferred by the owner — `tests/e2e/` is empty
  today. Until they are written, several claims in these documents are manual checks, and the ones
  that matter are marked as such in [`gotchas.md`](./gotchas.md).

---

## Things that look like deviations and are not

| Looks like a departure | It is not |
|---|---|
| **Prettier is absent** | `code-style.md` is explicit: *"Do not add Prettier on top — the two would fight."* Formatting is ESLint with `@stylistic`, exactly as prescribed. What was removed was the Prettier that `shadcn init` installs. |
| **No `tailwind.config.js`** | Required. Tailwind v4, CSS-first, tokens in `@theme inline` inside `globals.css`. |
| **No React Query and no SWR** | Required. The guidelines forbid both; here there is nothing to fetch in the first place. |
| **`cn()` is hand-written in `src/lib/utils.ts`** | Required: `twMerge(clsx(inputs))`. The `cn` **package** that the shadcn CLI adds — with a `^` range, and an `import { cn } from "cn"` in every primitive — is banned by a `no-restricted-imports` rule. |
| **`components.json` uses `base-nova` / `neutral` / `cssVariables` / `lucide` / `rsc: true`** | The guidelines' exact values. |
| **Dependencies are pinned without ranges** | Stricter, not different. See §8. |
| **Port 3200 instead of 3000** | The guidelines name no port. 3200 is declared once, in the `dev` and `start` scripts, and everything else — the container, Playwright, Lighthouse — reads it from there. |
| **Design tokens are `oklch` with semantic names** | Required, and extended: see [`theming-and-brand-color.md`](./theming-and-brand-color.md). |
| **Secrets only in git-ignored `.env*` files** | Golden rule 11, honoured. No secret carries a `NEXT_PUBLIC_` prefix. |
| **TypeScript `strict`, App Router, `@/*` alias** | Golden rules 1 and 12, honoured. |

---

## The rule this file enforces

Two changes require an entry here before they are merged:

1. **A `"use client"` directive on a file that is not in the catalogue of §2.** The catalogue is the
   contract. Growing it is allowed; growing it silently is not.
2. **Anything else that contradicts a document in `~/projects/personal/guidelines/`.** If it is
   worth doing, it is worth one paragraph saying what it costs.

A deviation that is not written down is indistinguishable from a mistake six months later.
