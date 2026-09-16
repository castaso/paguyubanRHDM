# Alder House — build notes

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
│   ├── styles.css      All styling. Design tokens live in :root at the top.
│   ├── data.js         All content — listings, members, events, news, recipes
│   ├── app.js          Filtering, detail rendering, form validation, chrome
│   └── favicon.svg
└── README.md
```

## Run it

It is a static site. Either:

- **Double-click `index.html`**, or
- serve the folder: `python -m http.server 8000` then open `http://localhost:8000`.

There are no dependencies to install and no build command.

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
