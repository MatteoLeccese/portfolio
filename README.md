# portfolio

Personal portfolio of Matteo Leccese: a statically rendered, bilingual (English / Spanish) Next.js 16
site whose only dynamic path is a single Server Action for the contact form.

> The folder on this machine is `portfolio-v3` purely so it does not collide with the previous
> portfolio checkout. **The project is called `portfolio`** everywhere else: `package.json`, the
> Docker image, the docs.

## The five hard rules

Read these before writing a line. Three of the five are enforced by a machine; all five are
non-negotiable.

1. **Zero gradients.** No `linear-gradient`, `radial-gradient` or `conic-gradient`, no
   `bg-gradient-*` / `from-*` / `via-*` / `to-*` utility, no `<linearGradient>` inside an SVG.
   `npm run check:style` fails on any of them, across `src/**/*.{css,svg,ts,tsx}`,
   `public/**/*.svg` and `messages/*.json`.
2. **Light theme by default.** Dark mode is opt-in and persisted in a cookie, never in
   `localStorage`. There is no system-preference flash to design around.
3. **English by default.** `en` is the default locale and carries no URL prefix; `es` lives under
   `/es`. Zero hand-written interface strings: every label, including every `aria-label`, comes from
   `messages/`.
4. **Mobile first.** Every style starts at the narrowest viewport and grows with `sm:` / `md:` /
   `lg:`. No `max-*` breakpoints walking backwards.
5. **TypeScript strict, and no `any`.** Not an explicit one, not a suppressed one.

## Stack

Every version is exact — no `^`, no `~`, because `npm ci` freezing a verified tree is the point.

| | |
|---|---|
| Framework | `next` 16.3.4, `react` / `react-dom` 19.3.0 |
| Language | `typescript` 6.0.3 — pinned, **not** 7.x: `typescript-eslint` rejects it by peer and `eslint .` dies |
| Styling | `tailwindcss` 4.3.3, CSS-first — there is **no** `tailwind.config.js` — plus `tw-animate-css` |
| Components | `shadcn` 4.21.0 (a runtime dependency) on `@base-ui/react` 1.8.0. No Radix, so **`asChild` does not exist** here: Base UI composes with `render={<Link />}` |
| i18n | `next-intl` 4.14.3 |
| Motion | `motion` 13.2.0 |
| Forms / mail | `zod` 4.6.2, `resend` 6.27.0 |
| Lint / format | `eslint` 9.39.5 — pinned, **not** 10.x — with `eslint-config-next`, `@stylistic/eslint-plugin` 5.10.0 and `eslint-plugin-boundaries` 7.2.0 |
| Tests | `vitest` 5.0.0 (pure functions, node environment) and `@playwright/test` 1.63.0 (everything with a DOM) |

The reason behind each pin, including the two expiry-dated ones, is section 4.2 of the plan.

## Requirements

- **Node >= 22.18.0** (that is what `engines.node` declares, so a 22 LTS machine is not blocked).
  **24 LTS is the recommended version** and the one that actually ships: `.nvmrc` says `24`, and CI
  and the Docker image use `node:24-alpine`. With nvm installed, `nvm use` picks it up.
- **npm 11.**
- **`npm ci` is the only installer.** `package-lock.json` is committed on purpose: it freezes the
  verified tree, and `npm install` is free to drift from it.

## Getting started

```bash
cp .env.example.local .env.local    # then fill it in; the comments inside say what each key does
npm ci
npx playwright install --with-deps chromium   # once, for the E2E suite
npm run dev
```

Then open **http://localhost:3200**.

**The port is 3200 everywhere** — `dev`, `start`, the container, Playwright and Lighthouse — and it
is written exactly once, inside the `dev` and `start` scripts. Never pass it a second time:
`npm run start -- --port 3112` expands to `next start --port 3200 --port 3112` and which one wins is
up to the argument parser. (3100 is taken by another project on this machine.)

**An empty `RESEND_API_KEY` is not an error.** The mailer logs the message to stdout instead of
sending it, which is what lets the contact E2E exercise the success path without real mail.

Deployment, rollback and the incident runbook are **not** here — they are in `DEPLOYMENT.md`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | `next dev` on port 3200 |
| `npm run build` | production build |
| `npm run start` | serves the production build on port 3200 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `eslint .`, unused disable directives reported, **zero warnings tolerated** |
| `npm run lint:fix` | the same with `--fix`; this is what applies the code style |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright |
| `npm run check:style` | the gradient and literal-colour guard |
| `npm run check:contrast` | the contrast guard over the palette |
| `npm run check` | **the gate — see below** |
| `npm run icons:skills` | regenerates `public/icons/*.svg` from `simple-icons` |
| `npm run icons:brand` | regenerates the favicon, apple-icon and PWA icons |
| `npm run cv` | regenerates the CV PDFs |

> ### `npm run check` is the gate. Run it before every commit.
>
> ```bash
> npm run check
> ```
>
> It chains `typecheck` → `lint` → `check:style` → `check:contrast` → `test`. CI runs exactly this
> command, so there is no second list of checks to keep in sync. Generated assets are **not**
> regenerated by the build: `icons:*` and `cv` are run by hand and their output is committed.

## After every `npx shadcn@4.21.0 add <component>`

Two steps, every single time. The shadcn CLI leaves behind work in both cases.

```bash
npx shadcn@4.21.0 add <component>

# 1. The generated code does not satisfy @stylistic (no space before the parameter
#    parenthesis, no spaces inside brackets). Reformat it:
npm run lint:fix

# 2. The CLI injects cssVars blocks into src/app/globals.css. Review and revert them:
git diff src/app/globals.css
```

Step 2 is the one that gets forgotten. `globals.css` owns the brand dial and the semantic tokens; a
`cssVars` block pasted in by the CLI silently overrides them. If you are not using git here, keep a
copy before the command and compare afterwards:

```bash
cp src/app/globals.css /tmp/globals.before.css
npx shadcn@4.21.0 add <component>
diff /tmp/globals.before.css src/app/globals.css
```

While you are there, check the other two things the CLI does: it adds `"cn": "^0.2.6"` to
`dependencies` — a caret, which this project does not allow — and writes `import { cn } from "cn"`
into every primitive. This project uses `clsx` + `tailwind-merge` through `@/lib/utils`, so remove
the package and rewrite the imports.

## There is no Prettier

Deliberately. **The `npm run format` you are looking for does not exist.** Code style is applied by
ESLint through `@stylistic/eslint-plugin` — double quotes, and the rest of the rules in
`eslint.config.mjs` — and `npm run lint:fix` is what formats a file. There is no `.prettierrc`, no
`.prettierignore`, and no `prettier` in `package.json`; `shadcn init` installs Prettier, and that was
undone on purpose. Two formatters would fight over the same file.

This is the habit change from the previous portfolio. If you add Prettier back, `npm run lint` starts
failing on files Prettier just "fixed".

## Content and documentation

Content is not edited in components. Interface strings live in `messages/`, domain facts live in
`src/domains/*/content`, and some facts are derived rather than written twice. The rules — what goes
where, how the CV PDF is regenerated, and the class and attribute table a layout component has to
emit — are in
[`documentation/conventions/content-authoring.md`](documentation/conventions/content-authoring.md).

The rest of `documentation/` covers the conventions that cannot be inferred by reading the code:
architecture boundaries, the no-gradients rule, security and cookies, theming and the brand colour,
and the deviations from the house guidelines. Deployment guides live in `documentation/deployment/`.

Adding a `"use client"` that is not in the catalogue requires a new entry in
`documentation/conventions/deviations-from-guidelines.md`. That file is where conscious debt is made
visible.
