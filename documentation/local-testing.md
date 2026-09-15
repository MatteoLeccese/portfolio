# Local testing

Everything you have to run, and everything you have to look at, to decide whether this
application is sound. Work through it from top to bottom in one sitting. Each step says what
to run and what the correct result looks like, so "it looks fine" becomes a judgement you can
actually make.

Nothing here needs the network, an API key or a deployed environment. The four things that
cannot be checked on this machine are listed in [section 7](#7-what-you-cannot-test-here).

**Time:** about 45 minutes, most of it looking at pages rather than waiting on commands.

---

## 1. Before you start

### 1.1 The toolchain

```bash
node -v        # must be >= 22.18.0
npm -v         # 11.x
```

`engines.node` requires **22.18.0 or newer**. `.nvmrc` pins **24**, which is what the Docker image
uses; with nvm installed, `nvm use` picks it up. Both work.

Dependencies must already be installed:

```bash
test -d node_modules && echo "dependencies present"
```

If that prints nothing, install them with `npm ci` — **not** `npm install`.
`package-lock.json` is committed precisely so the tree is frozen, and `npm install` is free to
drift from it.

### 1.2 The environment file

`.env.example.local` is the annotated template and explains every key; read it once. What this
document needs is smaller. **If you already have a `.env.local`, copy it somewhere first** —
this overwrites it:

```bash
cp .env.local .env.local.bak 2>/dev/null
cat > .env.local <<'EOF'
NEXT_PUBLIC_SITE_URL=http://localhost:3200
NEXT_PUBLIC_USE_RESEND_EMAIL_FORM=false

RESEND_API_KEY=
CONTACT_FROM_EMAIL="Portfolio dev <onboarding@resend.dev>"
CONTACT_TO_EMAIL=dev@localhost
RATE_LIMIT_SALT=local-development-salt
EOF
```

That is the configuration the whole document assumes. **Part 3 and part 4 differ by one line of
it** — the second one. [Section 9](#9-putting-the-repository-back) puts your own file back at
the end.

Three things worth knowing about it:

- **`NEXT_PUBLIC_SITE_URL` is the only variable a production build insists on.** Absent, the
  build stops with `NEXT_PUBLIC_SITE_URL is required for a production build.`
- **`NEXT_PUBLIC_SITE_EMAIL`, `NEXT_PUBLIC_SITE_GITHUB_URL` and `NEXT_PUBLIC_SITE_LINKEDIN_URL`
  are optional in every environment.** Left unset they fall back to the constants at the top of
  `src/domains/core/config/site.ts`, and the build succeeds. (The comment in
  `.env.example.local` claims the email is required under `npm run build`; the code reads it
  through `readOptionalEmail`, so it is not.) Set one to a value that is not an email address,
  or not an absolute http(s) URL, and the build does stop, naming the variable and the value it
  refused.
- **An empty `RESEND_API_KEY` is not an error.** The mailer logs the message to stdout instead
  of sending it. That is what lets you exercise the whole contact path in part 4 without real
  mail.

### 1.3 One line that proves the wiring

```bash
npm run check:style
```

Expected, in about two seconds:

```
OK - cero gradientes y cero colores literales en src/ y public/ y messages/
(relativo a .)
```

If that runs, `tsx`, the TypeScript config and the path aliases are all wired and you can
continue. If it cannot even start, stop here and fix the install.

---

## 2. The automated gate

### 2.1 What green means

```bash
npm run check
```

It chains five steps in order, and stops at the first failure:

| Step | What it proves |
|---|---|
| `typecheck` | `tsc --noEmit` over the whole repo, strict, no `any` |
| `lint` | `eslint .` with **zero warnings tolerated**, including `scripts/` and test files |
| `check:style` | zero gradients, and no colour literal outside `src/app/globals.css` |
| `check:contrast` | 44 foreground/background pairs, light and dark, against WCAG AA |
| `test` | Vitest, 39 files, node environment |

The tail you are looking for:

```
OK - 44 combinaciones exigidas verificadas, todas cumplen.

 Test Files  39 passed (39)
      Tests  658 passed | 1 skipped (659)
```

**658 passed, 1 skipped, and the skip is deliberate.** It is
`src/i18n/messages.test.ts:254`, `has no key that nobody calls` — the orphan-key scanner, held
back while the catalogue has more keys than consumers. One skip is correct; two is a
regression.

**`check:contrast` prints four `INFO` lines whose ratio is under the reference** — one
`border-strong / background` and one `border-strong / card` per theme, around 1.4 in light
and 2.3 in dark, against a printed `ref 3.0`. They read like failures and are not. Those two
pairs carry `informative: true` in `scripts/check-contrast.ts`, and the script's own header
says it: *combinations marked informative are measured and printed but never fail the run*.
They are not among the 44 either. What you are counting is the `PASS` lines — 22 per theme —
and the line that closes the block, `44 combinaciones exigidas verificadas`. A `FAIL` line
is the only thing that stops the run.

**Two warnings are printed and neither is a failure.** `npm run lint` prints a deprecation
notice from `@stylistic/eslint-plugin` about `overrides.arrow`, and one from
`eslint-plugin-boundaries` about `mode` in element descriptors. Vitest separately suggests
`fsModuleCache`. The exit code is what counts, and `npm run check` returns 0.

### 2.2 What the gate does *not* cover

Everything from part 3 onwards. The gate is entirely static: it never starts a server, never
opens a browser and never sees a rendered page. In particular it cannot see:

- whether a page renders at all, or renders in the right language;
- whether the theme flashes;
- whether a real browser stores the cookie the cookie policy describes;
- whether focus is trapped, or returned;
- whether anything scrolls sideways;
- whether the contact form actually sends.

`src/app/document-shell.test.ts` grubs through the `.tsx` sources as *text* to assert the
wiring is still in place — the theme script, the motion boot script, the single
`document.cookie` assignment. It proves no line of `src/` is *capable* of writing a second
cookie. It cannot prove a browser received one.

### 2.3 The trap, so you trust the gate

The fastest way to know a guard is alive is to make it fire. Create a file the gate must
reject:

```bash
printf '.trap { background: linear-gradient(to right, red, blue); }\n' > src/app/gradient-trap.css
npm run check:style
```

Expected — a non-zero exit, and this:

```
src/app/gradient-trap.css:1  gradient-css-function  .trap { background: linear-gradient(to right, red, blue); }

--------------------------------------------------------------------------
REGLA DURA VIOLADA (1 hallazgo(s)).
  · Gradientes  -> prohibidos en fondo, texto, borde y mascara.
                   Diferencia por elevacion (shadow-elevation-*) o hairline.
  · Colores     -> el unico fichero con colores literales es src/app/globals.css.
                   Consume un token semantico (bg-card, text-muted-foreground...).
Documentado en documentation/conventions/no-gradients.md
--------------------------------------------------------------------------
```

Then remove it and confirm the gate goes quiet again:

```bash
rm src/app/gradient-trap.css
npm run check:style
```

Back to `OK - cero gradientes...`. **Do not leave that file behind.** It is not imported by
anything, so nothing but this scanner would ever complain about it.

### 2.4 The generated assets

Icons are generated by hand and committed; the build does not regenerate them. Both scripts
have a `--check` mode that verifies what is on disk without rewriting it:

```bash
npm run icons:skills -- --check     # Checked 23/23 icons.
npm run icons:brand -- --check      # Checked 7/7 brand icons.
```

Both exit 0. A mismatch here means someone edited a generated SVG or PNG by hand.

---

## 3. The default configuration, end to end

This is the configuration with **no contact form**: the contact section offers a `mailto:`
panel instead, and the privacy policy describes a message that never touches this site.

Confirm the switch is off, then build and serve:

```bash
grep NEXT_PUBLIC_USE_RESEND_EMAIL_FORM .env.local   # NEXT_PUBLIC_USE_RESEND_EMAIL_FORM=false
npm run build
npm run start
```

`npm run build` ends with the route table. What you want to see is every page marked `●`
(SSG, prerendered) and only `/api/health` marked `ƒ`:

```
Route (app)
┌ ○ /_not-found
├   /[locale]
│ ├ ● /en
│ └ ● /es
├   /[locale]/cookies
│ ├ ● /en/cookies
│ └ ● /es/cookies
...
├ ƒ /api/health
├ ○ /apple-icon.png
├ ○ /icon.png
├ ○ /manifest.webmanifest
├ ○ /robots.txt
└ ○ /sitemap.xml

ƒ Proxy (Middleware)
```

The `...` stands for eight more `●` rows the real output prints between `/es/cookies` and
`/api/health`: `/[locale]/privacy`, plus the three `opengraph-image` groups (cookies, home,
privacy) — English and Spanish for each of the four. Twelve `●` rows in total, and the six
`○` rows shown above.

**A page that has quietly turned dynamic shows up here as `ƒ` and nowhere else.** That is the
one thing this table is for.

`npm run start` serves on **http://localhost:3200**. The port is written once, in the `dev`
and `start` scripts, and `npm run start -- --port 3300` expands to
`next start --port 3200 --port 3300` — Next takes the **last** flag, so that does serve on
3300. It just leaves you on a port nothing else agrees with: `lighthouserc.json`, the
Dockerfile's `EXPOSE` and every URL below say 3200. If you need a different port, change the
script.

### 3.1 The routes

With the server up, in another terminal:

```bash
for p in / /es /privacy /es/privacy /cookies /es/cookies /api/health /en /en/privacy /nope; do
  printf '%s  %s\n' "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3200$p)" "$p"
done
```

Expected, exactly:

```
200  /
200  /es
200  /privacy
200  /es/privacy
200  /cookies
200  /es/cookies
200  /api/health
307  /en
307  /en/privacy
404  /nope
```

`/en` redirecting to `/` is the point of `localePrefix: "as-needed"`: English carries no
prefix, so the prefixed form must not be a second canonical URL for the same page.

And the one API route:

```bash
curl -s http://localhost:3200/api/health      # {"status":"ok"}
```

### 3.2 Walk the six pages

Open each one and check the specific thing next to it. This is the part that cannot be
automated here, so read it slowly.

**`/` — English home.** Seven sections in order: hero, About, Skills, Experience, Education,
Projects, Contact. The type is Montserrat throughout — if you are looking at a serif, the font
wiring is broken and the build would not have told you. Two ways to be sure rather than
satisfied:

- DevTools ▸ Network ▸ Font: exactly **one** request, its name starting
  `Montserrat_Variable_latin-` and ending `.woff2`. (The hash in the middle changes on every
  build.)
- In the console, `getComputedStyle(document.body).fontFamily` starts
  `sans, "sans Fallback"`. `sans` is the name `next/font` generates from the export in
  `src/lib/fonts.ts`; it is the Montserrat file, not the generic family.

Then, specifically:

- **Experience.** Four employers, newest first: **Flusso Dynamics Group** (Feb 2026 – Sep
  2026), **Bitnat Redes y Sistemas** (Dec 2023 – Jul 2025), **SousTitreur.com** (Feb 2023 – Aug
  2023), **Servieduca** (Oct 2021 – Feb 2023). Flusso renders a square tile with the initials
  **FD** instead of a logo. **That is by design** — there is no logo file for it, and
  `CompanyLogo` falls back to a monogram. The other three show real logos on the same plate.
- **Projects.** An empty state: the kicker *In progress*, the heading *This section is
  deliberately empty.*, and two buttons. `src/domains/projects/content/projects.ts` exports an
  empty array, so this is correct, not a failure to load.
- **The header navigation has five entries, not six: About, Skills, Experience, Education,
  Contact.** There is deliberately **no Projects entry** while the project list is empty —
  `SiteHeader` filters it out. The `#projects` section still exists and is still reachable by
  URL.
- **Contact.** A card headed *Send me an email*, with a **Write to me** button and the note
  *The link opens your own mail app with my address already in place. Nothing you write passes
  through this site.* **There must be no form here.** Hover the button: the status bar shows a
  `mailto:` address.
- **The CV button** in the hero. Click it. **You will get a 404.** This is expected: the PDFs
  under `public/cv/` were never generated, and `public/cv/` does not exist. The button, the
  `download` attribute and the file name are all correct (`/cv/matteo-leccese-cv-en.pdf`,
  `-es` on `/es`); the file is not there.
  There is no `npm run cv` script: the generator it would need renders the PDF with a
  headless browser, which is not installed here.

**`/es` — Spanish home.** Same seven sections, same five nav entries, translated: *Sobre mí,
Habilidades, Experiencia, Educación, Contacto*. `<html lang="es">`.

The sharpest check here is the **month names**, because a locale that fails to reach the
formatter shows up as English months on a Spanish page. The same four periods must read
**Feb 2026 – Sept 2026**, **Dic 2023 – Jul 2025**, **Feb 2023 – Ago 2023**, **Oct 2021 – Feb
2023**. `Dic` and `Ago` are the two that move.

**`/privacy` and `/es/privacy`.** Eleven numbered sections, `1.` to `11.`. In **this**
configuration, read these three and hold on to them — they are what changes in part 4:

- The **intro** says: *The contact section publishes my email address instead of a form, so
  nothing you write to me is typed into this site or travels through it.*
- **§2 What data is collected** opens with ***Messages you write to me.*** and has **three**
  paragraphs: that one, *Server logs*, *Theme cookie*. **There is no "Anti-abuse data"
  paragraph.**
- **§4 Who else sees your data** opens with *No provider of mine stands between you and me.*
  **The word "Resend" does not appear anywhere on this page.**

Objectively:

```bash
curl -s http://localhost:3200/privacy | grep -c Resend    # 0
```

**`/cookies` and `/es/cookies`.** The table is covered in 3.3.

### 3.3 The cookie table against the real cookie jar

The claim on `/cookies` is absolute: *this site sets exactly one cookie, it only appears if you
click the light/dark theme switch*. Test both halves.

First, prove the server sets nothing:

```bash
curl -sI http://localhost:3200/ | grep -ci set-cookie     # 0
```

Then in the browser, on `/cookies`:

1. Open DevTools ▸ **Application** ▸ **Cookies** ▸ `http://localhost:3200`.
2. Delete anything listed, then reload the page.
   **Pass:** the list is **empty**. Not one cookie, in either language, on any of the six
   pages.
3. Read the table on the page. It has five columns and exactly **one body row**:

   | Name | Provider | Purpose | Duration | Type |
   |---|---|---|---|---|
   | `theme` | localhost:3200 (first party) | *Remembers whether you chose the light or the dark theme…* | 1 year | Preference (exempt from consent) |

   The Provider cell prints the host of `NEXT_PUBLIC_SITE_URL`, so it follows whatever that
   was set to **at build time** — see 4.1.

4. Click the **theme toggle** in the header (sun/moon icon), once.
5. Look at the cookie list again.
   **Pass:** exactly **one** cookie appears, and it matches the row above —
   name `theme`, value `dark`, Path `/`, Expires about one year out, SameSite `Lax`,
   **HttpOnly unchecked**, **Secure unchecked** (you are on http).

   `HttpOnly` being off is deliberate: the pre-paint script reads the cookie through
   `document.cookie` before React exists.
6. Toggle back to light.
   **Pass:** still exactly one cookie, value now `light`. No second cookie, ever — in
   particular **no `NEXT_LOCALE`**, which next-intl would write if `localeCookie` were not
   `false` in `src/i18n/routing.ts`.

A table listing a cookie the browser never sets is as wrong as one omitting a cookie it does.
Check both directions.

### 3.4 Anchor navigation, and language switching partway down

Both menus and the wordmark are real anchors, so all of this works with JavaScript off too.

1. From the top of `/`, click each nav entry in turn: **About, Skills, Experience, Education,
   Contact**.
   **Pass:** each one reaches its section, the URL gains the matching hash (`/#about`,
   `/#skills`, …), and the section heading sits **clear of the sticky header** rather than
   underneath it.
2. Click the **wordmark** (Matteo Leccese) on the left of the header.
   **Pass:** back to the top; the URL reads `/#hero`.
3. There is no nav entry for Projects — see 3.2 — but the section is still addressable. Load
   `http://localhost:3200/#projects` directly.
   **Pass:** the page opens scrolled to the Projects empty state.
4. Scroll slowly through the page and watch the nav.
   **Pass:** the entry for the section currently under the header is highlighted, and the
   highlight moves down the list as you scroll. **Never more than one** entry at a time.
   **Over the hero and over Projects, no entry is highlighted at all** — the scroll spy tracks
   all seven sections, but neither of those two has a nav entry to mark. That is expected.
   Two entries highlighted at once, or a highlight that sticks on the wrong section, is not.

Now the language switch. **The hash has to be in the URL for the section to be preserved** —
the switcher rewrites its own `href` with `window.location.hash` at the moment you activate it,
and merely scrolling does not set a hash:

5. Click the **Experience** nav entry (the URL now reads `/#experience`), then click **ES**.
   **Pass:** you land on `/es#experience`, on the **Experiencia** section — the same section,
   in Spanish. The section ids are identical in both languages, which is what makes this work.
6. From there, click **Educación**, then click **EN**.
   **Pass:** `/#education`, on the Education section.
7. The legal pages carry section ids but publish **no links to them** — there is no table of
   contents and the headings are not anchors, so the only way to reach a clause directly is the
   URL bar. Type `http://localhost:3200/privacy#retention`, then click **ES**.
   **Pass:** `/es/privacy#retention`, on *6. Cuánto tiempo se conservan*. The path is
   translated, the id is not — the eleven ids are the same in both languages, which is what
   makes the hash survive.
8. Now the other case: reload `/` (no hash), **scroll** by hand down to Experience without
   clicking anything, then click **ES**.
   **Pass:** you land at the **top** of `/es`. That is correct, not a bug — with no hash in the
   URL there is nothing to preserve. Only step 5 preserves the section.

**Check the header from a legal page too.** Open `/privacy` and click **Experience** in the
header: it must take you to `/#experience`, on the home page, at that section. From
`/es/cookies`, **Experiencia** must reach `/es#experience`. The wordmark must go home from
any page.

The header anchors are absolute to the locale home — `/#about` in English, `/es#about` in
Spanish — so they work from every page. On the home page the browser resolves them as a
same-document fragment, with no reload.

### 3.5 The theme must not flash

With the cookie now set to **dark**, this is the test the whole pre-paint script exists for.

1. Set the theme to dark, then reload `/`.
   **Pass:** the page is dark from the first frame. No white flash, not even one frame.
2. Repeat on a throttled connection: DevTools ▸ **Network** ▸ throttling **Slow 4G**, then a
   hard reload (Ctrl+Shift+R).
   **Pass:** still no white flash. The page may paint slowly, but never light-then-dark.
3. Open a **private window** and load `http://localhost:3200`.
   **Pass:** the page is **light**. A private window has no cookie, and light is the default —
   `prefers-color-scheme` is deliberately never consulted, so a dark OS does not change this.
4. In the private window, set dark, then reload.
   **Pass:** dark, no flash, same as step 1.

The mechanism, if you want to see it: view source on `/` and find the inline script near the
end of `<head>`, immediately after `<meta name="theme-color">`. It is one blocking statement
that reads the cookie, adds `dark` to `<html>` and rewrites the theme colour. Any flash means
that script stopped running, or stopped being blocking.

---

## 4. The Resend configuration, end to end

### 4.1 Flip the switch, and rebuild

Stop the server, then flip the one line:

```bash
sed -i 's/^NEXT_PUBLIC_USE_RESEND_EMAIL_FORM=false$/NEXT_PUBLIC_USE_RESEND_EMAIL_FORM=true/' .env.local
grep NEXT_PUBLIC_USE_RESEND_EMAIL_FORM .env.local   # ...=true
```

Only the exact string `true` switches the form on. `True`, `TRUE`, `1`, `yes` and `true ` with
a trailing space are all read as false, silently.

Every `NEXT_PUBLIC_*` value is **inlined into the output at build time**. For the production
path this is not negotiable:

```bash
npm run build        # required. Restarting `npm run start` alone changes nothing.
npm run start
```

**In `npm run dev` it behaves differently, and it is worth knowing which.** Next 16.3.4 watches
`.env.local`; editing it prints

```
  Reload env: .env.local
```

in the dev server's terminal, and the next request already reflects the new value — the contact
section **and** the privacy policy both follow, with no restart. That works here because
**nothing that reads this flag is a client component**: its only consumers are
`ContactSection.tsx`, `submitContact.ts` and `privacy.ts`, all evaluated on the server. Reload
the browser tab after the terminal prints that line. If you ever see stale output, restart the
dev server — but under `npm run build` the value is frozen and a rebuild is the only way.

You can watch a value freeze, if you want the habit to stick. The provider column of the cookie
table on `/cookies` prints the host of `NEXT_PUBLIC_SITE_URL`, so:

1. Change `NEXT_PUBLIC_SITE_URL` to `http://example.test` and restart `npm run start` **without
   rebuilding**. `/cookies` still says `localhost:3200 (first party)`.
2. Run `npm run build` and start again. Now it says `example.test (first party)`, every `<loc>`
   in `/sitemap.xml` reads `http://example.test/…`, and the `canonical` and `og:url` in the
   head follow. (`/robots.txt` does **not** change: it prints `Disallow: /` with no host at
   all, because the site is not indexable outside production — see section 7.)
3. Put `http://localhost:3200` back and rebuild before going on.

Step 1 is the whole lesson: the value in the file and the value in the page are different
things until a build reconciles them.

### 4.2 What changed on the page

Reload `/`. The contact section is now a **form**: Name, Email, Subject, Message, a character
counter under the message, a **Send message** button, and a privacy notice linking to
`/privacy`. The `mailto:` card is gone.

```bash
curl -s http://localhost:3200/ | grep -c 'data-testid="contact-form"'   # 1
curl -s http://localhost:3200/ | grep -c 'data-testid="contact-mail"'   # 0
```

### 4.3 What changed in the privacy policy

Reload `/privacy` and re-read the three places you noted in 3.2. All three must now describe
the other path:

| Section | Default build | This build |
|---|---|---|
| Intro | *…publishes my email address instead of a form…* | *The only moment personal data is collected is when you deliberately send a message through the contact form.* |
| §2 | ***Messages you write to me.*** — 3 paragraphs | ***Contact form.*** + ***Anti-abuse data.*** + *Server logs* + *Theme cookie* — 4 paragraphs |
| §4 | *No provider of mine stands between you and me.* | *Your message is delivered by **Resend**, an email delivery provider…* |
| §6 | — | adds a paragraph on the hashed IP address and the one-hour window |
| §8 | *There is no field to fill in…* | *The credentials used to send email are held server-side…* |

Objectively:

```bash
curl -s http://localhost:3200/privacy | grep -c Resend    # 1
```

Check `/es/privacy` too — the Spanish document carries the same eleven sections and switches
the same paragraphs. The three landmarks to look for there:

- **§2** opens ***Formulario de contacto.*** and gains a second paragraph,
  ***Datos antiabuso.***, before *Registros del servidor* and *Cookie de tema* — four
  paragraphs, where the default build has three and opens *Los mensajes que me escribes.*
- **§4** opens *Tu mensaje se entrega mediante **Resend**…*, where the default build opens
  *Ningún proveedor mío se interpone entre tú y yo.*
- **§6** gains the paragraph beginning *Los registros antiabuso…*

```bash
curl -s http://localhost:3200/es/privacy | grep -c Resend    # 1
```

**`/cookies` does not change between the two configurations.** The form sets no cookie, so
there is nothing to add to the table. Confirm the visible text is the same as in part 3.

### 4.4 The form, with JavaScript on

The server is in **dry-run** mode (`RESEND_API_KEY` is empty), so a successful send logs to the
terminal instead of delivering mail. Watch the terminal running `npm run start` while you do
this.

1. Press **Send message** with every field empty.
   **Pass:** per-field errors appear under the fields — *Please enter your name two characters
   minimum.*, *I need a valid email address to reply to.*, *Give it a subject three characters
   minimum.*, *A little more context, please 20 characters minimum.* — plus one summary line
   above the button, *Some fields need fixing before this can be sent.* Focus lands on the
   first invalid field.
   The form carries `noValidate`, so none of this is the browser's own validation bubble: every
   message you see came back from the server.
2. Type a bad email (`not-an-email`) and tab out of the field.
   **Pass:** the error appears **on blur**, before you submit anything.
3. Fill everything in properly — the message must be **at least 20 characters** — and send.
   **Pass, on screen:** the form crossfades to a panel reading **Message sent.** / *Thanks for
   writing. I'll reply as soon as I can.* with a **Send another message** button.
   **Pass, in the terminal:**
   ```
   [contact] DRY RUN: RESEND_API_KEY is empty, the message was not delivered.
   ```
   That line is the proof the message reached the mailer. Without it, the success panel is
   lying.
4. Send **three** messages in total, then a fourth.
   **Pass:** the fourth is refused with *You have sent several messages already. Try again in
   an hour.*, and the terminal shows **three** `DRY RUN` lines, not four. The limit is three
   per hour per identifier, and a refusal never reaches the mailer.
   Locally there is no trusted proxy header, so every request shares one `"unknown"` bucket —
   you cannot dodge the limit by using another browser.
5. Restart `npm run start` and send again.
   **Pass:** it works. The limiter is a `Map` in the server process, so it does not survive a
   restart. That is a known limit, not a bug.

### 4.5 The form, with JavaScript disabled

**This is a real invariant of the implementation, not an aspiration**, and it is the check most
likely to catch a regression.

Disable JavaScript: DevTools ▸ Ctrl+Shift+P ▸ **Disable JavaScript**. Reload `/`.

1. **Pass:** the whole page is readable. All seven sections, all text visible — nothing
   stranded invisible.
2. **Pass:** the contact form is still there, with all four fields and the button.
3. Fill it in properly and send.
   **Pass:** the page reloads and shows the **Message sent.** panel, and the terminal prints
   the `DRY RUN` line. With no JavaScript this is a full page navigation, so the browser puts
   you back at the **top** of the page — scroll down to Contact to see the panel. Nothing
   focuses it for you; that part is the JavaScript path.
   **Fail:** *That submission looked automated. Please try again.*

That failure mode is the one to understand. The form carries a hidden `startedAt` field served
as `"0"`, which a script overwrites with `Date.now()` after mount. The server only applies the
three-second minimum fill time when `startedAt > 0` — **zero is no timing evidence, and no
evidence passes**. If a no-JS submission is ever rejected as spam, that guard has been
inverted.

Re-enable JavaScript when you are done.

### 4.6 The anti-spam layers still work

The three layers are honeypot, minimum fill time, and rate limit, applied in that order, before
any mail. You already saw the rate limit in 4.4. The other two:

- **Honeypot.** A real, always-present text input named `hp_field`, labelled *Leave this field
  empty*, inside an `aria-hidden` wrapper that the `honeypot` utility parks at
  `left: -9999px`. It is off-window rather than merely `sr-only`, and it sits **outside** the
  `<fieldset disabled>` so that disabling the form cannot drop it from the submission.
  **Pass:** you never see it, Tab never lands on it (`tabIndex={-1}`), and the browser's
  autofill never fills it (`autoComplete="new-password"`) — check that last one by letting
  Chrome autofill your name and email, then inspecting the field's value: still empty.
  Now set a value on it in DevTools and submit. **Pass:** *That submission looked automated.
  Please try again.*, and **no `DRY RUN` line in the terminal** — a filled trap costs no mail,
  because the honeypot is checked before the mailer is ever reached.
- **Minimum fill time.** With JavaScript **on**, fill the form and submit within three seconds
  of the page settling. **Pass:** *That submission looked automated. Please try again.* Wait
  longer and the same content sends.

---

## 5. Accessibility and keyboard

Do this in the **Resend configuration**, so the form is in the tab order. Mouse untouched.

1. Load `/`, click once on the address bar, then press **Tab** once.
   **Pass:** a visible **Skip to content** chip appears at the top left, over the header. It
   must be the **first** focusable element in the document — before the wordmark, before the
   nav, before everything.
2. Press **Enter** on it.
   **Pass:** focus moves to `<main>`; the next Tab lands inside the page content, not back in
   the header.
3. At a desktop width (768px or more), Tab through the header: wordmark → About → Skills →
   Experience → Education → Contact → **EN** → **ES** → theme toggle. The hamburger is
   `display: none` at this width, so it is correctly absent from the tab order.
   **Pass:** every stop has a **visible focus ring** — a solid two-pixel outline, offset from
   the element. No invisible stops, no stop you cannot see.
   Tab on into the hero: the two call-to-action buttons, the **CV** button, then the social
   links. All of them are real anchors and all take focus.
4. Press **Enter** on a nav entry, e.g. Experience.
   **Pass:** the page scrolls to the Experience heading and the heading is **not hidden under
   the sticky header** — there is clear space above it.
5. Press **Enter** on the theme toggle.
   **Pass:** the palette inverts. On a viewport of 768px or more, and with reduced motion off,
   a circular sweep expands from the button; below 768px, or with reduced motion on, the theme
   changes instantly with no sweep. Either is correct.
6. Narrow the window below 768px so the hamburger appears. Tab to it and press **Enter**.
   **Pass:** the panel slides in from the right and **focus moves inside it**.
7. Keep pressing **Tab**.
   **Pass:** focus **cycles inside the panel** — close button, the five entries, back to the
   close button. It must never reach the page behind.
8. Press **Escape**.
   **Pass:** the panel closes **and focus returns to the hamburger button** you opened it from.
   Losing focus to `<body>` here is a failure.
9. Reopen the panel, Tab to an entry, press **Enter**.
   **Pass:** the panel closes and the page scrolls to that section.
10. Tab into the Contact form and submit it empty with **Enter** on the button.
    **Pass:** focus jumps to the first invalid field, and the error text under it is announced
    — it is linked by `aria-describedby` and the field carries `aria-invalid="true"`.
11. On `/cookies`, Tab until the cookie table takes focus.
    **Pass:** the table's scroll container is itself focusable, with a visible ring, so the
    table can be scrolled sideways from the keyboard.

Two more, with a screen reader if you have one to hand, or by inspecting the accessibility tree
otherwise:

12. The language switcher's active entry carries `aria-current="page"`; the other reads *Switch
    to Español* (or *Switch to English*).
13. The theme toggle's accessible name describes the **action**, not the state: *Switch to dark
    theme* / *Switch to light theme*.

---

## 6. Resilience

### 6.1 No JavaScript at all

DevTools ▸ Disable JavaScript, then reload each of the six pages.

**Pass on every page:** fully readable. Every section, every paragraph, every skill badge,
every timeline entry. The served HTML marks every element the animation system would hide with
`data-reveal="hidden"`, but the styling that hides them lives entirely behind
`html[data-motion]` — an attribute only the boot script writes. No script, no attribute, no
hiding. View source and you will find `<html lang="en" class="…">` with no `data-motion` on it:
the attribute is added at runtime, and only at runtime.

**Specifically:**

- All four Experience entries with their dates and the FD initials tile.
- The Projects empty state.
- The Contact form (or the `mailto:` card, in the default configuration), fully usable.
- The header nav anchors still work, from every page — they are real anchors, not click
  handlers.
- The theme toggle does **nothing**. It is a button whose only behaviour is JavaScript; the
  page stays on whatever the cookie said. That is correct.

**The failure to look for** is the opposite: a section that renders *blank* or at zero opacity.
That means something wrote `opacity: 0` inline instead of leaving it to the stylesheet, and the
content is stranded for every visitor whose bundle fails.

Re-enable JavaScript.

### 6.2 Reduced motion

Turn the OS setting on — on Windows, *Settings ▸ Accessibility ▸ Visual effects ▸ Animation
effects* off; in DevTools, Ctrl+Shift+P ▸ **Emulate CSS prefers-reduced-motion: reduce**.
Reload `/` and scroll to the bottom.

- **Pass:** every section **appears**. Nothing stays invisible waiting for an animation that
  will not run.
- **Pass:** nothing **moves**. Sections fade in without sliding up; the stagger between list
  items is gone, so a list arrives at once instead of item by item; the hero does not rise; the
  theme toggle does not sweep; the mobile menu fades instead of sliding.
- **Pass:** the vertical bar down the Experience timeline is **already full** when the section
  arrives, instead of growing as you scroll. It is drawn complete rather than skipped: the
  information the bar carries is still there.
- The fade itself is kept on purpose. A short opacity transition is not motion.

This is a rule-by-rule answer, not a global `animation: none` hammer — which is why "content
still appears" and "nothing moves" have to be checked separately. The classic global reset is
deliberately absent from `globals.css` and must not be added.

### 6.3 Slow network

DevTools ▸ Network ▸ **Slow 4G**, cookie set to **dark**, hard reload.

- **Pass:** no white flash (this is 3.5 again, and throttling is where it shows).
- **Pass:** text is readable before the font arrives, and **does not re-flow** when it does.
  The fallback metrics are derived from the real font file to prevent exactly that jump; a
  visible re-break means they were hand-written or copied.
- **Pass:** content appears even if you throttle hard enough that the JS bundle is very late.
  There is a **3-second fail-safe** in the boot script: if the bundle has not reported in, the
  motion attribute flips to `"off"` and everything becomes visible, unanimated.

### 6.4 Narrow viewport

DevTools ▸ device toolbar ▸ **360 × 800**. Walk all six pages, top to bottom.

- **Pass:** **no horizontal scrolling on any section.** The objective form, pasted into the
  console:
  ```js
  document.documentElement.scrollWidth <= document.documentElement.clientWidth
  ```
  It must report `true` on every page. If it reports `false`, find the culprit with:
  ```js
  [...document.querySelectorAll('*')].filter(el => el.getBoundingClientRect().right > document.documentElement.clientWidth)
  ```
- **Pass:** the **skills grid wraps**. Each category stacks its label above its badges, and the
  badges flow onto as many lines as they need. No badge is clipped, none escapes the gutter.
- **Pass:** every tap target in the header is at least **44px** — the hamburger, the theme
  toggle, both language entries. Careful when you measure: the two language entries are drawn
  36px high and reach 44px through the `touch-target` utility, which expands the hit area with
  an `::after` pseudo-element. Hover them in DevTools and it is the pseudo-element's box, not
  the anchor's, that has to reach 44.
- **Pass:** the cookie table on `/cookies` is the **one** thing allowed to scroll sideways, and
  it does so **inside its own container**, not by moving the page.
- **Pass:** the Contact section is a single column; nothing sits beside anything else.

Repeat the scrollWidth check at **320px** if you want the harsher version. Text will be tight —
at 360px the column is 37 characters, which is physics, not a broken token — but nothing should
overflow.

---

## 7. What you cannot test here

Four things. None of them has a local substitute, and inventing one would only produce a green
tick that means nothing.

**A real send through Resend.** `RESEND_API_KEY` is empty, so `sendContactEmail()` logs
`[contact] DRY RUN: …` and returns as if it had succeeded. Everything up to the provider
boundary is exercised; the provider itself is not. To test it for real you need a valid Resend
API key and either a verified sending domain, or the `onboarding@resend.dev` sender — which
only delivers to the address the Resend account was registered with. That belongs to the deploy
checklist, where a real message is sent once.

**Lighthouse budgets.** `lighthouserc.json` holds the assertions, and **nothing enforces them**.
Reading them means `npx lhci autorun` by hand, and neither `lhci` nor `lighthouse` is installed on
this machine — installing one is a download. Chrome's built-in Lighthouse panel will give you
scores, but **not** the budget assertions in that file.

**The Docker image.** `Dockerfile` builds from `node:24-alpine` in three stages and exposes
3200 with a healthcheck. It cannot be built here: `docker` is not available in this WSL distro
(*"The command 'docker' could not be found in this WSL 2 distro"*), and building it would pull
base images anyway. See `documentation/deployment/docker.md`.

**The end-to-end suite.** `playwright.config.ts` is written and points at `./tests/e2e` — and
**that directory is empty**. There are no specs. `npm run test:e2e` has nothing to run, and no
browser is installed for it either. Every browser-dependent claim in this document is therefore
a manual check, by necessity: the focus trap, the Escape return, the cookie jar, the absence of
a flash. Parts 5 and 6 are what stands in for that suite until it is written.

Two smaller things that are *correct locally* and would be wrong in production, so do not
"fix" them:

- **`/robots.txt` says `Disallow: /`** and every page carries `<meta name="robots"
  content="noindex, nofollow, nocache">`. The site is only indexable when `VERCEL_ENV` is
  `production`, which it is not here.
- **`npm run start` sends `Strict-Transport-Security` and `upgrade-insecure-requests`**,
  because `next start` runs with `NODE_ENV=production`. Browsers ignore HSTS on a plain-HTTP
  response, so nothing is pinned by testing over `http://localhost`. Under `npm run dev`
  neither appears, and `'unsafe-eval'` and `ws:` are added to the CSP instead, for HMR.

---

## 8. Checklist

For a later run, once the prose above has been read once.

**Setup**

- [ ] `node -v` ≥ 22.18.0, `npm -v` is 11.x, `node_modules` present
- [ ] `.env.local` exists, `NEXT_PUBLIC_SITE_URL=http://localhost:3200`, `RESEND_API_KEY` empty
- [ ] `npm run check:style` → `OK - cero gradientes...`

**Gate**

- [ ] `npm run check` → exit 0, `39 passed`, `658 passed | 1 skipped (659)`
- [ ] gradient trap: create `src/app/gradient-trap.css`, `check:style` fails with
      `gradient-css-function`, delete it, `check:style` passes
- [ ] `npm run icons:skills -- --check` → `Checked 23/23 icons.`
- [ ] `npm run icons:brand -- --check` → `Checked 7/7 brand icons.`

**Default configuration** (`NEXT_PUBLIC_USE_RESEND_EMAIL_FORM=false`, then `npm run build`)

- [ ] route table: all pages `●`, only `/api/health` is `ƒ`
- [ ] status codes: `200` ×7, `307` for `/en` and `/en/privacy`, `404` for an unknown path
- [ ] `/api/health` → `{"status":"ok"}`
- [ ] `/` and `/es`: seven sections, Montserrat, **five** nav entries (no Projects)
- [ ] Experience: four employers, **FD initials tile** on Flusso Dynamics Group
- [ ] Projects: the deliberate empty state
- [ ] Contact: the `mailto:` card, **no form**
- [ ] CV button → **404, expected** — the PDFs were never generated (see 3.2)
- [ ] `/privacy`: §2 opens *Messages you write to me.*, no *Anti-abuse data*, `grep -c Resend` → 0
- [ ] `/cookies`: five columns, exactly one body row, `theme`
- [ ] cookie jar empty on first load; `curl -sI / | grep -ci set-cookie` → 0
- [ ] after one theme toggle: exactly one cookie, `theme`, Path `/`, ~1 year, SameSite Lax, not HttpOnly
- [ ] dark cookie + reload → **no flash**; on Slow 4G → no flash; private window → light

**Resend configuration** (`=true`, then `npm run build` — a rebuild, not a restart)

- [ ] contact section is the form; `mailto:` card gone
- [ ] `/privacy`: §2 opens *Contact form.* + *Anti-abuse data.*, §4 names **Resend**,
      `grep -c Resend` → 1
- [ ] `/es/privacy` switched too; `/cookies` unchanged
- [ ] empty submit → four field errors, focus on the first
- [ ] bad email → error **on blur**
- [ ] valid submit → *Message sent.* **and** `[contact] DRY RUN: …` in the terminal
- [ ] fourth send in an hour → *You have sent several messages already.*
- [ ] restart the server → sending works again
- [ ] **JS disabled**: page readable, form present, submit **succeeds** (not *looked automated*)
- [ ] submit within 3 s with JS on → *That submission looked automated.*

**Accessibility**

- [ ] first Tab → **Skip to content**, before everything else
- [ ] every header stop has a visible focus ring
- [ ] Enter on a nav entry → section reached, heading clear of the sticky header
- [ ] mobile menu: focus moves in, Tab **cycles inside**, **Escape returns focus to the trigger**
- [ ] empty form submit → focus on first invalid field
- [ ] cookie table container is focusable

**Resilience**

- [ ] JS off: all six pages fully readable, nothing blank or invisible
- [ ] reduced motion: everything **appears**, nothing **moves**
- [ ] Slow 4G: no flash, no text re-flow when the font lands
- [ ] 360px: `scrollWidth <= clientWidth` true on all six pages, skills grid wraps

**Anchors and language**

- [ ] all five nav items reach their section, in both languages, heading clear of the header
- [ ] `/#projects` opens on the Projects section, though it has no nav entry
- [ ] the nav highlights at most one entry as you scroll; none over the hero or Projects
- [ ] click **Experience** (URL `/#experience`), then **ES** → `/es#experience`, on Experiencia
- [ ] click **Educación** on `/es`, then **EN** → `/#education`, on Education
- [ ] scroll to a section **without clicking**, then switch language → lands at the top,
      which is correct: no hash, nothing to preserve
- [ ] from `/privacy`, click **Experience** in the header → `/#experience`, on that section
- [ ] from `/es/cookies`, the wordmark goes to `/es`

---

## 9. Putting the repository back

Nothing above is destructive, but three things are left behind when you stop reading.

```bash
# 1. The gradient trap, if 2.3 was interrupted before the `rm`.
test -e src/app/gradient-trap.css && rm src/app/gradient-trap.css

# 2. Your own .env.local, which 1.2 overwrote.
test -e .env.local.bak && mv .env.local.bak .env.local

# 3. The server from part 3 or part 4. Ctrl+C in its terminal, then confirm:
curl -s -o /dev/null -w '%{http_code}\n' --max-time 2 http://localhost:3200/   # 000
```

Then prove the repository is where you found it:

```bash
npm run check     # exit 0
npm run build     # exit 0
```

Both run against whatever `.env.local` now says. If you restored a file without
`NEXT_PUBLIC_USE_RESEND_EMAIL_FORM` in it, that is the default configuration — the variable
is read as `false` when it is absent, and part 3 is what you get.
