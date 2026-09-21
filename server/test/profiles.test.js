"use strict";

/**
 * Profiles checks. No framework, no dependencies.
 *
 *   node server/test/profiles.test.js
 *
 * Profiles lists every family member and showcases the family notebook. The
 * host CSP forbids embedding other origins, so the page must never iframe
 * notebook.google.com; the card links out instead.
 */
const fs = require("fs");
const path = require("path");

const SITE = path.resolve(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(SITE, p), "utf8");
const pages = fs.readdirSync(SITE).filter((f) => f.endsWith(".html"));

const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

const hasPage = fs.existsSync(path.join(SITE, "profiles.html"));
check("profiles.html exists", hasPage, "present=" + hasPage);

const page = hasPage ? read("profiles.html") : "";
const data = read("assets/data.js");
const app = read("assets/app.js");

const NOTEBOOK = "https://notebook.google.com/notebook/2983b39b-e5cd-41e3-9b9f-e0c2cede3f54";

check(
  "the notebook URL is in the data module and the page",
  data.indexOf(NOTEBOOK) !== -1 && page.indexOf(NOTEBOOK) !== -1,
  "data=" + (data.indexOf(NOTEBOOK) !== -1) + " page=" + (page.indexOf(NOTEBOOK) !== -1)
);

check(
  "the notebook is linked, not iframed",
  /<iframe[\s\S]*notebook\.google\.com/.test(page) === false &&
    /id="notebook-open"/.test(page) &&
    /rel="noopener"/.test(page),
  "iframe=" + /<iframe/.test(page) + " openLink=" + /id="notebook-open"/.test(page)
);

const imgSrcs = [...page.matchAll(/<img[^>]*\ssrc="([^"]+)"/g)].map((x) => x[1]);
const external = imgSrcs.filter((s) => /^https?:/i.test(s));
check("no image on profiles points off-origin", external.length === 0, "imgSrcs=" + imgSrcs.length + " external=[" + external + "]");

const missingNav = pages.filter((f) => read(f).indexOf('data-nav="profiles.html"') === -1);
check("every page links to profiles in its nav", missingNav.length === 0, "pages=" + pages.length + " missing=[" + missingNav + "]");

const conventions = {
  "brand logo twice": (page.match(/class="brand-logo"/g) || []).length === 2,
  "logo alt name": (page.match(/alt="Paguyuban RHDM"/g) || []).length === 2,
  "theme/lang/motion/nav scripts": ["assets/lang.js", "assets/theme.js", "assets/motion.js", "assets/nav.js"].every((s) => page.indexOf(s) !== -1),
  "app loaded": page.indexOf("assets/app.js") !== -1,
  "data loaded": page.indexOf("assets/data.js") !== -1,
  "no dashes": !/[\u2013\u2014]/.test(page),
  "lang attribute": /<html lang="en">/.test(page)
};
const broken = Object.keys(conventions).filter((k) => !conventions[k]);
check("the page follows the site conventions", broken.length === 0, "broken=[" + broken + "]");

const membersMatch = /var MEMBERS = (\[[\s\S]*?\]);/.exec(data);
let members = [];
try { members = membersMatch ? eval(membersMatch[1]) : []; } catch (e) { members = []; }
const shaped = members.length > 0 && members.every((m) => m.id && m.name && m.branch && m.role && m.place && m.initials && m.bio);
check("every member has an id and a bio", shaped, "members=" + members.length + " shaped=" + shaped);

const uniqueIds = new Set(members.map((m) => m.id));
check("member ids are unique", uniqueIds.size === members.length, "ids=" + uniqueIds.size + " members=" + members.length);

const renderer = /function initProfiles/.test(app) && /function renderProfileDetail/.test(app) && /function renderProfileList/.test(app);
check("app.js renders the list and the detail", renderer, "init=" + /initProfiles/.test(app) + " detail=" + /renderProfileDetail/.test(app));

check(
  "unknown profile ids get a not-found state",
  /That profile is not here/.test(app) && /Back to profiles/.test(app),
  "notFound=" + /That profile is not here/.test(app)
);

check(
  "the family directory links into profiles",
  /profiles\.html\?id=/.test(app) && read("family.html").indexOf("profiles.html") !== -1,
  "cardsLink=" + /profiles\.html\?id=/.test(app)
);

const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;
results.forEach((r) => console.log((r.ok ? "PASS  " : "FAIL  ") + r.name + "  (" + r.detail + ")"));
console.log("");
console.log("RESULT passed=" + passed + " total=" + results.length + " failed=" + failed);
process.exit(failed === 0 ? 0 : 1);
