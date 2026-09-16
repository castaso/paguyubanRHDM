"use strict";

/**
 * Bilingual checks. No framework, no dependencies.
 *
 *   node server/test/i18n.test.js
 *
 * Verifies the language layer rather than trusting it:
 *   1. no duplicate or empty dictionary entries
 *   2. every dictionary key is actually present in the site source (no orphans)
 *   3. the content map covers every record, with the same shapes
 *   4. the switcher is wired into all 7 pages, before the other scripts
 *   5. lang.js drives <html lang> and persists the choice
 */
const fs = require("fs");
const path = require("path");

const SITE = path.resolve(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(SITE, p), "utf8");

function loadInto(win, files) {
  files.forEach((f) => {
    new Function("window", read(f))(win);
  });
  return win;
}

const w = {};
loadInto(w, ["assets/data.js", "assets/i18n.js", "assets/i18n-content.js"]);
const DATA = w.ALDER;
const DICT = (w.ALDER_I18N && w.ALDER_I18N.id) || {};
const CONTENT = (w.ALDER_I18N_CONTENT && w.ALDER_I18N_CONTENT.id) || {};

const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

/* ── 1. dictionary hygiene ───────────────────────────────────────────── */
const keys = Object.keys(DICT);
const empty = keys.filter((k) => !String(DICT[k] || "").trim());
check("no empty translations", empty.length === 0, "entries=" + keys.length + " empty=[" + empty.slice(0, 5) + "]");

/* duplicate object keys are silent in JS, so check the source text */
const sources = ["assets/i18n.js", "assets/i18n-content.js"].map(read).join("\n");
const literalKeys = (sources.match(/^\s*"([^"]+)"\s*:/gm) || []).map((l) => l.trim().replace(/^"|":$/g, ""));
const dupes = literalKeys.filter((k, i) => literalKeys.indexOf(k) !== i);
check("no duplicate dictionary keys", dupes.length === 0, "declared=" + literalKeys.length + " dupes=[" + [...new Set(dupes)].slice(0, 5) + "]");

/* ── 2. orphan check ─────────────────────────────────────────────────── */
const pageSource = fs
  .readdirSync(SITE)
  .filter((f) => f.endsWith(".html"))
  .map((f) => read(f))
  .join("\n");
const jsSource = ["assets/app.js", "assets/auth.js", "assets/lang.js", "assets/supabase-auth.js", "assets/data.js", "assets/i18n-content.js"]
  .map(read)
  .join("\n");
const haystack = pageSource + "\n" + jsSource;
const orphans = keys.filter((k) => haystack.indexOf(k) === -1);
check("every dictionary key appears in the source", orphans.length === 0, "orphans=[" + orphans.slice(0, 6) + "]");

/* ── 3. content coverage ─────────────────────────────────────────────── */
const C = CONTENT;

const missingListings = (DATA.listings || []).filter((l) => !C.listings || !C.listings[l.id]);
check("every listing has an Indonesian translation", missingListings.length === 0, "listings=" + (DATA.listings || []).length + " missing=[" + missingListings.slice(0, 4).map((l) => l.id) + "]");

const missingMembers = (DATA.members || []).filter((m) => !C.members || !C.members[m.name]);
check("every member has an Indonesian translation", missingMembers.length === 0, "members=" + (DATA.members || []).length + " missing=[" + missingMembers.slice(0, 4).map((m) => m.name) + "]");

const shapeErrors = [];
const SKIP_FIELDS = ["date", "posted", "minutes", "by", "author", "id", "price", "priceUnit", "tint"];
["events", "news", "recipes"].forEach((k) => {
  const a = DATA[k] || [];
  const b = C[k] || [];
  if (a.length !== b.length) shapeErrors.push(k + ":len " + a.length + "!=" + b.length);
  else {
    a.forEach((rec, i) => {
      Object.keys(rec).forEach((field) => {
        if (SKIP_FIELDS.indexOf(field) !== -1) return;
        if (typeof rec[field] === "string" && b[i][field] == null) shapeErrors.push(k + "[" + i + "]." + field);
      });
    });
  }
});
(DATA.listings || []).forEach((l) => {
  const t = C.listings[l.id];
  if (!t) return;
  if ((t.details || []).length !== l.details.length) shapeErrors.push(l.id + ".details");
  if ((t.tags || []).length !== l.tags.length) shapeErrors.push(l.id + ".tags");
  if (!t.title || !t.blurb) shapeErrors.push(l.id + ".text");
});
check("content map matches the data shapes", shapeErrors.length === 0, "problems=[" + shapeErrors.slice(0, 6) + "]");

/* ── 4. wiring ───────────────────────────────────────────────────────── */
const pages = fs.readdirSync(SITE).filter((f) => f.endsWith(".html"));
const notWired = pages.filter((f) => {
  const s = read(f);
  const i18n = s.indexOf("assets/i18n.js");
  const lang = s.indexOf("assets/lang.js");
  const theme = s.indexOf("assets/theme.js");
  return !(i18n > -1 && lang > i18n && theme > lang);
});
check("all pages load i18n then lang before the rest", notWired.length === 0, "pages=" + pages.length + " notWired=[" + notWired + "]");

/* ── 5. behaviour contract in lang.js ────────────────────────────────── */
const langSrc = read("assets/lang.js");
const conventions = {
  "sets html lang": /setAttribute\("lang"/.test(langSrc),
  "persists choice": /localStorage\.setItem\(KEY/.test(langSrc),
  "restores originals": /origText/.test(langSrc) && /origAttr/.test(langSrc),
  "swaps attributes": /placeholder/.test(langSrc) && /aria-label/.test(langSrc),
  "emits change event": /alder:langchange/.test(langSrc),
  "both languages offered": /"en"/.test(langSrc) && /"id"/.test(langSrc)
};
const broken = Object.keys(conventions).filter((k) => !conventions[k]);
check("lang.js implements the full contract", broken.length === 0, "missing=[" + broken + "]");

/* ── report ──────────────────────────────────────────────────────────── */
const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;
results.forEach((r) => console.log((r.ok ? "PASS  " : "FAIL  ") + r.name + "  (" + r.detail + ")"));
console.log("");
console.log("RESULT passed=" + passed + " total=" + results.length + " failed=" + failed);
console.log(
  "dictionary entries=" + keys.length +
    " | listings=" + (DATA.listings || []).length +
    " members=" + (DATA.members || []).length +
    " events=" + (DATA.events || []).length +
    " news=" + (DATA.news || []).length +
    " recipes=" + (DATA.recipes || []).length
);
process.exit(failed === 0 ? 0 : 1);
