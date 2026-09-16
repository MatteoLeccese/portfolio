# Security and cookies

The site has **one input surface** (the contact form) and **one third party** (Resend, the mail
provider). Everything below follows from that: there is no session, no database, no analytics and no
third-party script, so the security posture is cheap to hold — and the few places where it is not
cheap are marked as such.

Three files carry almost all of it: `next.config.ts` (headers), `src/lib/theme.ts` (the only cookie)
and `src/domains/contact/` (the only code that reads visitor input).

## The headers

They are declared once, in `headers()` of `next.config.ts`, with `source: "/:path*"`. That source
covers every response the app produces, including the 307s from the next-intl proxy and
`GET /api/health` — which the proxy matcher excludes on purpose, so `/api/health` is never rewritten
to `/en/api/health`. `poweredByHeader: false` removes `X-Powered-By` in the same file.

| Header | Value | What it buys |
|---|---|---|
| `Content-Security-Policy` | see below | Defence in depth against exfiltration and form hijacking. **Not** XSS mitigation — see the nonce trap. |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Production only. On localhost HSTS buys nothing and poisons the hostname for two years. |
| `X-Content-Type-Options` | `nosniff` | Stops type guessing on the CV PDF and the SVG icons. |
| `X-Frame-Options` + `frame-ancestors 'none'` | `DENY` / `'none'` | Deliberately redundant: `frame-ancestors` is the modern one, `X-Frame-Options` covers old agents and scanners. `frame-ancestors` only works as a header, never in a `<meta>`. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | The site links out to GitHub and LinkedIn; full paths stay home. |
| `Permissions-Policy` | 17 features set to `()` | Everything the site never uses is switched off. `browsing-topics=()` is in; `interest-cohort` is not — the token is dead and Chrome warns about it. |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolates the browsing context. Free: there is no `window.open` to a third party. |
| `Cross-Origin-Resource-Policy` | `same-origin` | The site publishes nothing for others to embed. The one thing it can break is an OG-card preview in a social validator. |
| `X-DNS-Prefetch-Control` | `off` | Consistent with "this site contacts nobody". |

The CSP is thirteen directives built from one `isProduction` flag:

```text
default-src 'self'                   img-src 'self' data: blob:
script-src  'self' 'unsafe-inline'   font-src 'self' data:
style-src   'self' 'unsafe-inline'   connect-src 'self'
form-action 'self'                   frame-ancestors 'none'      frame-src 'none'
base-uri 'self'                      object-src 'none'
manifest-src 'self'                  worker-src 'self' blob:
```

plus `upgrade-insecure-requests` in production, and **`'unsafe-eval'` on `script-src` and `ws:` on
`connect-src` outside production only**.

### Trap 1: those two dev-only concessions are not optional

`headers()` applies in `next dev` as well. The Turbopack runtime and React Refresh evaluate hot
modules, and HMR opens a WebSocket. Remove `'unsafe-eval'` or `ws:` and the dev server starts with
HMR silently blocked **by the site's own CSP** — the error lands in the browser console, not in the
terminal, so it reads as "hot reload is flaky today". Neither token is emitted in production, so
there is nothing to gain by trimming them.

### Trap 2: the inline head scripts carry no nonce, and must not

`src/app/[locale]/layout.tsx` injects two inline scripts with `dangerouslySetInnerHTML` —
`THEME_INIT_SCRIPT` before the first paint, then `MOTION_BOOT_SCRIPT` — and `src/app/not-found.tsx`
injects the theme one. Next injects its own inline scripts on every page (the
`self.__next_f.push([...])` RSC payload).

Under CSP3, **as soon as `script-src` contains a nonce or a hash, `'unsafe-inline'` is ignored**. Add
a nonce to the theme script and you do not harden anything: you invalidate `'unsafe-inline'` for
Next's own bootstrap scripts too, and the site stops booting. The same goes for hashing the theme
script — Turbopack's inline scripts have no stable hash to add alongside it.

A real nonce-based CSP means generating a nonce per request in the proxy and threading it through the
tree, which **forces dynamic rendering on every page** and ends static generation. The written
trigger to pay that price: the day any third-party script arrives (non-first-party analytics, a
captcha, a chat widget). Until then, what the CSP actually buys is `default-src`/`connect-src 'self'`
plus `object-src 'none'`, `base-uri 'self'` and `form-action 'self'` — no exfiltration to an external
host, no `<base>` hijack, and no re-pointing the contact form at another host.

### Server Action protections not to break

- **Origin/Host CSRF check.** Next rejects an action POST whose `Origin` does not match. Behind a
  proxy that rewrites `Host` you would need `experimental.serverActions.allowedOrigins`; it is
  deliberately absent, because adding it "just in case" relaxes the only CSRF defence there is.
- **`experimental.serverActions.bodySizeLimit: "64kb"`.** The form uploads nothing and the message
  caps at 2000 characters. The 1 MB default is twenty times more than needed.
- **Action ids are regenerated per build**, so there is no stable endpoint to fuzz.

## The cookie story

**One cookie: `theme`.** It is written in exactly one statement in the whole codebase —
`persistTheme()` inside `src/components/theme/ThemeToggle.tsx`, reachable only from the toggle's
`onClick`. `serializeThemeCookie()` in `src/lib/theme.ts` produces
`theme=<light|dark>; Path=/; Max-Age=31536000; SameSite=Lax`, plus `Secure` over https. It is **not**
`HttpOnly` on purpose: the pre-paint script reads it through `document.cookie` before React exists,
and `THEME_INIT_SCRIPT` reads it and never writes it.

Nothing else can set one. `routing.ts` sets `localeCookie: false`, which is what stops next-intl
writing `NEXT_LOCALE` — it writes that cookie even when `localeDetection` is off. The contact action
imports only the read-only `headers()` from `next/headers`, never `cookies()`.

That is the whole reason there is **no consent banner**: the single cookie is a preference cookie,
first-party, created only by an explicit user action. Nothing is set on a plain visit, so there is
nothing to ask about.

**The registry is `COOKIE_REGISTRY` in `src/domains/core/config/cookies.ts`** — one
`CookieDescriptor` per cookie, with localized provider, purpose, duration and type. It imports
`THEME_COOKIE_NAME` rather than spelling `"theme"` out, so the policy cannot drift from the code.

Adding a cookie without adding its row fails `npm run check`, via `src/app/document-shell.test.ts`:

- `COOKIE_REGISTRY.map(c => c.name)` must equal `[ THEME_COOKIE_NAME ]`;
- the registry must import the name and must not hardcode a `name: "…"` literal;
- walking every `.ts`/`.tsx` under `src/`, **exactly one file** may assign to `document.cookie`, and
  none may import `cookies()` from `next/headers`, call `cookies().set()` or write a `Set-Cookie`
  header by hand;
- the toggle must contain no `useEffect`/`useLayoutEffect`, and `persistTheme` and `handleToggle`
  must each appear exactly twice — one declaration, one call site. A third occurrence is a second
  way to write the cookie.

A published cookie policy that lists a cookie the browser never sets is as wrong as one that omits a
cookie it does. Both directions are covered.

## The contact form

**Validation happens twice, and the server trusts nothing the client did.** `contactSchema`
(`src/domains/contact/types/schema.ts`) is shared: `ContactForm` runs `contactSchema.shape[field]` on
blur and on change-after-error, and `submitContact` re-parses the whole payload with
`contactPayloadSchema`, which extends it with `hp_field` and `startedAt`. Every schema message is a
`Contact.errors` key (`email_invalid`, `message_too_short`…), never prose, so the same schema serves
both languages and next-intl renders the text.

### Three anti-abuse layers

| Layer | Stops | Does not stop |
|---|---|---|
| Honeypot `hp_field` | Bots that fill every `input[type=text]` | A bot that reads the CSS or the `aria-hidden` |
| Minimum fill time, `CONTACT_LIMITS.minFillMs` = 3 s | Headless scripts that fill and submit instantly | A submission with no mark, and an attacker who waits 3 s |
| Rate limit, 3 per hour per identifier | Repeat bursts from one trustworthy address | Distributed bursts, rotating IPs, self-hosting with no trusted proxy |

None of the three is a cryptographic defence and this document will not pretend otherwise.

**All three survive JavaScript being off**, which is the constraint that shaped them:

- The form is a real `<form>` with a real `action={formAction}`. It posts before hydration.
- `hp_field` is served empty and stays empty with no script involved. The `honeypot` utility
  (`globals.css`) moves it to `left: -9999px` rather than using the `sr-only` recipe — the trap must
  be off-window, not merely silent — and the `<form>` is `relative` so that offset is measured
  against the form. It sits **outside** the `<fieldset disabled>`, where disabling cannot drop it
  from the submission, and carries `tabIndex={-1}` and `autoComplete="new-password"` so an
  autofilling browser never fills it for a real visitor.
- `startedAt` is a hidden input whose served value is `"0"`; an effect overwrites it with
  `Date.now()` after mount. `z.coerce.number().int().nonnegative().catch(0)` turns a missing or
  tampered value into `0` as well, and the action only applies the timing check when
  `startedAt > 0`. **Zero is no timing evidence, and no evidence passes.** A no-JS visitor never gets
  `spam_rejected`.

The action's order is shape → honeypot → fill time → rate limit → send, so a filled trap costs no
mail, and `too_many_requests` never reaches the mailer.

### What leaves the machine, and what stays

Resend receives name, email, subject, message and the locale stamp, rendered by
`renderContactEmail()` as HTML and plain text with every visitor value passed through `escapeHtml()`;
the subject is prefixed `[portfolio] ` and collapsed to one line; `replyTo` is the visitor's address,
so replying from the inbox answers them directly. `hp_field` and `startedAt` are destructured away
before `sendContactEmail()` and never travel.

**Nothing is stored.** No database, no submission log, no form analytics. The message exists in the
HTTP request, in transit through Resend, and in the owner's inbox. The form sets no cookie.
`logFailure()` writes the provider's own message and never anything the visitor typed.

The one thing retained is the rate-limit bucket, and **it keys on a hashed address, never a raw
one**: `bucketKey()` is `SHA-256("<RATE_LIMIT_SALT>:<identifier>")`, hex, truncated to 32 characters.
It lives in a module-scope `Map` for at most one hour, and `consumeRateLimit()` runs **after** a
successful send — a failed send leaves the visitor his remaining attempts. That hash is what lets the
notice under the button — "Your message reaches me by email. Nothing is stored on this site." — be
literally true.

The identifier itself comes from `clientIp()`: `x-vercel-forwarded-for` first, then
`x-forwarded-for` **only** when `TRUST_PROXY === "1"`, then the shared `"unknown"` bucket. A Server
Action has no socket access, only `headers()`.

## Secrets

`NEXT_PUBLIC_*` is public and baked into the client bundle at build time. Everything else is
server-side and runtime-only. **No secret ever carries the prefix.**

| Variable | Scope | Required | Read by |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | public, build time | yes | `src/domains/core/config/site.ts` |
| `RESEND_API_KEY` | server, runtime | yes in production; empty means dry run | `services/mailer.ts` |
| `CONTACT_FROM_EMAIL` | server, runtime | yes | `services/mailer.ts` |
| `CONTACT_TO_EMAIL` | server, runtime | yes | `services/mailer.ts` |
| `RATE_LIMIT_SALT` | server, runtime | yes | `services/rate-limit.ts` |
| `TRUST_PROXY` | server, runtime | no | `actions/submitContact.ts` |
| `SITE_INDEXABLE` | server, runtime | no | `src/domains/core/config/site.ts` |

`mailer.ts` and `rate-limit.ts` both start with `import "server-only"`, so importing either from a
client component is a build error rather than a leak. Only `.env.example.local` and
`.env.example.production` are versioned; a filled-in `.env*` never is.

**There is no `env.ts` with a Zod validation of `process.env`.** Such a module cannot be imported
from anything evaluated at prerender time — on the Docker path the server variables only exist at
runtime — so its fail-fast would be fake exactly where it is sold. `requireEnv()` inside the mailer
and the explicit `throw` for a missing salt fail loudly at the right moment: the first send. The
price is that a misconfigured deploy shows up on the first message, not at boot, which is why the
deploy checklist sends one.

`redactApiKey()` splits the key out of any Resend message before it is thrown or logged, so a
provider error can never carry the credential into a log aggregator.

**Leak check for the build output.** `grep -r "re_" .next/static/` is useless — `re_` occurs in
minified code and the false positive gets the check ignored. Compare against the real value:

```bash
test -n "$RESEND_API_KEY" \
  && ! grep -rqF "$RESEND_API_KEY" .next/ \
  && echo "OK: the key is not in the build output"
```

## The honest limits

1. **The rate limiter is a `Map` in one process.** It does not survive a cold start and it is not
   shared between instances: on a multi-instance deploy the real ceiling is `3 × warm instances`,
   and a scale-to-zero platform resets it whenever the instance is recycled.
2. **The bucket map is capped at 512 entries.** Past that it drops expired buckets and then evicts
   the oldest by insertion order, so someone flooding from many addresses can clear other people's
   buckets. Conscious degradation: that attacker already has the addresses a per-IP limit cannot stop.
3. **`startedAt` is client-supplied** and forgeable by reading the HTML.
4. **The IP is only trustworthy when the platform writes it.** Self-hosted behind a bare published
   port, `TRUST_PROXY=1` lets anyone walk around the limit with a forged `X-Forwarded-For`; left
   unset, everyone shares the `"unknown"` bucket. Loud degradation, not a silent hole.
5. **The CSP does not mitigate XSS**, because of `'unsafe-inline'`. It is exfiltration defence.
6. **An empty `RESEND_API_KEY` returns a successful-looking "message sent"** while only logging a
   warning. Accepted so the happy path can be exercised without real mail; mitigated by the
   `console.warn` and by sending a real message from the deploy checklist.
7. **The destination address is public** in `ContactChannels` and in the rescue `mailto:`. Deliberate:
   it is already in the public CV, and obfuscating it breaks accessibility and copy-paste.
8. **There is no captcha and no WAF.** The written trigger: more than five spam messages in a week
   means a shared store for the limiter; if it persists, an invisible captcha — and that day
   `/cookies`, `/privacy`, the CSP and the cookie tests all change together, because a captcha loads
   a third-party script and can drop state in the browser.
