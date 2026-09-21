/* Paguyuban RHDM — language switch (English / Bahasa Indonesia).
 *
 * Loaded in <head> before the page paints, so <html lang> is correct from the
 * first frame. Strategy: the English copy is the source of truth in the markup;
 * switching to Indonesian swaps matching text nodes and attributes using the
 * dictionary in i18n.js, stashing the originals so switching back is lossless.
 *
 * Anything without a dictionary entry stays as written, so a missing key
 * degrades to English rather than breaking the page.
 */
(function () {
  "use strict";

  var KEY = "alderhouse.lang";
  var SUPPORTED = ["en", "id"];
  var root = document.documentElement;
  var origText = new WeakMap();
  var origAttr = new WeakMap();
  var ATTRS = ["placeholder", "aria-label", "title", "alt"];
  var SKIP = { SCRIPT: 1, STYLE: 1 };

  function stored() {
    try {
      var v = window.localStorage.getItem(KEY);
      return SUPPORTED.indexOf(v) === -1 ? null : v;
    } catch (err) { return null; }
  }
  function get() { return stored() || "en"; }
  function dict() { return (window.ALDER_I18N && window.ALDER_I18N.id) || {}; }

  /** Translate one string (used for dynamic, JS-built text). */
  function t(s) {
    if (get() !== "id") return s;
    var v = dict()[s];
    return v == null ? s : v;
  }
  /** Fill a {n}-style template. */
  function tn(template, n) { return t(template).replace(/\{n\}/g, n); }

  function insideNoI18n(el) {
    return !!(el.closest && el.closest("[data-no-i18n]"));
  }

  function swapText(lang) {
    var walker = document.createTreeWalker(document.body || root, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      var parent = node.parentNode;
      if (!parent || SKIP[parent.nodeName] || insideNoI18n(parent)) continue;
      var text = node.nodeValue;
      var key = text.trim();
      if (!key) continue;

      if (lang === "en") {
        if (origText.has(node)) node.nodeValue = origText.get(node);
        continue;
      }
      var tr = dict()[key];
      if (tr == null) continue;
      if (!origText.has(node)) origText.set(node, text);
      node.nodeValue = text.replace(key, tr);
    }
  }

  function swapAttrs(lang) {
    var els = document.querySelectorAll("[placeholder],[aria-label],[title],[alt]");
    Array.prototype.forEach.call(els, function (el) {
      if (insideNoI18n(el)) return;
      ATTRS.forEach(function (attr) {
        if (!el.hasAttribute(attr)) return;
        var store = origAttr.get(el) || {};
        var current = el.getAttribute(attr);
        var key = current.trim();
        if (!key) return;
        if (lang === "en") {
          if (store[attr] != null) el.setAttribute(attr, store[attr]);
          return;
        }
        var tr = dict()[key];
        if (tr == null) return;
        if (store[attr] == null) {
          store[attr] = current;
          origAttr.set(el, store);
        }
        el.setAttribute(attr, tr);
      });
    });
    /* document title and the meta description live on <head> */
    var title = document.querySelector("title");
    if (title && title.firstChild) {
      var tkey = title.firstChild.nodeValue.trim();
      if (lang === "en") {
        if (origText.has(title.firstChild)) title.firstChild.nodeValue = origText.get(title.firstChild);
      } else {
        var ttr = dict()[tkey];
        if (ttr != null) {
          if (!origText.has(title.firstChild)) origText.set(title.firstChild, title.firstChild.nodeValue);
          title.firstChild.nodeValue = ttr;
        }
      }
    }
    var meta = document.querySelector('meta[name="description"]');
    if (meta) {
      var store2 = origAttr.get(meta) || {};
      var mkey = (meta.getAttribute("content") || "").trim();
      if (mkey) {
        if (lang === "en") {
          if (store2.content != null) meta.setAttribute("content", store2.content);
        } else {
          var mtr = dict()[mkey];
          if (mtr != null) {
            if (store2.content == null) { store2.content = meta.getAttribute("content"); origAttr.set(meta, store2); }
            meta.setAttribute("content", mtr);
          }
        }
      }
    }
  }

  /** A localised copy of the content data for the current language. */
  function data() {
    var base = window.ALDER;
    var C = (window.ALDER_I18N_CONTENT || {})[get()];
    if (!base || !C) return base;
    function fromMap(list, map, key) {
      if (!map) return list;
      return list.map(function (rec) {
        var o = map[record_key(rec, key)];
        return o ? Object.assign({}, rec, o) : rec;
      });
    }
    function record_key(rec, k) { return rec[k]; }
    function byIndex(list, arr) {
      if (!arr) return list;
      return list.map(function (rec, i) {
        return arr[i] ? Object.assign({}, rec, arr[i]) : rec;
      });
    }
    var categories = (base.categories || []).map(function (c) {
      var label = C.categories && C.categories[c.id];
      return label ? Object.assign({}, c, { label: label }) : c;
    });
    var site = base.site ? Object.assign({}, base.site) : base.site;
    if (site && C.site && C.site.tagline) site.tagline = C.site.tagline;
    return {
      site: site,
      categories: categories,
      members: fromMap(base.members || [], C.members, "name"),
      listings: fromMap(base.listings || [], C.listings, "id"),
      events: byIndex(base.events || [], C.events),
      news: byIndex(base.news || [], C.news),
      recipes: byIndex(base.recipes || [], C.recipes),
      notebookUrl: base.notebookUrl
    };
  }

  function applySwitcher() {
    var lang = get();
    Array.prototype.forEach.call(document.querySelectorAll("[data-lang]"), function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === lang));
    });
    var group = document.querySelector(".lang");
    if (group) group.setAttribute("aria-label", t("Switch language"));
  }

  function apply() {
    var lang = get();
    root.setAttribute("lang", lang === "id" ? "id" : "en");
    swapText(lang);
    swapAttrs(lang);
    applySwitcher();
  }

  function set(lang) {
    if (SUPPORTED.indexOf(lang) === -1) return;
    try { window.localStorage.setItem(KEY, lang); } catch (err) {}
    apply();
    document.dispatchEvent(new CustomEvent("alder:langchange", { detail: { lang: lang } }));
  }

  function build() {
    var host = document.querySelector(".topnav-actions") || document.querySelector(".topnav-inner");
    if (!host || document.getElementById("lang-switch")) return;
    var wrap = document.createElement("div");
    wrap.className = "lang";
    wrap.id = "lang-switch";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("data-no-i18n", "1");
    wrap.innerHTML =
      '<button type="button" data-lang="en" aria-pressed="true" aria-label="English">EN</button>' +
      '<button type="button" data-lang="id" aria-pressed="false" aria-label="Bahasa Indonesia">ID</button>';
    Array.prototype.forEach.call(wrap.querySelectorAll("button"), function (b) {
      b.addEventListener("click", function () { set(b.getAttribute("data-lang")); });
    });
    host.appendChild(wrap);
    applySwitcher();
  }

  root.setAttribute("lang", get() === "id" ? "id" : "en");

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { build(); apply(); });
  else { build(); apply(); }

  window.ALDER_LANG = { get: get, set: set, t: t, tn: tn, apply: apply, data: data, supported: SUPPORTED.slice() };
})();
