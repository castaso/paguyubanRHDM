# Paguyuban RHDM — build notes

A static family website with a marketplace. No build step, no dependencies, no
external assets. Open `index.html` and it runs.

## What is here

```
.
├── index.html          Home hub — news, upcoming events, featured listings
├── marketplace.html    The market — filter chips, search, sort, all states
├── listing.html        Listing detail (reads ?id=<listing-id>)
├── sell.html           Post a listing (validated form)
├── family.html         Albums, recipe box, directory, latest news
├── events.html         Calendar grouped by month
├── about.html          How the market works + house rules
├── PRD.md              The product requirements document
├── assets/
│   ├── styles.css         All styling. Design tokens live in :root at the top.
│   ├── data.js            All content — listings, members, events, news, recipes
│   ├── app.js             Filtering, detail rendering, form validation, chrome
│   ├── auth.js            Settings panel + sign-in (three modes, see below)
│   ├── supabase-auth.js   Zero-dependency Supabase Auth client
│   ├── theme.js           Light / dark theme, applied before first paint
│   ├── i18n.js            Interface translations (English keys, Indonesian values)
│   ├── i18n-content.js    Content translations + dynamic UI strings
│   ├── lang.js            Language switch: <html lang>, persistence, swapping
│   ├── motion.js          Scroll reveals, parallax, hover tilt (reduced-motion aware)
│   └── favicon.svg
├── supabase/              Supabase Auth + Postgres RLS
│   ├── schema.sql         Tables, allow-list, policies — run this in Supabase
│   └── README.md          Setup steps
├── server/                Node backend: Google OAuth + server-enforced RBAC
│   ├── server.js          HTTP server, routes, settings API
│   ├── config.js          Environment configuration
│   ├── lib/               oauth.js · session.js · rbac.js · supabase-token.js · static-site.js
│   ├── test/              api.test.js (access) · design.test.js (theme, contrast, copy) · i18n.test.js (languages) · motion.test.js (motion)
│   ├── .env.example       Copy to .env and fill in
│   ├── Dockerfile
│   └── README.md          Backend setup + deployment
└── README.md
```

## Run it

### Site alone (static)

- **Double-click `index.html`**, or
- serve the folder: `python -m http.server 8000` then open `http://localhost:8000`.

No dependencies and no build step. You will land on the sign-in gate — enter one
of the allowed accounts to get in (see *Access control* below).

### Site + backend (real Google sign-in)

```bash
cd server
cp .env.example .env      # fill in the Google credentials + SESSION_SECRET
node --env-file=.env server.js
# → http://localhost:8787
```

The backend serves the site **and** gates it. The Google Cloud Console steps are
in `server/README.md`.

## How to change things

| You want to change… | Edit |
|---|---|
| Colours, fonts, spacing, radius | `assets/styles.css` → the `:root` block at the top |
| A listing (title, price, seller, text) | `assets/data.js` → `LISTINGS` |
| Categories in the filter bar | `assets/data.js` → `CATEGORIES` |
| Family members / directory | `assets/data.js` → `MEMBERS` |
| Events / calendar | `assets/data.js` → `EVENTS` |
| News posts | `assets/data.js` → `NEWS` |
| Recipes | `assets/data.js` → `RECIPES` |
| Brand name, tagline, contact email | `assets/data.js` → `SITE` |
| Nav links or footer columns | the `<header>` / `<footer>` in each `.html` file |
| Form fields or their rules | `sell.html` (markup) + `FIELDS` in `assets/app.js` |
| Who may sign in (client list) | `assets/auth.js` → `allowedEmails` |
| Who may sign in (enforced) | Supabase: the `allowed_emails` table · self-hosted: `ALLOWED_EMAILS` |
| Who may post or manage listings | the admin allow-list — client gate + server guard + Supabase RLS |
| Which sign-in provider is used | `assets/auth.js` → `authMode` (`prototype` / `supabase` / `server`) |
| Supabase project + keys | `assets/auth.js` → `supabase.url` / `supabase.anonKey` |
| The settings panel (the cog) | `assets/auth.js` → `buildSettings()` |
| Theme colours | `assets/styles.css` → the `:root` and `[data-theme="dark"]` blocks |
| Theme default and toggle | `assets/theme.js` |
| Site language and translations | `assets/i18n.js` (interface) + `assets/i18n-content.js` (content) |
| Language switch behaviour | `assets/lang.js` |
| Motion and hover physics | `assets/motion.js` + the motion block in `assets/styles.css` |
| The marquee ticker | `assets/app.js` → `initTicker()` |

### Adding a listing

Append an object to `LISTINGS` in `assets/data.js`:

```js
{
  id: "unique-kebab-id",       // used by listing.html?id=…
  title: "…",
  category: "handmade",        // must match a CATEGORIES id
  price: 20, priceUnit: "",    // 0 → shown as "Free / borrow"
  condition: "Good",
  seller: "Full Name", place: "Town, ST",
  posted: "2026-09-16",        // YYYY-MM-DD, drives "newest"
  tint: "--tint-3",            // --tint-1 … --tint-6
  blurb: "One or two sentences.",
  details: ["bullet", "bullet"],
  tags: ["tag", "tag"]
}
```

### Swapping the placeholder photos

Every image slot is an honest tinted placeholder (`.listing-media`, `.album-cover`,
`.ph-img`). To use real photos, drop files into `assets/` and replace the
placeholder `<div>` with `<img src="assets/your-photo.jpg" alt="…">`, keeping the
same aspect ratio. Do **not** link to a remote image host — the host blocks
cross-origin requests.

## Page logic

| Surface | Behaviour |
|---|---|
| Market | Reads `?q=`, `?cat=`, `?sort=` from the URL (so a filtered view is shareable); shows skeleton cards while "loading", then results; renders a distinct empty state and error state |
| Listing detail | Reads `?id=`; unknown/missing id renders a not-found panel with a route back |
| Sell form | Validates each field on blur; re-validates on input once invalid; builds an error summary on submit and moves focus to it; keeps values on failure; shows a success state that does not lose what you typed |
| Calendar | Groups upcoming events by month; empty calendar gets its own state |

**Seeing the non-default states without breaking anything:** the market shows the
loading state on every filter change, the empty state when a search matches
nothing (e.g. `marketplace.html?q=zzzz`), and the error state at
`marketplace.html?state=error` — which includes a working "Try again" button.

## Access control (RBAC)

**The site is public.** No page is hidden behind a login.

Sign-in is offered from exactly one place: the **settings cog in the top-right
of the header**. It is invisible until you hover it, tab to it, or open it.

Click it and the settings panel opens:

- **Signed out** → it asks for an approved Google account.
- **Signed in** → it shows the account, the allow-list, how access is enforced,
  and **Sign out**.

Only these accounts are accepted:

```js
// assets/auth.js
allowedEmails: ["paguyubanRHDM@gmail.com", "castasoft@gmail.com"]
```

On the static preview this check runs in the browser and guards the settings
panel — see the warning below. The version that actually enforces it is the
backend in `server/` or Supabase RLS.

### Three sign-in modes

Set by `assets/auth.js` → `authMode`:

| Mode | Sign-in runs through | Enforced by | Use it for |
|---|---|---|---|
| `prototype` (default) | local browser storage | nothing — UI only | the static preview |
| `supabase` | Supabase Auth (Google provider) | Postgres RLS — `supabase/schema.sql` | the real deployment |
| `server` | the Node backend in `server/` | server-side session + allow-list | a self-hosted deploy |

Setup walkthroughs: `supabase/README.md` and `server/README.md`.

### Selling is admin-only

The market is public to browse, but **setting up and posting goods or services
is limited to the admins** — the two addresses on the allow-list. There is no
public "Sell something" action anywhere: it is gone from the nav, the footers
and every call-to-action.

- The selling page is `sell.html`. It is hidden and gated by
  `data-requires-admin` in `assets/auth.js`; a signed-out visitor sees a
  *sign in as an admin* panel instead of the form.
- Once an admin is signed in, the cog panel grows an **Admin** section linking
  to it.
- Defence in depth: the backend refuses `/sell.html` without an admin session
  (403), and the Supabase RLS policies only let allow-listed accounts insert
  listings — so the rule holds even with JavaScript bypassed.
- To add or remove an admin, edit the allow-list (and the `allowed_emails`
  table); the same two addresses govern sign-in and selling.

### ⚠️ This gate is not real security

The whole check runs in the browser (`assets/auth.js`), and a static file host
has no server. Anything client-side can be bypassed: open devtools, set
`localStorage["alderhouse.session.v1"]`, or just read the files. Treat this as a
**reviewable prototype of the experience**, not as protection.

It also cannot be a *real* Google sign-in here, for two independent reasons:

1. Google Identity Services loads `https://accounts.google.com/gsi/client`, and
   this host serves a strict Content-Security-Policy that blocks every
   cross-origin request. The button cannot fetch Google's script or chooser.
2. Even if it could, verifying the returned ID token and holding a session
   requires a server — there is none on a static host.

So the gate substitutes a local step: type the account email, and it is checked
against the allow-list. Approved → in. Anything else → refused.

### The real thing already ships — in `server/`

This repository now contains that backend. It implements Google OAuth 2.0
(Authorization Code **+ PKCE**), verifies the ID token against Google's JWKS,
enforces the allow-list server-side on every request, and issues a signed
HttpOnly session cookie. It serves the site publicly and protects the settings
endpoints (`/auth/*`, `/api/settings`).

Setup and deployment: `server/README.md`.

Prefer a hosted backend instead? Set `authMode: "supabase"` and sign-in runs
through Supabase Auth with the allow-list enforced by Postgres RLS — see
`supabase/README.md`. The two are not exclusive: the backend also accepts a
Supabase access token, verified server-side.

To switch the front end over, edit `assets/auth.js`:

```js
authMode: "server",   // was "prototype"
apiBase: "",          // "" = same origin, or the backend's origin
```

Until you do, the prototype gate runs and the allow-list lives in **two**
places — keep `assets/auth.js` → `allowedEmails` in sync with the server's
`ALLOWED_EMAILS`.

## Theme (light / dark)

A toggle sits in the header beside the settings cog. It starts from the system
preference, and once you use it your choice is remembered
(`localStorage["alderhouse.theme"]`).

Both themes come from one token set, so no colour is written twice:

- `assets/styles.css` → `:root` is light; `[data-theme="dark"]` re-tunes every
  colour token (18 of them). It is a re-tune, not an inversion: dark surfaces are
  warm near-black rather than black, borders are re-weighted so they read as
  structure without noise, media tints go muted, and the accent is lightened so
  it still works as text.
- `assets/theme.js` runs in `<head>`, so the attribute is set before the first
  paint and there is no flash of the wrong theme.
- Contrast is enforced by `server/test/design.test.js`, which reads both token
  blocks and computes WCAG ratios, so a later colour edit cannot quietly fall
  below AA.

```bash
node server/test/design.test.js
```

That suite also holds the house copy rules: no em or en dashes in anything
visible, at most one eyebrow per three sections, and at most one middle dot per
line. Those are the anti-template guards, and they fail the build rather than
being a matter of taste.

## Languages (English / Bahasa Indonesia)

A two-segment switch sits in the header (EN / ID) beside the theme toggle. The
choice is remembered (`localStorage["alderhouse.lang"]`), and `<html lang>` is
set to `en` or `id` to match, so screen readers and translation tools follow it.

How it works, given there is no build step:

- **English is the source of truth** in the markup. `assets/i18n.js` maps each
  English string to its Indonesian equivalent; `assets/i18n-content.js` adds the
  runtime strings app.js builds plus the content map for listings, members,
  events, recipes and categories.
- `assets/lang.js` runs from `<head>`, so the language is settled before the
  first paint. It swaps matching text nodes and attributes (`placeholder`,
  `aria-label`, `title`, `alt`, the meta description and the document title),
  and stashes the originals so switching back is lossless.
- Anything without an entry stays in English, so a missing translation degrades
  quietly instead of breaking the page.
- Switching language re-renders the data-driven sections and re-applies the
  translation, so the market, calendar and family pages change over too.

```bash
node server/test/i18n.test.js
```

That suite guards the dictionary: no empty or duplicate entries, no orphan keys
that no longer exist in the source, a translation for every listing and member,
and a content map whose shape still matches `data.js`. Add a string to the site
without translating it and the suite tells you which one is missing.

## Motion and the graphic layer

The revamp went bold and graphic: a heavy display face, thick section rules,
hard offset shadows on hover, an oversized outlined word behind the hero, and
four moving parts.

| Moving part | Markup | Driven by |
|---|---|---|
| Scroll reveals | `[data-reveal]` | IntersectionObserver adds `.is-in` |
| Parallax layers | `[data-parallax="0.16"]` | rAF transform on scroll |
| Card hover physics | `[data-tilt]` | pointer move, fine pointers only |
| Marquee ticker | `.ticker-track` | CSS keyframes, filled by `initTicker()` |

Three rules it follows:

- **Opt-in, never opt-out.** Reveal content is only hidden once `motion.js` has
  confirmed motion is welcome (it sets `html[data-motion="on"]`). If the script
  is blocked or absent, everything renders visible. Hiding content behind a
  script that may never run is how sites go blank.
- **`prefers-reduced-motion` wins.** `motion.js` returns immediately and the
  stylesheet disables all four parts, so the page is fully static and complete.
- **No library.** The host's CSP blocks external scripts and there is no build
  step, so the engine is hand-written and dependency-free.

```bash
node server/test/motion.test.js
```

## Quality notes

- **Responsive:** 3 breakpoints — phone (<720), tablet (720–1023), desktop (≥1024).
  Grids collapse 3 → 2 → 1 column; the nav wraps instead of overflowing.
- **States:** loading, empty, error, populated, and edge (long titles, 0-result
  queries, very long descriptions) are all rendered.
- **Forms:** untouched / dirty / invalid-after-touched / invalid-after-submit /
  submitting / success; error summary with focus management; `aria-describedby`
  + `aria-invalid` + `role="alert"` wiring; values survive a failed submit.
- **Accessibility:** one `<h1>` per page, no skipped heading levels, landmarks
  (`header` / `nav` / `main` / `footer`), skip link, visible focus rings,
  44 px minimum button height, labelled inputs, `alt`/`aria-label` on media,
  `aria-live` status for the market result count.
- **No external assets:** everything is same-origin; the site makes no network
  request at runtime.
- **Reduced motion:** the skeleton shimmer and smooth scrolling are disabled
  under `prefers-reduced-motion`.

## Known limits

- Money, messaging, and pickup are offline by design — the site connects people.
- Listings live in a JS file; there is no backend. Posting a listing shows a
  success state but does not persist (there is nowhere to persist to on a static
  host).
- Placeholder media stands in for photographs; see the swap note above.
