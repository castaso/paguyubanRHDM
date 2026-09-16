"use strict";

/**
 * Design pre-flight + theme tests. No framework, no dependencies.
 *
 *   node server/test/design.test.js
 *
 * Enforces the taste-skill hard bans and the two-theme invariants:
 *   1. every hex colour token in :root is re-tuned for dark
 *   2. WCAG AA contrast (>= 4.5:1) for body/UI pairs in BOTH themes
 *   3. no em dash or en dash anywhere user-visible
 *   4. eyebrow restraint: at most ceil(sections / 3) per page
 *   5. middle-dot rationing: at most one per visible line
 */
const fs = require("fs");
const path = require("path");

const SITE = path.resolve(__dirname, "..", "..");
const CSS = fs.readFileSync(path.join(SITE, "assets", "styles.css"), "utf8");
const htmlFiles = fs.readdirSync(SITE).filter((f) => f.endsWith(".html"));

const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

/* ── 1 + 2. tokens and contrast ──────────────────────────────────────── */
function block(source, opener) {
  const start = source.indexOf(opener);
  if (start === -1) return "";
  const from = start + opener.length;
  const end = source.indexOf("\n}", from);
  return source.slice(from, end === -1 ? source.length : end);
}

function tokens(source) {
  const map = {};
  const re = /--([a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m;
  while ((m = re.exec(source))) map[m[1]] = m[2].trim();
  return map;
}

const light = tokens(block(CSS, ":root {"));
const dark = tokens(block(CSS, 'html[data-theme="dark"] {'));

const hexTokens = Object.keys(light).filter((k) => /^#[0-9a-f]{3,8}$/i.test(light[k]));
const missing = hexTokens.filter((k) => !dark[k]);
check(
  "every hex colour token is re-tuned for dark",
  missing.length === 0,
  "hexTokens=" + hexTokens.length + " missing=[" + missing.join(",") + "]"
);

function srgb(c) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function luminance(hex) {
  let h = String(hex).trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}
function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

const PAIRS = [
  ["fg", "bg"],
  ["muted", "bg"],
  ["fg", "surface"],
  ["muted", "surface"],
  ["accent-text", "bg"],
  ["accent-text", "surface"],
  ["on-accent", "accent-fill"],
  ["danger", "surface"],
  ["success", "surface"],
];

function auditTheme(map, label) {
  const fails = [];
  PAIRS.forEach(([fgTok, bgTok]) => {
    const fg = map[fgTok];
    const bg = map[bgTok];
    if (!fg || !bg || !/^#/.test(fg) || !/^#/.test(bg)) {
      fails.push(`${fgTok}/${bgTok}:unresolved`);
      return;
    }
    const ratio = contrast(fg, bg);
    if (ratio < 4.5) fails.push(`${fgTok}/${bgTok}=${ratio.toFixed(2)}`);
  });
  return { label, fails, pairs: PAIRS.length };
}

const themes = [auditTheme(light, "light"), auditTheme(dark, "dark")];
const contrastFails = themes.flatMap((t) => t.fails.map((f) => `${t.label}:${f}`));
check(
  "WCAG AA contrast in both themes",
  contrastFails.length === 0,
  `${themes.reduce((n, t) => n + t.pairs, 0)} pairs checked; failures=[${contrastFails.join(",")}]`
);

/* ── 3. dash ban ─────────────────────────────────────────────────────── */
const DASH = /[\u2013\u2014]/;

function stripHtml(s) {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
}
function stripCss(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, " ");
}
function stripJsComments(s) {
  return s
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join("\n");
}

const dashHits = [];
htmlFiles.forEach((f) => {
  const body = stripHtml(fs.readFileSync(path.join(SITE, f), "utf8"));
  if (DASH.test(body)) {
    body.split("\n").forEach((line, i) => {
      if (DASH.test(line)) dashHits.push(`${f}:${i + 1}`);
    });
  }
});
["app.js", "auth.js", "theme.js", "supabase-auth.js", "data.js", "lang.js", "i18n.js", "i18n-content.js", "motion.js"].forEach((f) => {
  const p = path.join(SITE, "assets", f);
  if (!fs.existsSync(p)) return;
  const body = stripJsComments(fs.readFileSync(p, "utf8"));
  body.split("\n").forEach((line, i) => {
    if (DASH.test(line)) dashHits.push(`assets/${f}:${i + 1}`);
  });
});
check("no em dash or en dash in user-visible text", dashHits.length === 0, "hits=[" + dashHits.slice(0, 8).join(",") + "]");

/* ── 4. eyebrow restraint ────────────────────────────────────────────── */
const eyebrowFails = [];
htmlFiles.forEach((f) => {
  const s = stripHtml(fs.readFileSync(path.join(SITE, f), "utf8"));
  const sections = (s.match(/<section/g) || []).length;
  const eyebrows = (s.match(/class="eyebrow"/g) || []).length;
  const allowed = Math.ceil(sections / 3);
  if (eyebrows > allowed) eyebrowFails.push(`${f}(${eyebrows}>${allowed})`);
});
check("eyebrow restraint: <= ceil(sections/3) per page", eyebrowFails.length === 0, "violations=[" + eyebrowFails.join(",") + "]");

/* ── 5. middle-dot rationing ─────────────────────────────────────────── */
const dotFails = [];
htmlFiles.forEach((f) => {
  const body = stripHtml(fs.readFileSync(path.join(SITE, f), "utf8"));
  body.split("\n").forEach((line, i) => {
    if ((line.match(/\u00b7/g) || []).length > 1) dotFails.push(`${f}:${i + 1}`);
  });
});
check("at most one middle dot per line", dotFails.length === 0, "hits=[" + dotFails.slice(0, 8).join(",") + "]");

/* ── report ──────────────────────────────────────────────────────────── */
const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;
results.forEach((r) => console.log((r.ok ? "PASS  " : "FAIL  ") + r.name + "  (" + r.detail + ")"));
console.log("");
console.log("RESULT passed=" + passed + " total=" + results.length + " failed=" + failed);
console.log(
  "theme tokens: light=" +
    Object.keys(light).length +
    " dark=" +
    Object.keys(dark).length +
    " | pages=" +
    htmlFiles.length
);
process.exit(failed === 0 ? 0 : 1);
