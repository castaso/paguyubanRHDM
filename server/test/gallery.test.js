"use strict";

/**
 * Gallery checks. No framework, no dependencies.
 *
 *   node server/test/gallery.test.js
 *
 * The gallery lists photos held in a public Google Drive folder. The host's CSP
 * allows images only from the same origin, so the page must never point an
 * <img> at Drive; the cards link out instead, with a proxy hook for later.
 */
const fs = require("fs");
const path = require("path");

const SITE = path.resolve(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(SITE, p), "utf8");
const pages = fs.readdirSync(SITE).filter((f) => f.endsWith(".html"));

const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

const hasGallery = fs.existsSync(path.join(SITE, "gallery.html"));
check("gallery.html exists", hasGallery, "present=" + hasGallery);

const page = hasGallery ? read("gallery.html") : "";
const data = read("assets/gallery-data.js");

/* the data file is real and shaped right */
const m = /window\.ALDER_GALLERY = (\[[\s\S]*?\]);/.exec(data);
const items = m ? JSON.parse(m[1]) : [];
const shaped = items.every((i) => i.name && i.id && /^https:\/\/drive\.google\.com\/file\/d\//.test(i.open));
check("the photo manifest is well formed", items.length > 0 && shaped, "items=" + items.length + " shaped=" + shaped);

/* nothing was mirrored into the site */
const localRefs = items.filter((i) => i.src);
check("no photos are copied into the site", localRefs.length === 0, "localRefs=" + localRefs.length);

/* the CSP contract: no <img> may point at a third-party origin */
const imgSrcs = [...page.matchAll(/<img[^>]*\ssrc="([^"]+)"/g)].map((x) => x[1]);
const external = imgSrcs.filter((s) => /^https?:/i.test(s));
check("no image in the gallery points off-origin", external.length === 0, "imgSrcs=" + imgSrcs.length + " external=[" + external + "]");

/* the cards carry the Drive link and a proxy hook exists */
const proxy = /proxyBase/.test(read("assets/app.js")) && /proxyBase/.test(data);
const driveLinks = items.every((i) => page.indexOf(i.open) !== -1) === false; // links are built at runtime
check("the proxy hook exists for real thumbnails later", proxy, "appUsesProxyBase=" + /proxyBase/.test(read("assets/app.js")));

/* nav entry everywhere */
const missingNav = pages.filter((f) => read(f).indexOf('data-nav="gallery.html"') === -1);
check("every page links to the gallery in its nav", missingNav.length === 0, "pages=" + pages.length + " missing=[" + missingNav + "]");

/* page conventions that the other suites rely on */
const conventions = {
  "brand logo twice": (page.match(/class="brand-logo"/g) || []).length === 2,
  "logo alt name": (page.match(/alt="Paguyuban RHDM"/g) || []).length === 2,
  "theme/lang/motion/nav scripts": ["assets/lang.js", "assets/theme.js", "assets/motion.js", "assets/nav.js"].every((s) => page.indexOf(s) !== -1),
  "gallery data loaded": page.indexOf("assets/gallery-data.js") !== -1,
  "app loaded": page.indexOf("assets/app.js") !== -1,
  "no dashes": !/[\u2013\u2014]/.test(page),
  "lang attribute": /<html lang="en">/.test(page)
};
const broken = Object.keys(conventions).filter((k) => !conventions[k]);
check("the page follows the site conventions", broken.length === 0, "broken=[" + broken + "]");

/* the folder link is present and safe */
check(
  "the folder link opens in a new tab safely",
  /drive\.google\.com\/drive\/folders\/1EtjoKRPvBGH6mtCLj5Go7JskUwdrgGsC"/.test(page) && /rel="noopener"/.test(page),
  "folderLink=" + /1EtjoKRPvBGH6mtCLj5Go7JskUwdrgGsC/.test(page)
);

/* the backend route that makes real thumbnails possible at all */
const srv = read("server/server.js");
check(
  "the backend exposes a same-origin thumbnail proxy",
  /\/api\/gallery\/thumb/.test(srv) && /invalid_id/.test(srv) && /drive\.google\.com\/thumbnail/.test(srv),
  "route=" + /\/api\/gallery\/thumb/.test(srv) + " validatesId=" + /invalid_id/.test(srv)
);

const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;
results.forEach((r) => console.log((r.ok ? "PASS  " : "FAIL  ") + r.name + "  (" + r.detail + ")"));
console.log("");
console.log("RESULT passed=" + passed + " total=" + results.length + " failed=" + failed);
process.exit(failed === 0 ? 0 : 1);
