# Running the site with Docker

**This is not the live path.** Production is Vercel — see [`vercel.md`](./vercel.md) for why. The
image exists so the project is portable. Everything below is the procedure for the day someone
self-hosts, and for reproducing a production-shaped build locally.

> **Nothing in this guide has been executed.** Docker is not installed on the machine where the
> `Dockerfile` and `docker-compose.yml` were written, and no image has ever been built from this
> working copy — the build arguments added for the site identity and the contact switch included.
> The reasoning behind each line is sound and every path was checked against the real build output,
> but the first real `docker build` is the first test. [The last section](#first-build-checklist) is
> the list of things to prove on that build, in order.

---

## What the image is

Three stages on `node:24-alpine`, of which only the third ships:

| Stage | Does | Ends up in the image |
|---|---|---|
| `dependencies` | `npm ci` against the committed lockfile, dev dependencies included | no |
| `builder` | `DOCKER_BUILD=1 next build`, which turns on `output: "standalone"` | no |
| `runner` | copies three directories, drops to the `node` user, serves | yes |

The runtime layer holds exactly three things: `public/` (the brand and skill icons, the logo, the
company marks, and the CV PDFs once they are generated), the traced standalone server with its own
pruned `node_modules`, and `.next/static`. Next's standalone output deliberately omits `public/` and
`.next/static`, so both are copied explicitly — a missing `public/` copy is the classic mistake here
and it does not fail the build, it just serves a site with no icons.

What is *not* in the image: the source tree, dev dependencies, tests, `documentation/`, any `.env`
file, and the `Dockerfile` itself. `.dockerignore` keeps them out of the build context entirely.

It runs as `node` (uid 1000), never root. Its `HEALTHCHECK` calls `/api/health` with Node's global
`fetch`, so no `curl` package is added to a production image just to make one HTTP request.

Both `PORT` and `HOSTNAME` are set explicitly, and neither is decoration. The generated `server.js`
reads `parseInt(process.env.PORT) || 3000`, so an unset `PORT` silently moves the site to 3000 and
the published port maps to nothing. `HOSTNAME` defaults to `0.0.0.0` in that same file, but an
orchestrator that injects its own `HOSTNAME` — Kubernetes sets it to the pod name — would make the
server bind to a name it cannot resolve, and the container would answer nothing from outside.

One build-time consequence worth knowing: `next build` serializes `next.config.ts` into `server.js`
and the header table into the build manifest. **The security headers the image sends are decided at
build time, not at run time**, and the branch that picks them is `NODE_ENV === "production"` — which
the builder stage pins. That is why the image sends the production CSP, with no `'unsafe-eval'` and
no `ws:`, and why `Strict-Transport-Security` is present.

The Next server installs its own `SIGINT` and `SIGTERM` handlers, so `docker stop` drains in-flight
requests instead of being ignored by a PID 1 that has no default handler. No `tini`, no
`dumb-init`, no `entrypoint.sh`: there is one role, and it is to serve.

---

## Requirements

- Docker Engine with the Compose v2 plugin (`docker compose`, not `docker-compose`).
- BuildKit, which is the default. The first line of the `Dockerfile` pins the Dockerfile frontend to
  `docker/dockerfile:1.7`, which BuildKit pulls once from Docker Hub — the only network dependency
  the build has beyond the npm registry.

---

## The four commands

```bash
# 1. Prepare the environment, once.
cp .env.example.production .env
$EDITOR .env          # NEXT_PUBLIC_SITE_URL and NEXT_PUBLIC_SITE_EMAIL are mandatory;
                      # SITE_INDEXABLE=1; then NEXT_PUBLIC_USE_RESEND_EMAIL_FORM and,
                      # only if it is "true", RESEND_API_KEY, CONTACT_FROM_EMAIL,
                      # CONTACT_TO_EMAIL and RATE_LIMIT_SALT

# 2. Build and start. One command. The dated tag is what makes step 4 possible.
IMAGE_TAG=$(date -u +%Y%m%d%H%M%S) docker compose up -d --build

# 3. Check.
docker inspect -f '{{.State.Health.Status}}' portfolio_v3_web     # healthy
curl -fsS http://127.0.0.1:3200/api/health                        # {"status":"ok"}
docker compose logs -f web

# 4. Roll back: list the tags and go back to the previous one, without rebuilding.
docker image ls portfolio-v3
IMAGE_TAG=20260910143000 docker compose up -d
```

`docker compose down` stops and removes it. There are no volumes and no database: nothing is lost.

**The dated `IMAGE_TAG` is not optional.** With the `latest` default every build overwrites the only
image on the host and step 4 has nowhere to go back to. The rollback command has no `--build` for
the same reason: it has to start an image that already exists, not compile the current source
again. Keep `.env` on the host — Compose resolves `${NEXT_PUBLIC_SITE_URL:?…}` while reading the
file even on a run that builds nothing.

Step 4 rolls the public configuration back too. The origin, the address, the two social URLs and the
contact switch all live inside the image being started, so an older tag serves the values that tag
was built with, whatever `.env` says now.

**Port 3200 is also the port `npm run dev` uses.** To run the container next to a dev server, move
the *host* side and leave the container alone: `WEB_PORT=3300 docker compose up -d`.

---

## Environment variables

Compose reads `./.env` **twice**, and the two readings are not the same thing:

- for `${...}` interpolation inside `docker-compose.yml` — that is where the five public values,
  `SITE_INDEXABLE`, `IMAGE_TAG` and `WEB_PORT` are consumed, and where the build arguments come
  from;
- as the service's `env_file`, which is what puts the runtime variables inside the container.

Interpolation never reads `env_file`, which is why the file is called `.env` and not
`.env.production`: with any other name, `docker compose up -d --build` aborts with
`NEXT_PUBLIC_SITE_URL is required` and the "one command" claim is a lie. The side effect is that
`IMAGE_TAG` and `WEB_PORT` are also injected into the container, where nothing reads them.

### Build arguments — compiled into the image, changed only by a rebuild

| Build argument | Required | Absent it falls back to | What that costs |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | **yes** | nothing | Compose refuses to start: `NEXT_PUBLIC_SITE_URL is required`. Passed to `docker build` by hand and left empty, the build throws in `readSiteUrl()` |
| `NEXT_PUBLIC_SITE_EMAIL` | **yes** | nothing | Compose refuses the same way; a bare `docker build` throws `NEXT_PUBLIC_SITE_EMAIL is required for a production build.` |
| `NEXT_PUBLIC_SITE_GITHUB_URL` | no | the URL committed in `src/domains/core/config/site.ts` | nothing breaks; the committed link is what the image serves |
| `NEXT_PUBLIC_SITE_LINKEDIN_URL` | no | the same, for LinkedIn | nothing breaks; the committed link is what the image serves |
| `NEXT_PUBLIC_USE_RESEND_EMAIL_FORM` | no | `false` | nothing breaks; the image serves a contact section with **no form** |
| `SITE_INDEXABLE` | Docker only | unset, which off Vercel means *not* indexable | the image ships `Disallow: /` and a site-wide `noindex`. Set it to `1` |

A malformed public value fails the build rather than producing an image: the two URL arguments throw
`must be an absolute URL. Received: "…"` and the email throws `must be an email address. Received:
"…"`, each naming the variable and the value it refused.

`NEXT_PUBLIC_USE_RESEND_EMAIL_FORM` is true for exactly one value: the string `true`. `TRUE`, `1`,
`yes` and `true ` with a trailing space are all false, and none of them warns. A `.env` line written
as `NEXT_PUBLIC_USE_RESEND_EMAIL_FORM="true"` is fine — Compose strips the quotes — but a trailing
space after the value is not, and it produces an image with no form and no error anywhere.

`NEXT_PUBLIC_SITE_EMAIL` ends up in the client bundle, and it has to: with the form off the contact
section is a `mailto:` link, which lives in the HTML. The address is already rendered in plain text
on the page today, so this changes nothing about its exposure.

### Runtime variables — read per request, changed by a restart

| Variable | Required | Absent it | If you change it |
|---|---|---|---|
| `RESEND_API_KEY` | **only with the form on** | the mailer logs the message to stdout and the form still reports success | `docker compose up -d` |
| `CONTACT_FROM_EMAIL` | **only with the form on** | the send throws `Missing environment variable: CONTACT_FROM_EMAIL` | `docker compose up -d` |
| `CONTACT_TO_EMAIL` | **only with the form on** | the send throws `Missing environment variable: CONTACT_TO_EMAIL` | `docker compose up -d` |
| `RATE_LIMIT_SALT` | **only with the form on** | every submission dies before the send | `docker compose up -d` |
| `TRUST_PROXY` | no | `x-forwarded-for` is not trusted and every visitor shares one bucket | `docker compose up -d` |
| `IMAGE_TAG`, `WEB_PORT` | no | `latest` and `3200` | next command |

**With `NEXT_PUBLIC_USE_RESEND_EMAIL_FORM` off, the first four are not needed at all.** No form
means no Server Action submission, no mailer call and no rate limiter, so nothing reads them: leave
them out of `.env` and keep no Resend key on the host. `TRUST_PROXY` also stops mattering, since the
only thing that reads the client IP is the rate limiter.

**No secret is ever a build argument.** Build arguments are visible in `docker history`, and a
`NEXT_PUBLIC_*` value is compiled into JavaScript the browser downloads. The server variables arrive
through `env_file` and are read per request, so they exist in the container and never in a layer.

### The rule that catches everyone: a public value needs `--build`

`docker compose up -d` starts the image that exists. It does not compile anything, so it cannot
change a value that was compiled in. Editing `.env` and restarting leaves the old origin, the old
address and the old contact section exactly where they were.

```bash
docker compose up -d            # runtime variables only
docker compose up -d --build    # the only thing that changes a NEXT_PUBLIC_* value
```

The container's environment is not the answer either, and this is the confusing part:

```bash
docker compose exec web env | grep NEXT_PUBLIC_USE_RESEND_EMAIL_FORM   # the env_file value
```

That prints whatever `env_file` carries, which nothing reads. The page renders what the **build
argument** was. The two disagreeing is exactly what a missing `--build` looks like.

### Set `SITE_INDEXABLE=1` before you build, not after

Same mechanism, and the one that bites hardest because nothing about it is visible on the page.
`isIndexable()` decides what `robots.txt` says and whether every page carries
`<meta name="robots" content="index, follow">` — and all seven of those documents are
**prerendered during `next build`**. Off Vercel there is no `VERCEL_ENV`, so without
`SITE_INDEXABLE=1` *at build time* the image ships `Disallow: /` and a site-wide `noindex`. Putting
the variable in `.env` afterwards and restarting changes nothing at all: the answer is already baked
into `.next/server/app/robots.txt.body`.

`NEXT_PUBLIC_SITE_URL` is passed with no default for the same family of reasons: canonical URLs,
`hreflang` pairs, `sitemap.xml`, the JSON-LD graph and the Open Graph cards are frozen at build
time, and a build with an empty value must fail loudly in `readSiteUrl()` instead of quietly
producing an image that points somewhere else.

### Two smaller traps in `.env`

- **Avoid `$` inside a value.** Compose substitutes `${...}` when it reads the file for
  interpolation, and that reading and the `env_file` reading do not necessarily treat an escape the
  same way. The generated `RATE_LIMIT_SALT` is base64 and never contains one; a hand-written
  password can.
- **Quotes around a value are stripped by Compose's `env_file` parser**, so
  `CONTACT_FROM_EMAIL="Matteo Leccese <contact@example.com>"` arrives with its spaces and angle
  brackets intact and without the quotation marks.

Both are one command away from certainty, and it is worth running once after the first deploy. The
pattern deliberately leaves out the two secrets, so the output is safe to read over someone's
shoulder:

```bash
docker compose exec web env | grep -E '^(CONTACT_|SITE_INDEXABLE|NEXT_PUBLIC_)'
```

---

## Which contact path this image is serving

The answer is in the image, not in `.env`, so ask the running site:

```bash
curl -s http://127.0.0.1:3200/ | grep -c '<form'          # 1 with the form on, 0 with it off
curl -s http://127.0.0.1:3200/ | grep -o 'mailto:[^"]*'   # the configured address
```

| | `NEXT_PUBLIC_USE_RESEND_EMAIL_FORM=true` | unset, or anything else |
|---|---|---|
| The contact section shows | the form: name, email, message | the email address as a link |
| A message travels through | the Server Action → rate limiter → Resend | the visitor's own mail client |
| `.env` has to carry | the four Resend variables | none of them |
| The site collects | a name, an email and a message, relayed and not stored | nothing |

**To switch, in either direction:** edit `.env`, then `docker compose up -d --build`. Then read
`/privacy` and `/es/privacy`: the privacy notice describes a contact form that collects a name, an
email and a message and relays them through an email provider, and with the form off none of that
happens. The full switching procedure, including that check, is §3 of
[`../../DEPLOYMENT.md`](../../DEPLOYMENT.md).

---

## Putting it behind a reverse proxy

The container publishes on `127.0.0.1:${WEB_PORT}` on purpose. It speaks plain HTTP and has no
business being reachable from the internet directly; on a public host, `0.0.0.0` would put the site
in the clear on port 3200. TLS termination, HTTP/2 and compression belong to a proxy in front —
nginx, Caddy or Traefik.

Two requirements on whatever sits in front:

1. **Forward the original path and the original `Host`.** The locale proxy resolves `/`, `/es` and
   the 307 from `/en` from the request path; a rewrite or a `Host: 127.0.0.1` produces 404s on `/es`
   that look like an application bug.
2. **If you set `TRUST_PROXY=1`, the proxy must *replace* `X-Forwarded-For`, not append to it.**
   The rate limiter takes the **first** entry of that header. A proxy that appends leaves a
   client-supplied value in first position and hands anyone a way around the limit. In nginx that is
   `proxy_set_header X-Forwarded-For $remote_addr;` — **not** `$proxy_add_x_forwarded_for`. Left
   unset, `TRUST_PROXY` makes every visitor share one `"unknown"` bucket: degraded, but not a hole.

There are no Traefik labels and no external network in `docker-compose.yml`. The house rule that
asks for them is conditioned on several projects sharing one server, and this is one service that
owns nothing. The day it shares a host, the file grows the labels and the `external: true` network.

---

## First build checklist

In order. Each one catches a failure that does not announce itself.

```bash
# 0. The build. Omitting NEXT_PUBLIC_SITE_URL or NEXT_PUBLIC_SITE_EMAIL must fail loudly in
#    site.ts, not produce an image pointing at localhost or carrying the committed address.
docker build --build-arg NEXT_PUBLIC_SITE_URL=https://example.com \
             --build-arg NEXT_PUBLIC_SITE_EMAIL=owner@example.com \
             --build-arg NEXT_PUBLIC_USE_RESEND_EMAIL_FORM=true \
             --build-arg SITE_INDEXABLE=1 -t portfolio-v3:check .

# 1. public/ made it in. Missing icons look like a design problem, not an error.
docker run --rm portfolio-v3:check ls public/logo/ml-logo.png public/icons

# 2. The locale proxy made it in.
docker run --rm portfolio-v3:check ls .next/server/middleware.js

# 3. No .env file rode along in the build context.
docker run --rm portfolio-v3:check sh -c 'ls -a .env* 2>/dev/null || echo "no .env in the image"'

# 4. Full ICU: Spanish month names and the fixed time zone must resolve, or the Spanish
#    pages render English months and nothing warns you.
docker run --rm portfolio-v3:check node -p \
  "new Intl.DateTimeFormat('es', { month: 'long', timeZone: 'America/Caracas' }).format(new Date('2026-06-15T12:00:00Z'))"   # junio

# 5. It boots and answers. Container port stays 3200; host port avoids the dev server.
docker run -d --name pv3 -p 127.0.0.1:3300:3200 portfolio-v3:check
curl -fsS http://127.0.0.1:3300/api/health                       # {"status":"ok"}

# 6. The health check reaches "healthy" on its own (it needs ~15s of start period).
docker inspect -f '{{.State.Health.Status}}' pv3

# 7. Security headers survive the standalone server, not just `next start`.
curl -sI http://127.0.0.1:3300/ | grep -icE "content-security-policy|x-frame-options|x-content-type-options"   # 3

# 8. Both locales, and the redirect.
curl -sI http://127.0.0.1:3300/    | head -1                     # 200
curl -sI http://127.0.0.1:3300/es  | head -1                     # 200
curl -sI http://127.0.0.1:3300/en  | head -1                     # 307

# 9. robots.txt says what step 0 asked for.
curl -s http://127.0.0.1:3300/robots.txt                         # Allow: /

# 9b. The contact path and the address are the ones step 0 asked for. A build argument the
#     Dockerfile does not declare is dropped with a warning, and the page carries the
#     committed fallback instead — which this is the check for.
curl -s http://127.0.0.1:3300/ | grep -c '<form'                 # 1, because step 0 said true
curl -s http://127.0.0.1:3300/ | grep -o 'owner@example.com'     # the address step 0 passed

# 10. Image optimization: sharp has to resolve its musl binary inside Alpine.
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' \
  'http://127.0.0.1:3300/_next/image?url=%2Fcompanies%2Fbitnat-logo.png&w=128&q=75'   # 200 image/*

docker rm -f pv3
```

`Strict-Transport-Security` is left out of step 7's pattern on purpose. The image **does** send it:
the header set was frozen at build time, with `NODE_ENV=production`. But a browser ignores HSTS
delivered over plain HTTP, so loopback is not where that header is worth checking. It gets verified
against the real HTTPS origin, in [`../../DEPLOYMENT.md`](../../DEPLOYMENT.md).

Step 10 is the one with the least certainty behind it. `sharp` resolves a platform-specific binary,
the lockfile does carry the `linuxmusl` variants, and the production server traces `sharp` into the
standalone output — but that chain was verified by reading the build manifests, never by running it
on Alpine. If it fails, the three company logos are the only images affected.

---

## What has not been verified here

- **No `docker build` was run.** Every command above was written against the `Dockerfile`,
  `docker-compose.yml` and the real `next build` output, and executed nowhere.
- **A build argument the `Dockerfile` does not declare is silently dropped.** BuildKit prints
  `[Warning] One or more build-args were not consumed` and continues, and the image is built with
  the fallbacks instead. If step 0 fails with `NEXT_PUBLIC_SITE_EMAIL is required for a production
  build.`, or if step 9b shows the committed address instead of the one that was passed, that is
  the cause: each public value needs an `ARG` and a matching `ENV` in the `builder` stage, the way
  `NEXT_PUBLIC_SITE_URL` has them. Check that before suspecting Compose.
