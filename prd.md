# PRD — Paguyuban RHDM

**A family website with marketplace capabilities**
Version 1.0 · 2026-09-16 · Owner: Paguyuban RHDM (family admin)

---

## 1. Summary

**Paguyuban RHDM** is a private-leaning family website that does two jobs at once:

1. **Family hub** — news, photo albums, a member directory, an events calendar,
   and a shared recipe box. The place relatives actually check in.
2. **Family marketplace** — a lightweight storefront where relatives list and
   find things: handmade goods, second-hand items, services, home-grown
   produce, borrowable gear, and digital files.

The marketplace is a *capability of the family site*, not a separate store. A
cousin selling hand-knit socks and a grandmother posting egg availability live
in the same place the family reads news and remembers birthdays.

**One-line pitch:** "Everything the Alders make, swap, and celebrate — in one
place."

---

## 2. Problem & context

Extended families coordinate across a scatter of chat threads, photo dumps, and
spreadsheets. Practical, low-stakes exchange between relatives — who has a
trailer to lend, who is selling a table, who has surplus tomatoes, who teaches
guitar — happens ad hoc and gets lost.

Existing options don't fit:
- **Group chats** are chronological and forgettable; nothing is findable a week later.
- **Public marketplaces** (eBay, Facebook Marketplace) are wrong-audience, fee-laden, and public.
- **A full e-commerce platform** is overkill for a family that trades ten things a month.

Paguyuban RHDM is the middle path: a familiar, warm family site where the market
is just another room in the house.

---

## 3. Goals & non-goals

### Goals
- G1 — Give the family a single, always-current home for news, photos, and dates.
- G2 — Make listing an item or service take under two minutes.
- G3 — Make finding something (browse, filter, search) instant and obvious.
- G4 — Feel personal and warm, not corporate or template-generic.
- G5 — Be fast, accessible, and readable on a phone at the kitchen table.

### Non-goals (v1)
- Real payments, checkout, or shipping. Money changes hands offline; the site
  connects people, it does not process transactions.
- Public sign-up, bidding, ratings, or dispute handling.
- Native mobile apps.
- Server-side accounts, private data, or per-user permissions.

---

## 4. Users & personas

| Persona | Who | Primary need | Key surface |
|---|---|---|---|
| **The Organiser** (site admin) | Usually a middle-generation relative | Keep everything current, post news, wrangle events | Home, Family, Events |
| **The Seller** | Any relative with something to sell, lend, or make | List quickly and be found | Sell form, my listings |
| **The Browser** | A relative looking for a thing | Find it fast without wading through noise | Market, Listing detail |
| **The Lurker** | Less-active relative | Catch up on news + photos in one scroll | Home, Family |

**Primary audience:** extended relatives (multiple households, several
generations). **Secondary:** invited friends of the family.

---

## 5. Scope — modules

| # | Module | Required in v1 | Notes |
|---|---|---|---|
| M1 | Home hub | Yes | News feed, upcoming events, featured listings, quick counts |
| M2 | Marketplace browse | Yes | Grid, category filter, search, sort |
| M3 | Listing detail | Yes | Photos area, price, seller, description, contact/reserve |
| M4 | Post a listing | Yes — **admins only** | Validated form, category, price, condition/availability |
| M5 | Family | Yes | Photo albums, member directory, recipe box |
| M6 | Events | Yes | List + month grouping, RSVP counts |
| M7 | About | Yes | How the market works, house rules, contact |
| M8 | Access control + sign-in | Yes | Settings cog, RBAC allow-list, three sign-in modes (prototype / Supabase / server) |
| M9 | Profiles | Yes | Member profiles, profile detail, family notebook showcase |
| M10 | Message board | Deferred | v2 |
| M11 | Family tree | Deferred | v2 (interactive) |

---

## 6. Information architecture

```
Home (hub)
├── Market ──▶ Listing detail
│   └── Sell something (listing form)
├── Family  (news · albums · directory · recipes)
├── Calendar (events)
├── Gallery
├── Profiles ──▶ Profile detail
│   └── Family notebook (opens in Google Notebook)
└── About   (how it works · house rules)
```

**Global chrome:** sticky top nav (Home · Market · Family · Calendar · Gallery ·
Profiles · About) and a four-column footer present on every page. Every page
reachable in one tap from anywhere.

---

## 7. Functional requirements

### M1 — Home hub
- **FR1.1** Hero names the site and the one-line pitch.
- **FR1.2** "Latest from the family" shows the 3 most recent news items.
- **FR1.3** "Coming up" shows the next 3 events with date and place.
- **FR1.4** "Fresh in the market" shows 3 newest listings with price and seller.
- **FR1.5** Quick counts (listings, members, events) are **honest counts of the
  live mock data**, never invented marketing numbers.

### M2 — Marketplace browse
- **FR2.1** Responsive card grid: 1 col (phone) → 2 (tablet) → 3 (desktop).
- **FR2.2** Category filter chips: All, Handmade, Second-hand, Services,
  Produce, Rentals, Digital.
- **FR2.3** Free-text search across title, seller, place, and tags.
- **FR2.4** Sort: Newest, Price low→high, Price high→low.
- **FR2.5** Result count updates live and is announced politely.
- **FR2.6** The filter/search state is shareable via the URL query string.

### M3 — Listing detail
- **FR3.1** Read `?id=` from the URL; render the matching listing.
- **FR3.2** Show title, price (or "Free / borrow"), category, condition,
  location, seller, posted date, full description, tags.
- **FR3.3** Primary action: "Message <seller>" (offline hand-off in v1).
  Secondary: "Save".
- **FR3.4** Unknown or missing `id` renders a proper not-found state with a
  route back to the market.

### M4 — Post a listing
- **FR4.0** Restricted to admins: the market is public to browse, but creating
  and managing listings is limited to the two allow-listed admin accounts. There
  is no public "Sell something" entry point; the page is gated client-side and
  the backend refuses `/sell.html` without an admin session.
- **FR4.1** Fields: title (required, 3–70), category (required), price
  (required, ≥0 or "free/borrow"), condition, location, description
  (required, 20–600).
- **FR4.2** Validate on blur; re-validate on input once invalid; never on first keystroke.
- **FR4.3** On submit with errors: an error summary appears at the top, focus
  moves to it, each field is linked to its message via `aria-describedby`.
- **FR4.4** On success: a confirmation state that preserves what was entered and
  offers "View in market".
- **FR4.5** Never clear the form when submission fails.

### M5 — Family
- **FR5.1** Photo album grid with cover, title, and count.
- **FR5.2** Member directory: name, branch, place, role. Each card links to that
  member's profile.
- **FR5.3** Recipe box: title, by, time, tags, short note.

### M6 — Events
- **FR6.1** Events grouped by upcoming month with date, title, place, type.
- **FR6.2** RSVP counts shown; the CTA is an offline hand-off ("Say you're going").
- **FR6.3** An empty month renders an honest empty state, not a blank.

### M7 — About
- **FR7.1** Explain the marketplace model (family-first, no fees, money offline).
- **FR7.2** House rules: be kind, describe honestly, respond within a week,
  no outside reselling.
- **FR7.3** Contact path for the organiser.

### M8 — Access control (RBAC) + sign-in
- **FR8.1** The site itself is **public** — no page is hidden. Sign-in is offered
  only from the settings cog, and it guards the settings area, not the content.
- **FR8.2** Sign-in is presented as **Sign in with Google**. The allow-list is
  exactly: `paguyubanRHDM@gmail.com`, `castasoft@gmail.com`.
- **FR8.3** Any other account is refused with a message that names the RBAC rule.
- **FR8.4** A **settings control sits at the top-right of the header and is
  invisible until hovered, focused, or opened.** The panel shows the sign-in step
  when signed out, and the account, allow-list, enforcement note, and Sign out
  when signed in.
- **FR8.5** Session persists across pages and reloads; Sign out returns the panel
  to the sign-in step.
- **FR8.6** Sign-in is provider-pluggable, chosen by `assets/auth.js` →
  `authMode`:
  - `supabase` — **Supabase Auth** with the Google provider, via a
    zero-dependency REST client (`assets/supabase-auth.js`); the allow-list is
    enforced by **Postgres row level security** (`supabase/schema.sql`).
  - `server` — the Node backend in `server/`: Google OAuth 2.0 (Authorization
    Code + PKCE), ID-token verification against Google's JWKS, server-enforced
    RBAC on every request, signed HttpOnly session cookie.
- **FR8.7 (constraint)** On the **static preview channel only**, the gate
  necessarily falls back to the browser-side prototype, because that host has no
  server and its CSP blocks Google's and Supabase's origins. The prototype is
  labelled as such on screen and in `assets/auth.js`.

### M9 — Profiles
- **FR9.1** A Profiles page lists every member as a card (name, branch, place,
  role) and links each card to `profiles.html?id=<member-id>`.
- **FR9.2** The page showcases the family notebook at
  `https://notebook.google.com/notebook/2983b39b-e5cd-41e3-9b9f-e0c2cede3f54`.
  The host CSP forbids embedding other origins (`X-Frame-Options: DENY`,
  `default-src 'self'`), so the notebook is a card that opens in a new tab
  rather than an iframe, the same contract as the Gallery.
- **FR9.3** Profile detail reads `?id=` from the URL and renders that member:
  bio, branch, place, their market listings, recipes, and recent posts.
- **FR9.4** Unknown or missing `id` renders a not-found state with a route back
  to Profiles.
- **FR9.5** Each profile links out to the same family notebook for the longer
  notes that do not live on the site.

---

## 8. States (every data surface)

Per the state-coverage rules, each fetching/transforming surface must render all
five. In v1 the "fetch" is a local data module with a simulated latency so the
states are real and demonstrable:

| State | Where it appears |
|---|---|
| Loading | Market grid shows skeleton cards while the data module resolves |
| Empty | Market with a filter/search that matches nothing — echoes the query, offers "Clear filters" |
| Error | Market and listing detail can surface a retry panel with cause + recovery |
| Populated | The default case everywhere |
| Edge | Very long titles/descriptions, missing optional fields, 0-result queries, extreme price ranges |

Form-specific states: untouched, dirty, invalid-after-touched,
invalid-after-submit, submitting, success.

---

## 9. Content model

```
Member  { id, name, branch, role, place, initials, tint, bio }
Listing { id, title, category, price, priceUnit, condition, seller,
          place, posted, blurb, details[], tags[], tint }
Event   { date, title, place, kind, note, going }
News    { date, title, author, tag, excerpt }
Recipe  { title, by, minutes, tags[], note }
```

Categories: `handmade · secondhand · services · produce · rentals · digital`.

---

## 10. Design direction and visual language

The look was refined twice: first to strip the generic template tells, then to
the direction chosen in the design interview, **bold and graphic** with bold
motion. It is recorded here because the look is part of the product, not
incidental styling.

**Palette.** Ink on pure white (`#ffffff`) with the logo's red as the single
accent. Dark is near-black: `--bg` `#0b0b0b`, cards lifted to `#151515`. The
three accent roles stay separate tokens so contrast is measurable rather than
assumed:

| Token | Role | Light | Dark |
|---|---|---|---|
| `--accent` | brand and decoration | `#ef4136` | `#ff6b5a` |
| `--accent-fill` | accent behind light text | `#be1e2d` | `#ff6b5a` |
| `--accent-text` | accent used as text | `#be1e2d` | `#ff8f7a` |
| `--on-accent` | text sitting on a fill | `#fffdf7` | `#100e0c` |

The accent is taken from the logo itself, a red gradient running `#ef4136`
through `#be1e2d` to `#fbb040`. The logo is the source of truth for colour:
`assets/logo.svg` appears in the header and the footer of every page, and
`assets/favicon.svg` is a square cut of the same artwork.

**Type.** Display is a heavy grotesque (an Arial Black stack at weight 900 with
tight tracking) for graphic impact; body is the system sans; metadata is mono.
The v1 serif display face was dropped when the direction changed.

**Graphic devices.** 3px section rules, hard offset hover shadows, an oversized
outlined word behind the hero, a full-bleed ticker of live market items, and a
brand **pattern band** built from the logo's own gradient (`#ef4136` to
`#fbb040`) as a bold diagonal strip beneath the header.

The header and footer are **logo only**. The supplied logo spells the name, so
the text label was removed rather than repeated; the name now lives in the
image's `alt` text and the link's accessible name.

**Motion.** Four parts: scroll reveals, parallax layers, card hover physics
(tilt), and the marquee ticker. All hand-written with no library, because the
host CSP blocks external scripts and there is no build step. Two rules hold it
together: reveals are opt-in (content is hidden only once a script confirms
motion is welcome, so a blocked script cannot blank the page) and
`prefers-reduced-motion` disables all four.

**Enforcement.** `server/test/design.test.js` computes WCAG contrast from the
real token values in both themes and fails if any of 18 pairs drops below AA;
`server/test/motion.test.js` asserts the four parts exist, that reduced motion
disables them, and that no dependency or cross-origin request was added.

## 11. Non-functional requirements

- **NFR1 Hosting** — pure static output. No server runtime, no API, no database.
- **NFR2 No external assets** — strict CSP at the host blocks every cross-origin
  fetch, so fonts, icons, imagery, and scripts must all be same-origin. Nothing
  in the shipped site requests another origin.
- **NFR3 Responsive** — three breakpoints: phone (<768), tablet (768–1023),
  desktop (≥1024). No fixed-width page shells.
- **NFR4 Accessibility** — WCAG 2.2 AA target: body contrast ≥4.5:1, one `<h1>`
  per page, no skipped heading levels, landmarks, visible focus rings, labelled
  inputs, `role="alert"` on inline errors, 24×24 CSS px minimum targets.
- **NFR5 Performance** — no render-blocking remote requests; first paint is
  local-only.
- **NFR6 Language** — site copy in English; `lang="en"` on every document.
- **NFR7 Compatibility** — works with JavaScript disabled for reading surfaces
  (content is in the HTML); the market's interactive filtering degrades to the
  full list.

---

- **NFR8** Theming - light and dark themes cut from one token set, a header
  toggle that persists the choice, system preference as the default, and WCAG AA
  contrast in both. No section flips theme mid-page. Enforced by
  `server/test/design.test.js`.

- **NFR9** Languages - English and Bahasa Indonesia, switched from the header,
  persisted, and reflected in `<html lang>`. Interface and content are both
  translated; a missing translation degrades to English rather than breaking a
  page. Enforced by `server/test/i18n.test.js`.

- **NFR10** Motion - bold motion is part of the design: scroll reveals,
  parallax, card hover physics and a marquee ticker. It is opt-in (content is
  hidden only once a script confirms motion is welcome), it yields entirely to
  `prefers-reduced-motion`, and it adds no library. Enforced by
  `server/test/motion.test.js`.

- **NFR11** Responsive navigation - below 1024px the nav and header controls
  collapse into a drawer behind a hamburger that expands on click. It is a
  native button with `aria-expanded` and `aria-controls`, leaves the tab order
  when collapsed, and closes on Escape, outside click, link choice or resize.
  Desktop layout is unchanged. Enforced by `server/test/nav.test.js`.

## 12. Success signals (v1, qualitative)

- A relative can list an item in under two minutes without instructions.
- A visitor can reach any listing in ≤2 taps from the home page.
- The site reads as *this family's* site, not a template (verified by the
  "could a stranger identify it?" test).
- No accessibility blocker on the primary flows.

---

## 13. Out of scope / next

**Deferred to v2:** message board, interactive family tree, real accounts,
saved-search alerts, image upload (v1 uses tinted placeholder media),
notification emails.

**Known constraint — money and messaging are offline.** The site's job is
discovery and connection.

**Known constraint — where access control is enforced.** Real enforcement lives
in one of two places: the backend under `server/` (Google OAuth + a verified ID
token + a signed session + the allow-list checked on every request), or
Supabase — where the **`allowed_emails` table plus Postgres RLS** is the
referee. The **static preview channel can run neither**: its CSP blocks
Google's and Supabase's origins, so on that channel the gate degrades to the
browser-side prototype in `assets/auth.js`, which is bypassable and labelled as
such. Deploying with `authMode: "supabase"` or `"server"` closes that gap.
This is a deliberate, labelled split — not an oversight.

---

## 14. Delivery

Static site served from the managed nginx static host.
Entry point: `index.html`. Pages: `index`, `marketplace`, `listing`, `sell`,
`family`, `events`, `gallery`, `profiles`, `about`. Shared: `assets/styles.css`, `assets/app.js`,
`assets/data.js`, `assets/theme.js`, `assets/lang.js`, `assets/i18n.js`,
`assets/i18n-content.js`, `assets/motion.js`, `assets/nav.js`, `assets/auth.js`,
`assets/supabase-auth.js`, `assets/logo.svg`, `assets/favicon.svg`. Tests: `server/test/api.test.js`,
`server/test/design.test.js`, `server/test/i18n.test.js`,
`server/test/motion.test.js`, `server/test/nav.test.js`,
`server/test/logo.test.js`, `server/test/gallery.test.js`,
`server/test/profiles.test.js`,
`server/test/prd.test.js`.
