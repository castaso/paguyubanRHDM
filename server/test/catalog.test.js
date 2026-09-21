"use strict";

/**
 * Catalog cog checks. No framework, no dependencies.
 *
 *   node server/test/catalog.test.js
 *
 * Proves the lowest-left marketplace cog exists, stays invisible until
 * hover, and can add / edit / delete listings (images, SKU, description).
 */
const fs = require("fs");
const path = require("path");

const SITE = path.resolve(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(SITE, p), "utf8");

const pages = fs.readdirSync(SITE).filter((f) => f.endsWith(".html"));
const css = read("assets/styles.css");
const catalog = read("assets/catalog.js");
const app = read("assets/app.js");

const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

const notWired = pages.filter((f) => {
  const s = read(f);
  const data = s.indexOf("assets/data.js");
  const cat = s.indexOf("assets/catalog.js");
  const appSrc = s.indexOf("assets/app.js");
  return !(data > -1 && cat > data && appSrc > cat);
});
check("every page loads catalog.js after data.js and before app.js", notWired.length === 0, "bad=[" + notWired + "]");

const cogBase = /\.catalog-cog \{[\s\S]*?opacity: 0;/.test(css);
const cogReveal = /\.catalog-cog:hover, \.catalog-cog:focus-visible, \.catalog-cog\[aria-expanded="true"\] \{[\s\S]*?opacity: 1;/.test(css);
const corner = /\.catalog-cog-wrap \{[\s\S]*?left: 14px;[\s\S]*?bottom: 14px;/.test(css);
check(
  "the catalog cog is transparent at rest, shown on intent, and pinned lowest-left",
  cogBase && cogReveal && corner,
  "atRest=" + cogBase + " onIntent=" + cogReveal + " corner=" + corner
);

const armedOk = /\.catalog-cog\[data-armed="true"\]/.test(css) && /data-armed/.test(catalog) && /hover: none/.test(catalog);
check("touch can reveal the catalog cog by tapping it", armedOk, "css=" + /\.catalog-cog\[data-armed="true"\]/.test(css) + " js=" + /data-armed/.test(catalog));

const fields = {
  sku: /name="sku"/.test(catalog),
  title: /name="title"/.test(catalog),
  description: /name="blurb"/.test(catalog),
  images: /type="file"/.test(catalog) && /accept="image\/\*"/.test(catalog),
  category: /name="category"/.test(catalog),
  price: /name="price"/.test(catalog)
};
const missingFields = Object.keys(fields).filter((k) => !fields[k]);
check("the catalog form covers SKU, title, description, images, category, price", missingFields.length === 0, "missing=[" + missingFields + "]");

const crud = /function upsert\(/.test(catalog) && /function remove\(/.test(catalog) && /Add a listing/.test(catalog) && /data-edit/.test(catalog) && /data-del/.test(catalog);
check("add, edit, and delete listings are implemented", crud, "upsert=" + /function upsert\(/.test(catalog) + " remove=" + /function remove\(/.test(catalog));

const persist = /alderhouse\.catalog\.v1/.test(catalog) && /localStorage\.setItem/.test(catalog);
check("catalog changes persist in localStorage", persist, "key=" + persist);

const gated = /isAdmin\(/.test(catalog) && /Sign in as an admin/.test(catalog);
check("catalog mutations require an admin session", gated, "gated=" + gated);

const media = /listingMedia\(/.test(app) && /l\.image/.test(app) && /l\.sku/.test(app);
check("market cards and listing detail render SKU and photos", media, "media=" + media);

const libHits = (catalog.match(/https?:\/\//g) || []).length + (catalog.match(/\b(import|require)\s*\(/g) || []).length;
check("catalog adds no library and no cross-origin request", libHits === 0, "libHits=" + libHits);

const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;
results.forEach((r) => console.log((r.ok ? "PASS  " : "FAIL  ") + r.name + "  (" + r.detail + ")"));
console.log("");
console.log("RESULT passed=" + passed + " total=" + results.length + " failed=" + failed);
process.exit(failed === 0 ? 0 : 1);
