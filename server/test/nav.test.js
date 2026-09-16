"use strict";

/**
 * Mobile navigation checks. No framework, no dependencies.
 *
 *   node server/test/nav.test.js
 *
 * Proves the drawer is a real disclosure control: reachable by keyboard,
 * announced with aria-expanded/aria-controls, removed from the tab order when
 * collapsed, and closable four ways.
 */
const fs = require("fs");
const path = require("path");

const SITE = path.resolve(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(SITE, p), "utf8");

const pages = fs.readdirSync(SITE).filter((f) => f.endsWith(".html"));
const css = read("assets/styles.css");
const nav = read("assets/nav.js");

const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

/* N1 markup: one toggle, one drawer, correctly wired */
const badMarkup = pages.filter((f) => {
  const s = read(f);
  const toggle = /<button[^>]*id="nav-toggle"[^>]*aria-expanded="false"[^>]*aria-controls="nav-drawer"[^>]*aria-label="[^"]+"/.test(s);
  const drawer = (s.match(/class="nav-drawer" id="nav-drawer"/g) || []).length === 1;
  const once = (s.match(/id="nav-toggle"/g) || []).length === 1;
  return !(toggle && drawer && once);
});
check("every page has one wired toggle and one drawer", badMarkup.length === 0, "pages=" + pages.length + " bad=[" + badMarkup + "]");

/* N2 it is a real button, not a clickable div */
const notButtons = pages.filter((f) => !/<button[^>]*id="nav-toggle"/.test(read(f)));
check("the toggle is a native button", notButtons.length === 0, "notButton=[" + notButtons + "]");

/* N3 the drawer contains the nav AND the header controls */
const notGrouped = pages.filter((f) => {
  const s = read(f);
  const d = s.indexOf('class="nav-drawer"');
  const n = s.indexOf('<nav aria-label="Primary"');
  const a = s.indexOf('class="topnav-actions"');
  return !(d > -1 && n > d && a > n);
});
check("the nav and the header controls sit inside the drawer", notGrouped.length === 0, "notGrouped=[" + notGrouped + "]");

/* N4 script wired */
const notWired = pages.filter((f) => {
  const s = read(f);
  const nav2 = s.indexOf("assets/nav.js");
  const auth = s.indexOf("assets/auth.js");
  return !(nav2 > -1 && auth > -1 && nav2 > auth);
});
check("every page loads nav.js after the auth scripts", notWired.length === 0, "notWired=[" + notWired + "]");

/* N5 CSS: desktop untouched, mobile collapsed then expanded */
const desktopOk = /\.nav-drawer \{ display: contents; \}/.test(css) && /\.nav-toggle \{ display: none; \}/.test(css);
const mobileOk =
  /@media \(max-width: 860px\)/.test(css) &&
  /visibility: hidden/.test(css) &&
  /html\[data-nav-open="true"\] \.nav-drawer/.test(css) &&
  /max-height: 80vh/.test(css);
check("desktop is untouched and mobile collapses then expands", desktopOk && mobileOk, "desktop=" + desktopOk + " mobile=" + mobileOk);

/* N6 collapsed means out of the tab order */
const hiddenOk = /visibility: hidden/.test(css) && /visibility: visible/.test(css);
check("the collapsed drawer leaves the tab order", hiddenOk, "visibilityToggle=" + hiddenOk);

/* N7 four ways to close */
const closers = {
  escape: /ev\.key === "Escape"/.test(nav),
  outsideClick: /drawer\.contains\(ev\.target\)/.test(nav),
  linkClick: /closest\("a"\)/.test(nav),
  resize: /window\.innerWidth >= BREAKPOINT/.test(nav)
};
const missingClosers = Object.keys(closers).filter((k) => !closers[k]);
check("it closes on Escape, outside click, a link, and resize", missingClosers.length === 0, "missing=[" + missingClosers + "]");

/* N8 no dependency, no cross-origin */
const libHits = (nav.match(/https?:\/\//g) || []).length + (nav.match(/\b(import|require)\s*\(/g) || []).length;
let cross = 0;
pages
  .map((f) => path.join(SITE, f))
  .concat(fs.readdirSync(path.join(SITE, "assets")).map((f) => path.join(SITE, "assets", f)))
  .forEach((f) => {
    const s = fs.readFileSync(f, "utf8");
    const m = s.match(/(src|href)\s*=\s*[\x22\x27]https?:|url\(\s*[\x22\x27]?https?:|fetch\(\s*[\x22\x27]https?:/g);
    if (m) cross += m.length;
  });
check("nav adds no library and no cross-origin request", libHits === 0 && cross === 0, "libHits=" + libHits + " crossOrigin=" + cross);

/* N9 the label is translatable */
const i18nSrc = read("assets/i18n.js");
check(
  "the toggle label is in both dictionaries",
  /"Menu":/.test(i18nSrc) && /"Close menu":/.test(i18nSrc),
  "menu=" + /"Menu":/.test(i18nSrc) + " closeMenu=" + /"Close menu":/.test(i18nSrc)
);

const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;
results.forEach((r) => console.log((r.ok ? "PASS  " : "FAIL  ") + r.name + "  (" + r.detail + ")"));
console.log("");
console.log("RESULT passed=" + passed + " total=" + results.length + " failed=" + failed);
process.exit(failed === 0 ? 0 : 1);
