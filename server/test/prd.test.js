"use strict";

/**
 * PRD consistency checks. No framework, no dependencies.
 *
 *   node server/test/prd.test.js
 *
 * The PRD drifted twice (a stale breakpoint, and a whole visual direction that
 * shipped undocumented). These checks make drift a failing test rather than
 * something a reader has to notice.
 */
const fs = require("fs");
const path = require("path");

const SITE = path.resolve(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(SITE, p), "utf8");
const prd = read("prd.md");

const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

/* 1. top-level sections numbered 1..N with no gap or repeat */
const sections = (prd.match(/^## (\d+)\./gm) || []).map((s) => Number(s.replace(/[^0-9]/g, "")));
const sectionsOk = sections.every((n, i) => n === i + 1);
check("sections are numbered 1..N sequentially", sectionsOk, "found=[" + sections.join(",") + "]");

/* 2. NFRs numbered sequentially */
const nfrs = (prd.match(/\*\*NFR(\d+)/g) || []).map((s) => Number(s.replace(/\D/g, "")));
const seen = new Set(nfrs);
const nfrOk = nfrs.length > 0 && [...seen].sort((a, b) => a - b).every((n, i) => n === i + 1) && nfrs.length === seen.size;
check("NFRs are numbered 1..N sequentially", nfrOk, "nfrCount=" + nfrs.length + " unique=" + seen.size);

/* 3. functional modules numbered sequentially */
const mods = (prd.match(/^### M(\d+)/gm) || []).map((s) => Number(s.replace(/\D/g, "")));
const modOk = mods.length > 0 && mods.every((n, i) => n === i + 1);
check("modules are numbered M1..Mn sequentially", modOk, "found=[" + mods.join(",") + "]");

/* 4. no stale values from earlier revisions */
const stale = [];
if (/Alder House|alderhouse\./.test(prd)) stale.push("old brand");
if (/below 860px|max-width: 860px/.test(prd)) stale.push("old nav breakpoint 860");
if (/Iowan|Palatino|Georgia/.test(prd)) stale.push("dropped serif face");
check("no stale brand, breakpoint or typeface values", stale.length === 0, "stale=[" + stale + "]");

/* 5. every shipped feature is documented */
const needles = {
  "brand rename": "Paguyuban RHDM",
  "visual direction": "bold and graphic",
  "accent token: brand": "#ef4136",
  "accent token: dark": "#ff6b5a",
  "accent token: text": "#be1e2d",
  "logo asset": "logo.svg",
  "favicon": "favicon.svg",
  "display typeface": "Arial Black",
  "ticker": "ticker",
  "scroll reveals": "reveal",
  "parallax": "parallax",
  "hover physics": "hover physics",
  "reduced motion": "prefers-reduced-motion",
  "mobile drawer": "drawer",
  "hamburger": "hamburger",
  "nav breakpoint": "1024px",
  "theming": "NFR8",
  "languages": "NFR9",
  "motion": "NFR10",
  "responsive nav": "NFR11",
  "RBAC": "RBAC",
  "supabase": "upabase",
  "admin-only selling": "admins only",
  "no external assets": "No external assets"
};
const missing = Object.keys(needles).filter((k) => prd.indexOf(needles[k]) === -1);
check("every shipped feature is documented", missing.length === 0, "missing=[" + missing + "]");

/* 6. files named in the PRD actually exist */
const named = [...new Set((prd.match(/`(assets\/[a-z0-9-]+\.(?:js|css)|server\/test\/[a-z0-9-]+\.test\.js|supabase\/[a-z0-9-]+\.(?:sql|md))`/g) || []).map((s) => s.replace(/`/g, "")))];
const gone = named.filter((f) => !fs.existsSync(path.join(SITE, f)));
check("every file the PRD names exists", gone.length === 0, "named=" + named.length + " missing=[" + gone + "]");

/* 7. the delivery section lists the current test suites */
const delivery = prd.slice(prd.indexOf("## 14. Delivery"));
const suitesOnDisk = fs.readdirSync(path.join(SITE, "server", "test")).filter((f) => f.endsWith(".test.js"));
const unlisted = suitesOnDisk.filter((f) => delivery.indexOf(f) === -1);
check("the delivery section lists every test suite", unlisted.length === 0, "onDisk=" + suitesOnDisk.length + " unlisted=[" + unlisted + "]");

const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;
results.forEach((r) => console.log((r.ok ? "PASS  " : "FAIL  ") + r.name + "  (" + r.detail + ")"));
console.log("");
console.log("RESULT passed=" + passed + " total=" + results.length + " failed=" + failed);
process.exit(failed === 0 ? 0 : 1);
