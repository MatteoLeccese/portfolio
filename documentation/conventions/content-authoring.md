# How content is written

> The site has **two text stores** and the border between them is mechanical, not a matter of taste:
> `messages/{en,es}.json` is **how the interface speaks**; `src/domains/<d>/content/*.ts` is **what
> the CV says**. And no fact is written twice: the years of experience, the current role, the number
> of companies and the footer year are **computed**, never typed.

This document is the procedure for adding or editing content without breaking anything.

## 1. The border: where each string goes

**One-sentence test.** If the string has a sibling of the same shape in the other language
describing **the same item** (same date, same order, same icon, same link), it is **content** and
lives in `content/` as `LocalizedText` / `LocalizedList`. If it is a label the interface pronounces
and can be rewritten without changing a single CV fact, it is **copy** and lives in `messages/`.

| | `messages/{en,es}.json` | `src/domains/<d>/content/*.ts` |
|---|---|---|
| What it is | Interface chrome and copy | Biographical record |
| Typing | `AppConfig.Messages` (`src/global.d.ts`) | Explicit interfaces + `Record<Locale, …>` |
| Missing translation | **Parity test failure** (`src/i18n/messages.test.ts`) | **Compile error** (`tsc`) |
| Who may edit it | A translator | Only the owner: it changes facts |

Real examples from each side, taken from the code as it stands:

| Text | Where it lives | Why |
|---|---|---|
| `"Experience"` / `"Experiencia"` | `messages` → `Experience.title` | Section label. |
| `"Full Stack Developer"` (role at Flusso) | `experience/content/experience.ts` → `role` | It has siblings, an order and a date. |
| `"Feb 2026 – Present"` | **neither**: it comes from `formatPeriod(startDate, endDate, …)` | Hand-written text drifts; two `YearMonth` do not. |
| `"Present"` / `"Presente"` | `messages` → `Common.present`, **passed as a parameter** to `formatPeriod` | An interface word needed by a pure function: it is injected, not duplicated. |
| The Bitnat position bullets | `experience/content/experience.ts` → `highlights` | Structured, parallel EN/ES list. |
| `"React"`, `"Laravel"`, `"NestJS"` | `skills/content/skills.ts`, **untranslated** | Proper nouns. |
| `"Frontend"` (skills category title) | `messages` → `Skills.categoryFrontend` | A label; in the model the category is only the id `"frontend"`. |
| `"Ingeniería en Informática"` | `education/content/education.ts` → `degree` | Domain entity (and it is translated: it is a description, not a brand). |
| `"Universidad Rafael Belloso Chacín"` | `education/content/education.ts`, **untranslated** | Proper noun. |
| `"Zulia, Venezuela"` as site identity | `core/config/site.ts` → `SITE.location` | Identity datum: neither label nor entity. |
| `"{years} years of experience"` | `messages` → `About.factExperience` | The sentence is interface; the number is **derived**. |
| The Projects empty-state paragraphs | `messages` → `Projects.empty*` | Interface copy: it describes no project. |
| The prose of `/privacy` and `/cookies` | `legal/content/*.ts` | A document with sections, ids and order. |

**The doubtful case, settled in two questions.** (1) Would this text exist if the CV changed owner?
If yes, it is interface. (2) Does it have an id, an order, a date, an icon or a link attached to it?
If yes, it is content. When the two answers clash, the second wins: an `aria-label` stuffed into a
data file is the real v2 bug, where the `aria-label`s stayed frozen in English and a Spanish screen
reader read them wrong.

### Identity lives in `SITE`

`src/domains/core/config/site.ts` holds the non-translatable identity. Three rules it carries:

- **There is deliberately no `SITE.jobTitle`.** The current role is derived from the experience model
  by `getJobTitle()`, and every surface that names the role (`Meta.title`, `Hero.currentRole`,
  `About.paragraphOne`, `About.factRole`, `OpenGraph.role`, the JSON-LD and the CV PDF) receives it
  through the `{role}` placeholder from that one reader. `experience[0].role` is the only place the
  title is written by hand, plus `FALLBACK_JOB_TITLE` for the between-jobs case. A literal
  `jobTitle` duplicates a derived fact across seven surfaces, and one copy will go stale.
- **`SITE.linkedin` is stored in its long form** (`/in/matteo-l-65a95b207/`) because that is the form
  known to resolve; the short vanity form has not been confirmed to work. "Tidying" it can produce a
  dead link on every page that renders the social links, and on the CV PDF.
- **`SITE.phone` must never reach a web surface.** It is rendered only into the CV PDF.
  `profile/content/socials.ts` omits it on purpose — that omission looks like an oversight and
  invites someone to "complete" the list — and `getJobTitle.test.ts` asserts the serialized socials
  contain neither the formatted number nor its bare digits, and that no `href` starts with `tel:`.

There is also deliberately **no `Profile` interface**: the bio is `cvProfile: LocalizedText` in
`profile/content/profile.ts` and the rest of the identity lives in `SITE`. A one-field interface
nobody constructs is below this project's abstraction threshold. The absence looks like an omission
in a domain that otherwise has a `types/` file per entity — it is not.

### `localize()` needs no null guard

`noUncheckedIndexedAccess` does **not** widen `LocalizedText[locale]` to `string | undefined`:
`Locale` is a finite union, so the mapped type `Record<Locale, string>` produces concrete
properties. A content literal that forgets a language is a compile error where the content is
written, never an `undefined` in the browser. Do not add a `?? ""` fallback — it turns a
compile-time guarantee into a silent empty string.

## 2. The rule for clock-derived facts

The v2 site says **"4+ years"** while the CV says **5**. It was not an oversight: the fact was
hand-written into two keys of `messages/en.json` and into **none** of `es.json`, so the two versions
did not even tell the same story. This model exists to eliminate that class of defect.

**The computation lives in one place:** `yearsOfExperienceAt(start, now)` in
`src/domains/core/utils/period.ts`, reading `SITE.careerStart` (`"2021-10"`, in
`core/config/site.ts`) — the **only** source of the datum.

```ts
export function yearsOfExperienceAt (start: YearMonth, now: Date): number {
  return Math.max(1, Math.round(monthsBetween(parseYearMonth(start), now) / 12));
}
```

`Math.round` and not `Math.floor` is deliberate: on 2026-09-14 that is 59 months, and `floor` would
give 4 and contradict the CV. The accepted consequence — the site claims the next year six months
early, because 2027-04-01 rounds 5.5 up to 6 — is pinned by tests, and so is the `Math.max(1, …)`
floor that keeps the copy from ever reading "0 years" on day one of a career. This reads like an
off-by-one and invites a "fix" to `Math.floor`, which would make the site contradict the CV on the
same day.

**The placeholder.** Copy carries `{years}` and the number enters as an ICU placeholder at render
time:

```jsonc
// messages/en.json
"About": { "factExperience": "{years} years of experience" }
```

```tsx
const years = yearsOfExperienceAt(SITE.careerStart, new Date());
t("factExperience", { years });
```

In `profile/content/profile.ts` — which does not go through next-intl, because the PDF generator
consumes it too — the placeholder is resolved by hand:
`localize(cvProfile, locale).replaceAll("{years}", String(years))`.

The five keys carrying `{years}` today are `About.factExperience`, `About.paragraphOne`,
`Experience.subtitle`, `Hero.summary` and `Meta.description`. **Writing a number into any of them is
exactly the bug being killed.**

| Fact | Where it comes from | Where it appears |
|---|---|---|
| Years of experience | `yearsOfExperienceAt(SITE.careerStart, new Date())` | `Hero.summary`, `About.paragraphOne`, `About.factExperience`, `Experience.subtitle`, `Meta.description`, CV PDF |
| Duration of the ongoing position | `durationOf(startDate, null, new Date())` | `LocalizedExperience.durationLabel`, under each card's date range |
| Current role | `getJobTitle(getCurrentPosition(experience), locale)` | `Meta.title`, `Hero.currentRole`, `About.paragraphOne`, `About.factRole`, JSON-LD, PDF |
| Number of companies | `experience.length` | `Experience.subtitle` (`{companies}`) |
| Copyright year | `new Date().getFullYear()` | `Footer.rights` |

**No clock-derived fact is valid beyond `revalidate`.** The site is static: a computation nobody
re-runs is the same bug with extra steps. That is why the home page declares
`export const revalidate = 86_400` — daily regeneration costs nothing because there is no dynamic
data.

**Purity corollary.** No function in `core/utils/period.ts` reads the ambient clock: `now` arrives
as a parameter. The only legitimate `new Date()` is at the composition root — the page — and in the
default argument of `getExperienceTimeline(locale, presentLabel, now = new Date())`. A function that
called `new Date()` internally would fail no test: the suite would quietly become
non-deterministic and the static render irreproducible, breaking months later on someone else's
machine. `period.test.ts` guards this with fake timers moved decades away, because "simplifying" a
signature by dropping `now` is an invisible regression — the tests keep passing on the day of the
change.

`formatDuration` is built from `Intl.NumberFormat` units plus `Intl.ListFormat` rather than
`Intl.DurationFormat`, which is absent from Node 22, the runtime floor this project supports. The
plural forms and the conjunction are locale data, not message-catalogue copy: rewriting with
`Intl.DurationFormat` works locally on a newer Node and breaks on the floor, and moving the plurals
into the catalogue reintroduces copy that `Intl` already knows.

## 3. Adding a job

One file: `src/domains/experience/content/experience.ts`. One more `ExperienceEntry`, **first in the
array** if it is the most recent (array order is page order).

```ts
{
  id: "nueva-empresa",                       // kebab-case, unique: React key, anchor and logo name
  company: "Nueva Empresa",                  // proper noun, untranslated
  companyUrl: null,                          // or an absolute https URL
  logo: null,                                // or "/companies/nueva-empresa.png" (kebab-case, PNG)
  role: { en: "…", es: "…" },
  startDate: "2026-02",                      // YearMonth, zero-padded month
  endDate: null,                             // null IS "ongoing". There is no isCurrent boolean.
  summary: { en: "…", es: "…" },
  highlights: { en: [ … ], es: [ … ] },      // SAME number of bullets in both languages
  stack: [ "NestJS", "Laravel" ],            // proper nouns, untranslated
}
```

What is **never** written into that prose: a year, a range dash (`–`), the word "Present"/"Presente"
and any "N years". All four are derived, and there is a test for each.

**Ongoing is `endDate === null`, derived by the query; there is no `isCurrent` field.** A boolean
would be a second source of truth that can disagree with `endDate`. At most one entry may be null,
and that entry must also be the newest (first) one, because the job title is read from it. So if the
new position is ongoing, **remove `endDate: null` from the previous one** and give it its end month:
`getCurrentPosition()` returns the first entry it finds without an end date, and the site owner's
role changes from there on its own.

`logo: null` on the Flusso Dynamics Group entry is not a missing file: permission to republish the
employer's brand asset has not been confirmed. `CompanyLogo` falls back to the typographic initials
tile. Do not "complete" it by committing the logo.

If `CV_BULLETS` in `experience.test.ts` stops matching, update that object in the same change: it is
counted by hand against the CV on purpose, so a lost bullet fails with the diff printed.

## 4. Adding a skill

Two files, in this order:

1. **`src/domains/skills/content/icons.ts`** — add the [Simple Icons](https://simpleicons.org) slug
   to `SIMPLE_ICON_SLUGS` (or to `MANUAL_ICON_SLUGS` if Simple Icons does not carry it and the SVG
   is committed by hand under `public/icons/`). The slug is the library's, not an invented name:
   `nextdotjs`, `nodedotjs`, `reacthookform`.
2. **`src/domains/skills/content/skills.ts`** — add `{ name: "…", icon: "…" }` to the right
   category. `name` is the proper noun as the vendor writes it; never translated.
3. **`npm run icons:skills`** to generate `public/icons/icon-<slug>.svg`.

Two skills may share an icon: `React Native` uses React's atom and `Slim` uses PHP's elephant. That
is correct and accounted for.

`Skill.icon` is typed `IconSlug` and not `string` for one reason: a CSS mask over a missing SVG file
renders nothing **and raises no error**. The union type is what turns "the icon does not exist" into
a compile error, so widening the field — or casting one value — removes the only detection mechanism
for a missing glyph.

`linkedin` is in `MANUAL_ICON_SLUGS` because Simple Icons removed it upstream after a brand-removal
request. Its SVG is committed by hand and the generator asserts the file exists instead of writing
it, so `rm -rf public/icons && npm run icons:skills` cannot silently drop it. **Do not move it back
into `SIMPLE_ICON_SLUGS`** assuming the manual list is legacy: the generator would fail, or the
glyph would vanish.

**Adding a category** costs one more key: `Skills.category<Id>` in **both** catalogues, with the id
in camelCase (`data` → `categoryData`). There is a test in each direction: a category with no title
fails, and a title with no category consuming it fails too.

**Provenance rule:** a skill gets in if the CV backs it or if it was already published on the v2
site. Nothing else. `GitHub` was the single addition, justified because the site already links the
profile and already ships the glyph. Without the rule written down, the skills grid drifts into
unverifiable claims on a CV-backed portfolio.

## 5. Adding a project

`projects.ts` is **prepared and empty on purpose**, and the section renders its empty state. The two
v2 projects (`github-commit-tracker`, `react-fetch-news`) and their PNGs were deliberately not
migrated — the empty array is a decision, not unfinished work.

**Step 1 — The image.** WebP, **1600 × 900** (16:9), **≤ 200 KB** (above 300 KB, recompress), at
`public/projects/<slug>.webp` with the slug **identical** to the project's. A screenshot of the real
application, with real data, in light theme.

**Step 2 — The entry.** One file: `src/domains/projects/content/projects.ts`.

```ts
export const projects: readonly Project[] = [
  {
    slug: "json-to-csv-next",
    name: "json-to-csv",                    // proper noun, untranslated
    year: 2026,
    status: "live",                         // "live" | "archived" | "wip" — metadata, not printed
    summary: { en: "…", es: "…" },
    role: { en: "…", es: "…" },             // optional: only if it was not solo work
    tech: [ "Next.js", "TypeScript" ],      // proper nouns, six or fewer
    cover: {
      src: "/projects/json-to-csv-next.webp",
      width: 1600, height: 900,             // mandatory: they are what prevents layout shift
      alt: { en: "…", es: "…" },            // describes the screenshot, not the project
    },
    links: { live: "https://…" },           // `{}` is valid
    featured: true,                         // featured first, in array order
  },
];
```

Required fields: `slug`, `name`, `year`, `status`, `summary`, `tech`, `cover` (or `null`), `links`
and `featured`. `role` is optional.

`status` has **no consumer today**: the card never prints it and it orders nothing (ordering is array
order plus `featured`). It is declared ahead of need, with `"archived"` reserved for the first
project whose demo no longer exists. A required field with no reader looks like dead code and will
be deleted, forcing a model migration when the first archived project arrives.

**Step 3 — `npm run check`.**

**Step 4 — Nothing else.** The menu entry, the replacement of the empty state and the grid happen on
their own: the Projects section appears in the navigation as soon as `projects.length > 0`. **No
component is touched when adding a project.** If one has to be, the model is wrong and the model is
what gets fixed.

> The content test that validates that `cover.src` exists in `public/`, that its dimensions match
> the file and that the weight stays under 300 KB **is written with the first project**: there is no
> `projects.test.ts` today because there is not one entry to validate. It is the first item of step 3
> on that day.

## 6. Legal content and the cookie policy

The legal pages are a document, so their prose lives in `legal/content/*.ts` — but two facts inside
it are not prose:

- **Legal prose must never contain the literal domain or the owner's e-mail.** The content files
  carry `{domain}` and `{ownerEmail}`, resolved at render time by `resolveSitePlaceholders()`;
  `legal.test.ts` fails if a literal comes back. A baked-in domain or address goes stale on a domain
  change and cannot be updated in one place. The same rule is stated in
  `src/domains/legal/types/index.ts`.
- **The cookie policy is a legal document, so it must be exact in both directions.** Over-declaring
  a cookie the site never sets is as wrong as omitting one it does set. In
  `core/config/cookies.ts`, the `NEXT_LOCALE` entry stays commented out until `localeCookie` is
  enabled in `src/i18n/routing.ts`: until then the cookie does not exist. Conversely,
  `localeCookie: false` in `routing.ts` is mandatory and must not be removed without updating the
  `/cookies` page and re-running `tests/e2e/cookies.spec.ts` — next-intl writes `NEXT_LOCALE` even
  when `localeDetection` is off, because `syncCookie()` only reads `routing.localeCookie`.

## 7. What tests fire if you get it wrong

`npm run check` runs all of this. The messages are written to be read on their own; this is what they
mean.

| Test | Fires when | What it is saying |
|---|---|---|
| `experience.test.ts` → *"has the same number of highlights in every locale"* | Three bullets in English and two in Spanish | `Record<Locale, string[]>` compiles either way: the Spanish card would come out shorter and `tsc` would say nothing. |
| `experience.test.ts` → *"keeps the four positions and the bullet counts the CV states"* | A position disappears, changes id or loses a bullet | `CV_BULLETS` is counted by hand against the CV. If the change is real, update the object. |
| `experience.test.ts` → *"writes no date, no period and no present label into the prose"* | A year, a `–` or "Present" inside a `summary` or a bullet | Someone hand-wrote something `formatPeriod` derives. |
| `experience.test.ts` → *"never writes the years of experience by hand"* | `/\d+\s*\+?\s*(years?\|años?)/` in the prose | The "4+ years" bug trying to come back. |
| `experience.test.ts` → *"is ordered newest first" / "has at most one ongoing position"* | Two `endDate: null`, or an unordered array | Array order **is** page order, and `getCurrentPosition()` takes the first entry without an end. |
| `getJobTitle.test.ts` → *"writes no number at all, so the '4+ years' bug cannot come back"* | A digit in `cvProfile` | The PDF paragraph carries `{years}`, not a number. |
| `getJobTitle.test.ts` → *"never publishes the phone number"* | `SITE.phone` appears in `socials` | The phone goes into the PDF only, never onto the web. |
| `period.test.ts` → *"matches the CV at the pinned date" / "rounds up at the half-year"* | Someone "simplifies" `Math.round` into `Math.floor` | The two pinned edges are `2026-09-10 → 5` and `2027-04-01 → 6`. |
| `skills.test.ts` → *"only references icons the generator knows about"* | An `icon` not in `icons.ts` | A CSS mask over a non-existent file paints nothing **and raises no error**: hence the typed slug. |
| `skills.test.ts` → *"has a heading in both catalogs…" / "…without a consumer"* | A category with no title, or a title with no category | A dead key is how a renamed category ends up printing its own id. |
| `messages.test.ts` → *"has no key missing in Spanish" / "no extra key"* | You edited `en.json` and not `es.json` | Both catalogues hold exactly the same key set (138 leaves today). |
| `messages.test.ts` → *"uses the same ICU placeholders in both languages"* | You put `{years}` only in English | This is the exact v2 failure mode. |
| `messages.test.ts` → *"only calls keys that exist in the catalogue"* | `t("Foo.bar")` with no `Foo.bar` in `en.json` | next-intl would print the key in production. |
| `messages.test.ts` → *"keeps every namespace alphabetically sorted"* | You appended the key at the end of the block | Sort alphabetically within the namespace. |
| `tsc` (`npm run typecheck`) | A missing `es` in a `LocalizedText`, or `startDate: "2026-2"` | A missing translation in `content/` never reaches production: it does not compile. |

Three things these tests deliberately do **not** cover:

- **`experience.test.ts` checks the logo path SHAPE only.** Nothing anywhere asserts the PNG actually
  exists under `public/companies/`. Adding `existsSync()` there produces a red test this suite
  cannot fix, so do not read the assertion as proof the file is present.
- **The orphan-key test in `messages.test.ts` is skipped and must not be re-enabled early**, nor
  "fixed" by moving keys into `DYNAMIC_KEYS`. The catalogue is complete but its consumers (home
  sections, header, footer, contact form, CV template) are not, so almost every one of the 138 keys
  would be reported as an orphan and the only way to keep the suite green would be to delete copy
  that is already final. `DYNAMIC_KEYS` is for keys the static scanner **cannot see**, not for keys
  whose consumer has not been written yet.
- **The `?? ""` fallbacks and `undefined` guards in the regex helpers of `messages.test.ts` exist
  only to satisfy `noUncheckedIndexedAccess`.** A mandatory capture group always matches, so they
  never change what the checks report: "simplifying" them away breaks the typecheck, and assuming
  they hide a real case sends you chasing a branch that cannot happen.

And two things that are **not** tests but fail all the same:

- **`npm run lint`** rejects an `import` of `react`, `react-dom`, `next/*`, `motion` or `server-only`
  inside `content/`, `queries/`, `types/`, `core/config/` and `core/utils/`. Those layers are pure
  data. (`server-only` also kills Vitest: it resolves through the `default` condition, which is a
  `throw`.)
- **`npm run lint`** rejects `hooks/`, `services/` or `actions/` importing `content/`. Those layers
  receive data as props from the server. The reasoning is in
  [`architecture-boundaries.md`](./architecture-boundaries.md).
