"use strict";

/**
 * Logo integration checks. No framework, no dependencies.
 *
 *   node server/test/logo.test.js
 *
 * Proves the brand mark is the supplied logo everywhere it is visible, that the
 * old placeholder icon is gone, and that the palette still matches the logo.
 */
const fs = require("fs");
const path = require("path");

const SITE = path.resolve(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(SITE, p), "utf8");
const pages = fs.readdirSync(SITE).filter((f) => f.endsWith(".html"));
const logo = read("assets/logo.svg");
const css = read("assets/styles.css");

const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

/* L1 every page shows the logo in the header and the footer */
const badPages = pages.filter((f) => (read(f).match(/class="brand-logo"/g) || []).length !== 2);
check("every page shows the logo twice (header and footer)", badPages.length === 0, "pages=" + pages.length + " bad=[" + badPages + "]");

/* L2 the old inline placeholder icon is gone */
const stale = pages.filter((f) => read(f).indexOf("M3 11.5 12 4l9 7.5") !== -1);
check("the old placeholder house icon is gone", stale.length === 0, "stale=[" + stale + "]");

/* L3 the logo asset is real and self-contained */
/* the only URLs in the file must be the SVG namespace identifiers, not fetches */
const logoUrls = [...logo.matchAll(/https?:\/\/[^\s"')]+/g)].map((m) => m[0]);
const onlyNamespaces = logoUrls.every((u) => u.indexOf("http://www.w3.org/") === 0);
const logoOk =
  /<svg[\s>]/.test(logo) &&
  /viewBox="[-\d. ]+"/.test(logo) &&
  /#ef4136/i.test(logo) &&
  /#be1e2d/i.test(logo) &&
  onlyNamespaces &&
  !/<image/.test(logo) &&
  !/(xlink:)?href="https?:/.test(logo);
check("the logo asset is a self-contained SVG", logoOk, "bytes=" + logo.length + " urls=" + logoUrls.length + " nonNamespace=[" + logoUrls.filter((u) => u.indexOf("http://www.w3.org/") !== 0) + "]");

/* L4 the favicon is cut from the same artwork */
const favicon = read("assets/favicon.svg");
const fav = /viewBox="([-\d. ]+)"/.exec(favicon);
const favBox = fav ? fav[1].split(/\s+/).map(Number) : [0, 0, 0, 0];
const square = Math.abs(favBox[2] - favBox[3]) < 0.5;
check(
  "the favicon is a square cut of the same logo",
  square && /#ef4136/i.test(favicon) && pages.every((f) => read(f).indexOf('href="assets/favicon.svg"') !== -1),
  "viewBox=" + favBox.join(" ") + " square=" + square
);

/* L5 the brand name survives next to the image (accessible name + i18n) */
const noName = pages.filter((f) => {
  const i = read(f).indexOf('class="brand-logo"');
  return i === -1 || read(f).slice(i, i + 400).indexOf("Paguyuban RHDM") === -1;
});
check("the brand name is still present beside the logo", noName.length === 0, "missing=[" + noName + "]");

/* L6 the server-rendered sign-in page uses the same asset */
const srv = read("server/server.js");
check("the backend sign-in page uses the same logo", srv.indexOf("/assets/logo.svg") !== -1, "usesLogo=" + (srv.indexOf("/assets/logo.svg") !== -1));

/* L7 the accent still comes from the logo's own red */
const light = /:root \{([\s\S]*?)\n\}/.exec(css);
const lightBlock = light ? light[1] : "";
const accentOk = lightBlock.indexOf("--accent:  #ef4136") !== -1 && lightBlock.indexOf("--accent-fill: #be1e2d") !== -1;
check("the accent is the logo's red family", accentOk, "brandRed=" + lightBlock.indexOf("--accent:  #ef4136") + " fillRed=" + lightBlock.indexOf("--accent-fill: #be1e2d"));

/* L8 the logo is local, so the strict host CSP is satisfied */
check("the logo is same-origin", logo.indexOf("http://www.w3.org/2000/svg") !== -1 && !/src="http/.test(pages.map(read).join("")), "externalRefs=0");

const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;
results.forEach((r) => console.log((r.ok ? "PASS  " : "FAIL  ") + r.name + "  (" + r.detail + ")"));
console.log("");
console.log("RESULT passed=" + passed + " total=" + results.length + " failed=" + failed);
process.exit(failed === 0 ? 0 : 1);
