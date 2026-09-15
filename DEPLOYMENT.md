# Deployment

The repository pushes to GitHub, **Vercel builds `main` and serves production**, and the
`Dockerfile` in this repository is the portability hatch: it is what a self-hosted deployment would
use. Both paths are documented; only one of them is live.

| | Vercel (recommended, live) | Docker (portability) |
|---|---|---|
| Guide | [`documentation/deployment/vercel.md`](documentation/deployment/vercel.md) | [`documentation/deployment/docker.md`](documentation/deployment/docker.md) |
| Trigger | merge to `main` | `docker compose up -d --build` |
| Build output | default | `output: "standalone"` via `DOCKER_BUILD=1` |
| TLS, CDN, previews | included | your reverse proxy's problem |

Local development is **not** in this file. That is `README.md`.

---

## 1. Before anything leaves the machine

```bash
npm run check      # typecheck, lint, style rules, contrast, tests. Exit 0 or stop.
npm run build      # the same build the platform will run
```

`npm run check` is the only list of quality checks in the project, and nothing runs it for you.

`npm run build` is a production build, so it needs `NEXT_PUBLIC_SITE_URL` and
`NEXT_PUBLIC_SITE_EMAIL` in `.env.local` even on a laptop. `npm run dev` needs neither.

---

## 2. Environment variables

Two questions decide what a deployment has to set:

1. **When is the value read** — at build time, where it is frozen into the output, or per request.
2. **Which contact path is this deployment running** — with the form off, four of these variables
   are not needed at all.

### 2.1 Public group: read at build time, compiled into the browser bundle

Every `NEXT_PUBLIC_*` value is substituted into the JavaScript during `next build`. It is **not**
read at run time, and nothing secret may ever carry this prefix.

| Variable | Required | Absent it | Malformed it |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | **yes** | the build throws `NEXT_PUBLIC_SITE_URL is required for a production build.` | throws `must be an absolute URL` with the value it refused |
| `NEXT_PUBLIC_SITE_EMAIL` | **yes** | the build throws `NEXT_PUBLIC_SITE_EMAIL is required for a production build.` | throws `must be an email address` with the value it refused |
| `NEXT_PUBLIC_SITE_GITHUB_URL` | no | falls back to the URL committed in `src/domains/core/config/site.ts`; nothing breaks | throws `must be an absolute URL` |
| `NEXT_PUBLIC_SITE_LINKEDIN_URL` | no | same fallback, same silence | throws `must be an absolute URL` |
| `NEXT_PUBLIC_USE_RESEND_EMAIL_FORM` | no | **`false`: the contact section renders no form** | there is no malformed value; anything but `true` is `false` |

Notes that are easy to get wrong:

- **The two required ones are required on every production build**, previews and the Docker image
  included. Outside a production build — `npm run dev` — all five fall back and the site runs with
  none of them set.
- **`NEXT_PUBLIC_USE_RESEND_EMAIL_FORM` accepts exactly one true value: the string `true`.** Unset,
  empty, `1`, `TRUE` and `true ` with a trailing space are all false. Silently false: no warning,
  no error, just a contact section with no form. Set it explicitly to `true` in any deployment that
  is meant to have one.
- **`NEXT_PUBLIC_SITE_EMAIL` reaches the browser.** It has to: with the form off, the contact
  section is a `mailto:` link, and a `mailto:` link is written in the page. The address is already
  rendered in plain text today, so this changes nothing about its exposure — but it is not hidden,
  and moving it into a variable does not hide it. It moves *where the value is configured*, so it
  can change without a code edit.
- The two URL variables and the email are **validated at build time**, not at run time. A typo
  fails the deploy instead of shipping a dead link.

### 2.2 Server group: read per request, never in the bundle

| Variable | Required | Absent it |
|---|---|---|
| `RESEND_API_KEY` | **only when the form is on** | the mailer logs the message to stdout and the form still reports success |
| `CONTACT_FROM_EMAIL` | **only when the form is on** | the send throws `Missing environment variable: CONTACT_FROM_EMAIL` |
| `CONTACT_TO_EMAIL` | **only when the form is on** | the send throws `Missing environment variable: CONTACT_TO_EMAIL` |
| `RATE_LIMIT_SALT` | **only when the form is on** | every submission dies before the send |
| `TRUST_PROXY` | no | `clientIp()` does not trust `x-forwarded-for`; every visitor shares one rate-limit bucket |
| `SITE_INDEXABLE` | Docker only | off Vercel the site ships `noindex`; it is read at **build** time |

**With `NEXT_PUBLIC_USE_RESEND_EMAIL_FORM` off, the first four are not needed.** There is no form,
no Server Action submission, no mailer call and no rate limiter, so there is nothing to configure
and no secret to store. Leave them unset. This is the whole operational point of the switch: the
deployment stops depending on a third-party email provider and on a secret that has to be rotated.

Platform-injected, not yours to set: `VERCEL_ENV` (Vercel), `DOCKER_BUILD` and
`NEXT_TELEMETRY_DISABLED` (the `Dockerfile`). `IMAGE_TAG` and `WEB_PORT` are Compose
interpolation only.

### 2.3 The rule that catches everyone: `NEXT_PUBLIC_*` needs a rebuild

**Changing a `NEXT_PUBLIC_*` value and restarting changes nothing.** The old value is still
compiled into the JavaScript that was built with it, and into every prerendered page.

| Path | What a `NEXT_PUBLIC_*` change costs |
|---|---|
| Vercel | edit the panel, then Deployments → latest → **Redeploy** |
| Docker | edit `.env`, then `docker compose up -d --build` — `--build`, not `up -d` |

The server group is different, and only on Docker: those values are read on each request, so
`docker compose up -d` is enough. **On Vercel every change needs a redeploy**, server-only ones
included, because a deployment is bound to the values that existed when it was built.

`RATE_LIMIT_SALT` is generated once and reused:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Where they are set: the Vercel panel (see [`vercel.md`](documentation/deployment/vercel.md)) or
`./.env` on the Docker host (see [`docker.md`](documentation/deployment/docker.md)). Fill either
from `.env.example.production`.

### 2.4 Each path supplies the public group its own way

| Path | Where the five public values come from | Read during |
|---|---|---|
| Vercel | Settings → Environment Variables, filled in Production **and** Preview | `next build` on the platform |
| Docker | the `args:` block of `docker-compose.yml`, interpolated from `./.env` | `docker build` |

On Docker the two required ones are written `${NEXT_PUBLIC_SITE_URL:?…}` and
`${NEXT_PUBLIC_SITE_EMAIL:?…}`, so Compose stops and names the variable when either is missing,
before the build starts. `SITE_INDEXABLE` is a build argument on that path too: without it the image
ships `noindex`.

---

## 3. Which contact path is this deployment running

| | `NEXT_PUBLIC_USE_RESEND_EMAIL_FORM=true` | unset, or anything else |
|---|---|---|
| The contact section shows | the form: name, email, message | the email address as a link |
| A message travels through | the Server Action → rate limiter → Resend | the visitor's own mail client |
| Secrets to configure | `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_TO_EMAIL`, `RATE_LIMIT_SALT` | none |
| The site collects | a name, an email and a message, relayed and not stored | nothing |
| Bundle | carries the form's client JavaScript | does not |

**To switch, in either direction:** change the variable, then **rebuild** — redeploy on Vercel,
`docker compose up -d --build` on Docker. Then confirm on the deployed page, because this is a
build-time branch and a stale build is indistinguishable from a wrong value:

```bash
curl -s "$DOMAIN/" | grep -c '<form'          # 1 with the form on, 0 with it off
curl -s "$DOMAIN/" | grep -o 'mailto:[^"]*'   # the configured address
```

**Check the privacy page after switching.** The privacy notice describes a contact form that
collects a name, an email and a message and relays them through an email provider. With the form
off none of that happens, and the prose follows the same flag (`src/domains/legal/`). Read
`$DOMAIN/privacy` and `$DOMAIN/es/privacy` after the rebuild and confirm the text matches what the
site actually does. A privacy policy describing collection that does not happen is a false
statement, not a harmless leftover.

---

## 4. Releasing

1. Run `npm run check` and `npm run build`, then open a pull request. Vercel publishes a preview
   deployment with its own URL.
2. Review on the preview URL. It is `noindex` because `VERCEL_ENV` is `preview`.
3. Merge to `main`. Vercel builds and promotes it to production automatically.
4. Run the post-deploy checks below. They take under a minute.

```bash
DOMAIN=https://matteoleccese.com    # whatever NEXT_PUBLIC_SITE_URL this deployment was built with

curl -fsS  "$DOMAIN/api/health"                                  # {"status":"ok"}
curl -sI   "$DOMAIN/es" | head -1                                # 200
curl -sI   "$DOMAIN/"   | grep -icE "content-security-policy|strict-transport-security|x-frame-options|x-content-type-options"   # 4
curl -sI   "$DOMAIN/"   | grep -ci powered                       # 0
curl -s    "$DOMAIN/sitemap.xml" | head -5                       # XML that mentions /es
curl -s    "$DOMAIN/robots.txt"                                  # Allow: /, not Disallow: /
curl -sI   "$DOMAIN/cv/matteo-leccese-cv-en.pdf" | grep -i x-robots-tag   # noindex, noarchive
```

The last line only applies once the CV PDFs are generated and committed; until then that path is a
404 and the header check has nothing to read.

Then, **with the form on**, send one real message through the production contact form and confirm
it arrives at `CONTACT_TO_EMAIL`. Nothing else proves the mail path. **With the form off** there is
no mail path to prove: click the address on the page instead and confirm the mail client opens with
the right recipient.

---

## 5. Rollback

- **Vercel** — Deployments → the previous deployment → *Promote to Production*. Instant, and safe:
  there is no database schema to desynchronise.
- **Docker** — every deploy is tagged with a UTC timestamp, so the previous image is still on the
  host:

  ```bash
  docker image ls portfolio-v3
  IMAGE_TAG=20260910143000 docker compose up -d     # no --build
  ```

  This only works if the deploy command set `IMAGE_TAG`. With the `latest` default each build
  overwrites the only image there is and there is nothing to roll back to.

A rollback restores the public variables that were baked into that image or deployment, the contact
switch included. Rolling back past the commit that turned the form off brings the form back.

---

## 6. Domain, DNS and mail

1. Add the domain in Vercel → Settings → Domains and create the records the panel prints. Keep both
   the apex and `www`, with one of them redirecting to the other.
2. Set `NEXT_PUBLIC_SITE_URL` to the final origin, with no trailing slash, and **redeploy**. Until
   then the canonical URLs, the hreflang pairs, the sitemap and the Open Graph cards all point at
   the old origin.
3. Steps 4 and 5 apply **only with the form on**. With it off, Resend is not part of this
   deployment and there is nothing to verify beyond the address in `NEXT_PUBLIC_SITE_EMAIL` being
   an inbox that is actually read.
4. Verify the domain in **Resend** (SPF and DKIM records) before pointing `CONTACT_FROM_EMAIL` at
   `contact@<domain>`. Unverified, Resend only accepts `onboarding@resend.dev` as the sender and
   only delivers to the address the account was registered with.
5. Send a test message and confirm delivery, then check the message did not land in spam. A missing
   DMARC record is the usual reason it does.
6. **Last, and only once every host under the domain answers over HTTPS**, submit the domain to
   [hstspreload.org](https://hstspreload.org). The header already carries `preload`; the submission
   is irreversible in practice, so it comes after everything else works.

---

## 7. Runbook

### The contact section shows no form

**Symptom.** The deployed page offers the email address where the form used to be, and no error is
logged anywhere.

This is the switch, not a bug. `NEXT_PUBLIC_USE_RESEND_EMAIL_FORM` is not exactly `true` in the
build that produced this deployment. Two things produce it:

- the variable is unset, empty, or set to something like `1` or `TRUE`, all of which are false;
- the variable is right but the deployment was **restarted rather than rebuilt**, so the bundle is
  the old one. See §2.3.

```bash
# Vercel: Settings -> Environment Variables. Check the value, then redeploy.
# Docker: the value is in the image, not in the container.
docker compose exec web env | grep NEXT_PUBLIC_USE_RESEND_EMAIL_FORM   # says nothing useful
grep NEXT_PUBLIC_USE_RESEND_EMAIL_FORM .env                            # what the next build will use
docker compose up -d --build                                           # the only thing that changes it
```

The `env_file` value is not what the page renders: the page renders what the **build argument** was.
The two disagreeing is exactly what a missing `--build` looks like.

### The contact form does not send

**Symptom.** The form shows the generic failure, or it reports success and no mail arrives.

```bash
# Vercel: Project -> Logs, filter on "[contact]".
# Docker:
docker compose logs --since 30m web | grep '\[contact\]'
```

| Log line | Meaning | Fix |
|---|---|---|
| `[contact] DRY RUN: RESEND_API_KEY is empty, the message was not delivered.` | the key is unset in this environment, and the visitor was told the message was sent | set `RESEND_API_KEY`, then redeploy (Vercel) or `docker compose up -d` |
| `[contact] send failed: Resend error: ...` | Resend rejected the request | read the reason it prints: an unverified sender domain and an exhausted quota are the two common ones |
| `[contact] send failed: Missing environment variable: CONTACT_TO_EMAIL` | a runtime variable is missing | set it in the same place, same reload rules |
| `[contact] unexpected failure: Missing environment variable: RATE_LIMIT_SALT` | the salt is unset, so every submission dies before the send | set it; the value only has to be stable, not shared with anything |
| nothing at all | the request never reached the action | check that the browser console shows no CSP `form-action` violation, and that the reverse proxy is not dropping `POST` |

An empty `RESEND_API_KEY` is **not** an error: the mailer logs the message to stdout and the form
reports success. That is deliberate for local runs and it is exactly what a forgotten production
variable looks like, which is why it is the first row of the table.

API keys are redacted before anything is thrown or logged, so a Resend error can be pasted into a
ticket as it stands.

### The email address or a social link is wrong

**Symptom.** The page, the JSON-LD `sameAs` or the legal prose shows an address or a URL that is
not the current one.

All three come from `NEXT_PUBLIC_SITE_EMAIL`, `NEXT_PUBLIC_SITE_GITHUB_URL` and
`NEXT_PUBLIC_SITE_LINKEDIN_URL`, and all three are build-time. A wrong value is either the variable
or a missing rebuild — the same two causes as the switch above. Unset is not an error for the two
URLs: they fall back to the values committed in `src/domains/core/config/site.ts`, so an old link
that survives a correct-looking `.env` usually means the variable name is misspelt and the fallback
is being used.

### A build fails on a value that looks fine

`site.ts` validates the three identity variables during the build and names both the variable and
the value it refused:

| Message | Cause |
|---|---|
| `NEXT_PUBLIC_SITE_URL is required for a production build.` | unset or empty on a production build, previews and the Docker image included |
| `NEXT_PUBLIC_SITE_EMAIL is required for a production build.` | the same, for the address |
| `… must be an absolute URL. Received: "example.com".` | a URL with no scheme; `https://` is not optional |
| `… must use http or https. Received: "…".` | a `mailto:` or other scheme in a URL variable |
| `… must be an email address. Received: "…".` | `NEXT_PUBLIC_SITE_EMAIL` is not an address — a stray `mailto:` prefix is the usual reason |

On the Docker path a build argument the `Dockerfile` does not declare is dropped with a warning
rather than an error, so a *required* variable that reaches the build this way fails as "required"
even though it was passed. See the last section of
[`documentation/deployment/docker.md`](documentation/deployment/docker.md).

### The site returns 404 on `/es`

**Symptom.** `/` answers, `/es` does not.

```bash
curl -sI "$DOMAIN/"    | head -1     # expect 200
curl -sI "$DOMAIN/es"  | head -1     # expect 200
curl -sI "$DOMAIN/en"  | head -1     # expect 307 to /
```

`/es` is served by the locale proxy (`src/proxy.ts`, compiled to `.next/server/middleware.js`). If
`/` works and `/es` 404s, the proxy is not running:

- **Docker** — confirm it is in the image:
  `docker exec portfolio_v3_web ls .next/server/middleware.js`. If it is missing, the image was
  built from an incomplete context; rebuild with `--no-cache`.
- **Behind a reverse proxy** — it must forward the original path and the original `Host`. A
  `location` block that rewrites the path, or a proxy that sends `Host: 127.0.0.1`, produces exactly
  this.
- **A 307 loop instead of a 404** means `NEXT_PUBLIC_SITE_URL` disagrees with the origin actually
  being served. Fix the variable and rebuild.

### The CSP blocks something

**Symptom.** The browser console prints `Refused to load ... because it violates the following
Content Security Policy directive`, and the page renders without that asset.

```bash
curl -sI "$DOMAIN/" | grep -i content-security-policy
```

The policy is assembled in `next.config.ts` and applies to every response. Two notes before
loosening anything:

- `'unsafe-eval'` and `ws:` exist **outside production only**. If something needs them in
  production, it is a development-only dependency that reached the production bundle. Remove it
  rather than widening the policy.
- The site is designed to contact nobody: `default-src 'self'`, `frame-src 'none'`,
  `object-src 'none'`. A new third-party script means a new directive source, a new entry in
  `documentation/conventions/security-and-cookies.md`, and a rebuild.

A broken Open Graph preview in a social validator is the one expected false alarm, and it comes from
`Cross-Origin-Resource-Policy: same-origin` rather than from the CSP. The fix is a `headers()` entry
for `/opengraph-image` with `Cross-Origin-Resource-Policy: cross-origin`.

---

## 8. What has not been verified here

The configuration above was written and reasoned about in a working copy; parts of it have never
been run anywhere.

- **The Docker path has never been built.** Docker is not installed on the machine where the
  `Dockerfile` and `docker-compose.yml` were written. The build arguments for the site identity and
  the contact switch are the newest and the least exercised part of it.

---

## Related documents

- [`documentation/deployment/vercel.md`](documentation/deployment/vercel.md) — project settings,
  variables, domain, previews, rollback.
- [`documentation/deployment/docker.md`](documentation/deployment/docker.md) — the image, the four
  commands, the reverse proxy, the known unknowns.
- `documentation/conventions/security-and-cookies.md` — the headers, the CSP and the cookie
  inventory. That folder is listed in `.gitignore`, so the file exists in a working copy but not in
  a fresh clone.
