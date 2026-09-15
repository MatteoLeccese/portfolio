# Deploying on Vercel

**This is the live path.** Production is a Vercel project connected to `main`; every pull request
gets a preview deployment. The Docker image in this repository is a portability hatch — see
[`docker.md`](./docker.md) — not the thing serving the site.

Why this one, stated plainly: the site is six prerendered pages, a locale proxy and a single Server
Action. Vercel gives it a global CDN, TLS with automatic renewal, per-pull-request previews and a
one-click rollback, at zero cost on the hobby plan. Self-hosting the same thing means maintaining by
hand the only piece that adds value — the edge cache — and buying operational work a portfolio never
pays back. The honest cost of the choice is vendor lock-in on exactly two behaviours: the build
pipeline and `x-vercel-forwarded-for`. Both have a documented replacement on the Docker path.

---

## Project settings

| Setting | Value | Note |
|---|---|---|
| Framework preset | Next.js | detected |
| Root directory | `.` | — |
| Install command | `npm ci` | **not** `npm install`: the committed lockfile is what freezes the stack |
| Build command | `npm run build` | the script in `package.json` |
| Output directory | default | leave it alone; this is not a static export |
| Node.js version | **24.x** | set it explicitly |
| `DOCKER_BUILD` | **undefined** | defining it would switch the build to `output: "standalone"` |

**Set the Node version in the panel, not through `engines`.** `package.json` declares
`"node": ">=22.18.0"`, which is a floor chosen so a Node 22 laptop is not blocked. It is not a pin,
and letting the platform resolve it means the production runtime can move under you. `.nvmrc` and
the Docker image both say 24.

Vercel runs `next build` and nothing else. It does **not** run `npm run check`, and it does not
regenerate the brand icons, the skill icons or the CV PDFs — those are committed artefacts. The
quality gate is `npm run check`, run by hand before pushing.

---

## Environment variables

Settings → Environment Variables. Fill them from `.env.example.production`, and set them in
**Production and Preview both**.

Nothing here is hardcoded anywhere: the same five public values are build arguments on the Docker
path.

### Public group — compiled into the browser bundle during `next build`

| Variable | Required | Absent it falls back to | What that costs |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | **yes** | nothing | the build throws `NEXT_PUBLIC_SITE_URL is required for a production build.` |
| `NEXT_PUBLIC_SITE_EMAIL` | **yes** | nothing | the build throws `NEXT_PUBLIC_SITE_EMAIL is required for a production build.` |
| `NEXT_PUBLIC_SITE_GITHUB_URL` | no | the URL committed in `src/domains/core/config/site.ts` | nothing breaks; the committed link is what ships |
| `NEXT_PUBLIC_SITE_LINKEDIN_URL` | no | the same, for LinkedIn | nothing breaks; the committed link is what ships |
| `NEXT_PUBLIC_USE_RESEND_EMAIL_FORM` | no | `false` | nothing breaks; the contact section renders **no form** |

Three things about this group that are easy to get wrong:

- **A malformed value fails the deployment instead of shipping.** The two URL variables throw
  `must be an absolute URL. Received: "…"`, and the email throws
  `must be an email address. Received: "…"`. This runs during `next build`, so a typo is a red
  deployment rather than a dead link in production.
- **`NEXT_PUBLIC_USE_RESEND_EMAIL_FORM` is true for exactly one value: the string `true`.** `TRUE`,
  `1`, `yes`, and `true ` with a trailing space are all false, and none of them warns — the
  deployment simply comes up without a form. The panel keeps trailing whitespace, so paste it
  carefully.
- **`NEXT_PUBLIC_SITE_EMAIL` reaches the browser, and it has to.** With the form off the contact
  section is a `mailto:` link, and a `mailto:` link lives in the HTML. The address is already
  rendered in plain text on the page today, so this changes nothing about its exposure — the
  variable moves *where the value is configured*, it does not hide it.

### Server group — read per request, never in the bundle

| Variable | Required | Production | Preview |
|---|---|---|---|
| `RESEND_API_KEY` | **only with the form on** | the Resend key | the same key, or empty |
| `CONTACT_FROM_EMAIL` | **only with the form on** | `Matteo Leccese <contact@…>` | same |
| `CONTACT_TO_EMAIL` | **only with the form on** | the destination inbox | same |
| `RATE_LIMIT_SALT` | **only with the form on** | 32 random bytes, base64 | same |
| `TRUST_PROXY` | no | **unset** | unset |
| `SITE_INDEXABLE` | no | **unset** | unset |
| `DOCKER_BUILD` | — | **unset** | unset |

**With `NEXT_PUBLIC_USE_RESEND_EMAIL_FORM` off, the first four are not needed at all.** There is no
form, so there is no Server Action submission, no mailer call and no rate limiter: nothing reads
them. Leave all four undefined and store no Resend key for this project. Turning the form on is what
makes them required, and `CONTACT_FROM_EMAIL`, `CONTACT_TO_EMAIL` and `RATE_LIMIT_SALT` each throw
`Missing environment variable: …` on the first submission when they are missing.

Three that are deliberately left alone whichever contact path is running:

- **`TRUST_PROXY` stays unset.** `clientIp()` reads `x-vercel-forwarded-for` first, and that header
  is written by the platform and cannot be forged by the client. Turning `TRUST_PROXY` on would make
  the action fall back to a client-controlled `x-forwarded-for` and hand anyone a way around the
  rate limit.
- **`SITE_INDEXABLE` stays unset.** `isIndexable()` already answers correctly from `VERCEL_ENV`:
  production is indexable, previews are not. Setting it to `1` would publish indexable previews.
- **`DOCKER_BUILD` stays unset.** It is the switch for `output: "standalone"`, which is for
  self-hosting and has known rough edges on Vercel.

### Three traps worth knowing before the first deploy

**A `NEXT_PUBLIC_*` change needs a rebuild, not a restart.** The value is substituted into the
JavaScript during the build and frozen into every prerendered page; the running deployment has no
way to read a new one. Edit the panel, then Deployments → the latest → *Redeploy*. This is the most
common surprise with the contact switch: the panel says `true`, the site shows no form, and both are
telling the truth about different builds.

**Every variable change needs a redeploy — server-only ones included.** A Vercel deployment is bound
to the values that existed when it was built, so editing the panel does not reach a deployment that
is already live. Same fix, same button. The difference from the public group is only *why*: the
public ones are compiled in, the server ones are bound to the deployment.

**`NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_SITE_EMAIL` must be set in Preview as well, or preview
builds fail.** `site.ts` throws `… is required for a production build.` when either is missing and
`NODE_ENV` is `production` — and a preview build is a production build. For `NEXT_PUBLIC_SITE_URL`
the `VERCEL_URL` / `VERCEL_PROJECT_PRODUCTION_URL` fallback was removed on purpose: neither carries
a public prefix, so both are `undefined` in the browser, and `SITE.url` would say one thing on the
server and another on the client.

A preview URL is per-deployment, so the Preview value cannot be exact. Point it at the project's
stable preview alias, or simply at the production origin, and accept that a preview page carries
canonical and Open Graph URLs belonging to another origin. Nothing is misfiled: previews ship
`noindex` and are never crawled.

---

## Which contact path this project is running

Read the variable in the panel, then confirm against the deployed page — the panel describes the
next build, the page describes the one that is live:

```bash
curl -s "https://<domain>/" | grep -c '<form'          # 1 with the form on, 0 with it off
curl -s "https://<domain>/" | grep -o 'mailto:[^"]*'   # the configured address
```

| | `NEXT_PUBLIC_USE_RESEND_EMAIL_FORM=true` | unset, or anything else |
|---|---|---|
| The contact section shows | the form: name, email, message | the email address as a link |
| A message travels through | the Server Action → rate limiter → Resend | the visitor's own mail client |
| Variables to set | the four server ones above | none of them |
| The site collects | a name, an email and a message, relayed and not stored | nothing |

**To switch, in either direction:** change the variable in **both** Production and Preview, then
redeploy. Then read `/privacy` and `/es/privacy`: the privacy notice describes a contact form that
collects a name, an email and a message and relays them through an email provider, and with the form
off none of that happens. The full switching procedure, including that check, is §3 of
[`../../DEPLOYMENT.md`](../../DEPLOYMENT.md).

---

## Releasing and rolling back

The release flow is in [`../../DEPLOYMENT.md`](../../DEPLOYMENT.md) and is three steps long: pull
request, review the preview, merge to `main`. Vercel builds and promotes on merge.

**Rollback** is Deployments → the last known-good deployment → *Promote to Production*. It is
instant and it is safe: there is no database and no schema, so nothing can be left half-migrated.
The frontend always has a safe rollback, which is the reason no `deploy.sh` and no blue/green dance
exists in this repository.

One caveat: a rollback restores the code and the build of that deployment, including every
`NEXT_PUBLIC_*` value baked into it — the origin, the email, the two social URLs and the contact
switch. If the incident was a bad public variable, rolling back to a deployment built with the good
value is the fix. If it was a bad *server* variable, the rollback alone changes nothing: correct the
value and redeploy. And a rollback moves the contact path too, so a promotion that reaches back past
the build where the switch changed brings the other contact section back, privacy prose included.

---

## Domain, DNS and Resend

1. **Domain.** Settings → Domains, add the apex and `www`, and create the records the panel prints
   (usually an `A` record for the apex and a `CNAME` for `www`). Pick one as canonical and let the
   other redirect.
2. **Certificates** are issued and renewed by Vercel. Nothing to do.
3. **`NEXT_PUBLIC_SITE_URL`** then becomes the final origin, with no trailing slash — and the site
   has to be **redeployed**, because canonical URLs, `hreflang` pairs, `sitemap.xml`, `robots.txt`,
   the JSON-LD graph and the Open Graph cards are all frozen at build time.
4. **Resend — only with the form on.** With `NEXT_PUBLIC_USE_RESEND_EMAIL_FORM` off, skip this
   step entirely: Resend is not part of the deployment, and the only address that matters is
   `NEXT_PUBLIC_SITE_EMAIL`, which has to be an inbox that is actually read. With the form on, add
   the same domain in the Resend dashboard and publish the SPF and DKIM records it gives you. Until
   the domain verifies, Resend only accepts `onboarding@resend.dev` as a sender and only delivers to
   the address the account was registered with — which is why `CONTACT_FROM_EMAIL` cannot point at
   `contact@<domain>` before this step. Add a DMARC record too if the mail lands in spam.
5. **HSTS preload, last.** The `Strict-Transport-Security` header already carries `preload` in
   production. Submitting the domain to hstspreload.org is the irreversible-in-practice step, so it
   happens only after every host under the domain is confirmed to answer over HTTPS.

---

## What this path does not give you

- **The rate limiter does not add up across instances.** It is a `Map` in one process. Serverless
  means several warm instances and cold starts that wipe it, so the real ceiling is three messages
  per hour per identifier *per warm instance*. Accepted for v1; the written trigger for moving to a
  shared store is more than five spam messages in a week. With the form off this limitation does not
  apply, because there is no endpoint to limit.
- **No staging environment.** Preview deployments are the substitute: ephemeral, per pull request
  and `noindex`. There is no long-lived environment between `main` and production.
- **No analytics, and no Vercel Analytics either.** The site stores nothing about a visitor beyond
  the theme cookie. Turning on an analytics product changes what the privacy policy has to say.

---

## What has not been verified here

- The environment variables above were never applied to a real Vercel project from this working
  copy. The behaviours they describe were read out of `src/domains/core/config/site.ts` and the
  build, not observed in the panel.
