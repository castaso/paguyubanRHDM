"use strict";

/**
 * Motion checks. No framework, no dependencies.
 *
 *   node server/test/motion.test.js
 *
 * Proves the four requested moving parts exist, that they are safe when motion
 * is unwelcome, and that the layer adds no dependency or hidden content.
 */
const fs = require("fs");
const path = require("path");

const SITE = path.resolve(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(SITE, p), "utf8");

const pages = fs.readdirSync(SITE).filter((f) => f.endsWith(".html"));
const css = read("assets/styles.css");
const motion = read("assets/motion.js");
const app = read("assets/app.js");

const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

/* M1 wiring */
const notWired = pages.filter((f) => {
  const s = read(f);
  const a = s.indexOf("assets/auth.js");
  const m = s.indexOf("assets/motion.js");
  return !(m > -1 && a > -1 && m > a);
});
check("every page loads motion.js after the auth scripts", notWired.length === 0, "pages=" + pages.length + " notWired=[" + notWired + "]");

/* M2 the four moving parts */
const htmlAll = pages.map(read).join("\n");
const parts = {
  "scroll reveals": /data-reveal/.test(htmlAll) && /IntersectionObserver/.test(motion) && /\[data-reveal\]/.test(css),
  "parallax layers": /data-parallax/.test(htmlAll) && /data-parallax/.test(motion) && /\[data-parallax\]/.test(css),
  "hover physics": /data-tilt/.test(app) && /pointermove/.test(motion) && /\[data-tilt\]/.test(css) && /pointer: fine/.test(motion),
  "marquee ticker": /ticker-track/.test(htmlAll) && /ticker-slide/.test(css) && /initTicker/.test(app)
};
const missingParts = Object.keys(parts).filter((k) => !parts[k]);
check("all four requested moving parts are present", missingParts.length === 0, "missing=[" + missingParts + "]");

/* M3 reduced motion is honoured, in both the script and the stylesheet */
const reduceBlocks = [];
const reduceRe = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g;
let rm;
while ((rm = reduceRe.exec(css))) reduceBlocks.push(rm[1]);
const block = reduceBlocks.join("\n");
const covered = ["[data-reveal]", ".ticker-track", "[data-parallax]", "[data-tilt]"].filter((sel) => block.indexOf(sel) === -1);
check(
  "reduced-motion disables all four in CSS",
  reducedMotionOk(),
  "blocks=" + reduceBlocks.length + " cssUncovered=[" + covered + "] scriptGuard=" + /prefers-reduced-motion: reduce/.test(motion)
);
function reducedMotionOk() {
  return covered.length === 0 && /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/.test(motion) && /if \(reduceQuery && reduceQuery\.matches\) return;/.test(motion);
}

/* M4 no hidden content when the script never runs */
const scoped = /html\[data-motion="on"\] \[data-reveal\] \{[\s\S]*?opacity: 0/.test(css);
const unscoped = /\n\[data-reveal\] \{\s*opacity: 0/.test(css);
check("reveals only hide content once motion is confirmed", scoped && !unscoped, "scoped=" + scoped + " unscoped=" + unscoped);

/* M5 no dependency, no cross-origin */
const libHits = (motion.match(/https?:\/\//g) || []).length + (motion.match(/\b(import|require)\s*\(/g) || []).length;
const files = pages.map((f) => path.join(SITE, f)).concat(fs.readdirSync(path.join(SITE, "assets")).map((f) => path.join(SITE, "assets", f)));
let cross = 0;
files.forEach((f) => {
  const s = fs.readFileSync(f, "utf8");
  const m = s.match(/(src|href)\s*=\s*[\x22\x27]https?:|url\(\s*[\x22\x27]?https?:|fetch\(\s*[\x22\x27]https?:/g);
  if (m) cross += m.length;
});
check("motion adds no library and no cross-origin request", libHits === 0 && cross === 0, "libHits=" + libHits + " crossOrigin=" + cross);

/* M6 the ticker loops seamlessly */
check("ticker content is duplicated for a seamless loop", /items \+ items/.test(app), "duplicates=" + (/items \+ items/.test(app) ? "yes" : "no"));

/* M7 the gated page carries no reveals (its sections are hidden until sign-in) */
const sell = read("sell.html");
check("gated selling page has no reveal attributes", (sell.match(/data-reveal/g) || []).length === 0, "sellReveals=" + (sell.match(/data-reveal/g) || []).length);

/* report */
const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;
results.forEach((r) => console.log((r.ok ? "PASS  " : "FAIL  ") + r.name + "  (" + r.detail + ")"));
console.log("");
console.log("RESULT passed=" + passed + " total=" + results.length + " failed=" + failed);
process.exit(failed === 0 ? 0 : 1);
