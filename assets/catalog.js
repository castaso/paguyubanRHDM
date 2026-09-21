/* Paguyuban RHDM, marketplace catalog CRUD.
 *
 * An invisible cog in the lowest-left corner opens a panel for adding,
 * editing, and deleting listings (title, SKU, photos, description, and
 * the rest of the listing fields). Changes overlay the seed data in
 * data.js and persist in localStorage on this device.
 *
 * Creating and editing is admin-only, the same allow-list as sell.html.
 * The cog itself is public; the panel asks for a sign-in when needed.
 */
(function () {
  "use strict";

  var KEY = "alderhouse.catalog.v1";
  var TINTS = ["--tint-1", "--tint-2", "--tint-3", "--tint-4", "--tint-5", "--tint-6"];
  var MAX_IMAGE = 720;
  var JPEG_Q = 0.72;
  var MAX_PHOTOS = 4;
  var SEED = null;

  function T(s) { return window.ALDER_LANG ? window.ALDER_LANG.t(s) : s; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function seed() {
    if (!SEED) SEED = ((window.ALDER && window.ALDER.listings) || []).slice();
    return SEED;
  }
  function categories() {
    return (window.ALDER && window.ALDER.categories) || [];
  }
  function isAdmin() {
    return !!(window.ALDER_AUTH && window.ALDER_AUTH.session && window.ALDER_AUTH.session());
  }

  function readStore() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return { extra: [], edits: {}, deleted: [] };
      var s = JSON.parse(raw);
      return {
        extra: Array.isArray(s.extra) ? s.extra : [],
        edits: s.edits && typeof s.edits === "object" ? s.edits : {},
        deleted: Array.isArray(s.deleted) ? s.deleted : []
      };
    } catch (err) {
      return { extra: [], edits: {}, deleted: [] };
    }
  }
  function writeStore(store) {
    try { window.localStorage.setItem(KEY, JSON.stringify(store)); } catch (err) {}
  }

  function skuOf(id) {
    var code = String(id || "").replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase();
    return "RHDM-" + (code || "ITEM");
  }
  function slug(title) {
    var s = String(title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return s || "listing";
  }
  function uniqueId(title, listings) {
    var base = slug(title);
    var id = base;
    var n = 2;
    var ids = {};
    seed().forEach(function (l) { ids[l.id] = true; });
    (listings || []).forEach(function (l) { if (l && l.id) ids[l.id] = true; });
    readStore().deleted.forEach(function (d) { ids[d] = true; });
    readStore().extra.forEach(function (l) { if (l && l.id) ids[l.id] = true; });
    while (ids[id]) { id = base + "-" + n; n++; }
    return id;
  }
  function today() {
    var d = new Date();
    var m = String(d.getMonth() + 1);
    var day = String(d.getDate());
    if (m.length < 2) m = "0" + m;
    if (day.length < 2) day = "0" + day;
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function normalize(l) {
    if (!l || !l.id) return null;
    var images = Array.isArray(l.images) ? l.images.filter(Boolean) : [];
    if (l.image && images.indexOf(l.image) === -1) images.unshift(l.image);
    images = images.slice(0, MAX_PHOTOS);
    var details = Array.isArray(l.details) ? l.details : [];
    var tags = Array.isArray(l.tags) ? l.tags : [];
    return {
      id: l.id,
      sku: l.sku || skuOf(l.id),
      title: l.title || "",
      category: l.category || "secondhand",
      price: Number(l.price) || 0,
      priceUnit: l.priceUnit || "",
      condition: l.condition || "",
      seller: l.seller || "",
      place: l.place || "",
      posted: l.posted || today(),
      tint: l.tint || TINTS[Math.abs(String(l.id).length) % TINTS.length],
      blurb: l.blurb || "",
      details: details,
      tags: tags,
      image: images[0] || "",
      images: images
    };
  }

  function merge() {
    var store = readStore();
    var deleted = {};
    store.deleted.forEach(function (id) { deleted[id] = true; });
    var out = [];
    seed().forEach(function (l) {
      if (deleted[l.id]) return;
      var patched = store.edits[l.id] ? Object.assign({}, l, store.edits[l.id]) : l;
      out.push(normalize(patched));
    });
    store.extra.forEach(function (l) {
      if (!l || !l.id || deleted[l.id]) return;
      var patched = store.edits[l.id] ? Object.assign({}, l, store.edits[l.id]) : l;
      out.push(normalize(patched));
    });
    return out;
  }

  function applyToData() {
    if (!window.ALDER) return merge();
    window.ALDER.listings = merge();
    return window.ALDER.listings;
  }

  function refreshPages() {
    applyToData();
    if (window.ALDER_RENDER) window.ALDER_RENDER();
    if (window.ALDER_LANG) window.ALDER_LANG.apply();
  }

  function upsert(listing) {
    if (!listing) return null;
    if (!listing.id) listing = Object.assign({}, listing, { id: uniqueId(listing.title, merge()) });
    listing = normalize(listing);
    if (!listing) return null;
    var store = readStore();
    var id = listing.id;
    var inSeed = seed().some(function (l) { return l.id === id; });
    var extraIdx = -1;
    store.extra.forEach(function (l, i) { if (l.id === id) extraIdx = i; });
    store.deleted = store.deleted.filter(function (d) { return d !== id; });
    if (inSeed) {
      store.edits[id] = listing;
    } else if (extraIdx > -1) {
      store.extra[extraIdx] = listing;
      store.edits[id] = listing;
    } else {
      store.extra.push(listing);
    }
    writeStore(store);
    refreshPages();
    return listing;
  }

  function remove(id) {
    var store = readStore();
    store.extra = store.extra.filter(function (l) { return l.id !== id; });
    delete store.edits[id];
    if (store.deleted.indexOf(id) === -1) store.deleted.push(id);
    writeStore(store);
    refreshPages();
  }

  applyToData();

  function noHover() {
    return !!(window.matchMedia && window.matchMedia("(hover: none)").matches);
  }

  function catOptions(selected) {
    return categories().map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (c.id === selected ? " selected" : "") + ">" + esc(c.label) + "</option>";
    }).join("");
  }

  function listingThumb(l) {
    if (l.image) return '<img class="catalog-thumb-img" src="' + esc(l.image) + '" alt="">';
    return '<span class="catalog-thumb-ph" style="--card-tint: var(' + esc(l.tint || "--tint-3") + ')"></span>';
  }

  function build() {
    if (document.getElementById("catalog-cog")) return;

    var wrap = document.createElement("div");
    wrap.className = "catalog-cog-wrap";
    wrap.id = "catalog-cog-wrap";
    wrap.innerHTML =
      '<button class="catalog-cog" type="button" id="catalog-cog" aria-label="' + esc("Edit the market") + '" aria-haspopup="dialog" aria-expanded="false">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
          '<circle cx="12" cy="12" r="3.1"/>' +
          '<path d="M19.5 12a7.5 7.5 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.6 3h-3.9l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.5 7.5 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h3.9l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.06-.4.1-.8.1-1.2z"/>' +
        "</svg>" +
      "</button>";
    document.body.appendChild(wrap);

    var scrim = document.createElement("div");
    scrim.className = "catalog-scrim";
    scrim.id = "catalog-scrim";
    scrim.hidden = true;
    scrim.innerHTML =
      '<div class="catalog-panel" role="dialog" aria-modal="true" aria-labelledby="catalog-h" tabindex="-1">' +
        '<div class="settings-head">' +
          '<h2 id="catalog-h" class="h3">Catalog</h2>' +
          '<button class="btn btn-ghost btn-sm" type="button" id="catalog-close" aria-label="Close catalog">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>' +
          "</button>" +
        "</div>" +
        '<div id="catalog-body"></div>' +
      "</div>";
    document.body.appendChild(scrim);

    var cog = document.getElementById("catalog-cog");
    var panel = scrim.querySelector(".catalog-panel");
    var body = document.getElementById("catalog-body");
    var lastFocus = null;
    var view = "list";
    var editingId = null;
    var pendingImages = [];
    var statusMsg = "";

    function onKey(e) {
      if (e.key === "Escape") {
        if (view === "form") { view = "list"; editingId = null; pendingImages = []; render(); return; }
        close();
        return;
      }
      if (e.key !== "Tab") return;
      var f = panel.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    function open() {
      lastFocus = document.activeElement;
      view = "list";
      editingId = null;
      pendingImages = [];
      statusMsg = "";
      render();
      scrim.hidden = false;
      cog.setAttribute("aria-expanded", "true");
      panel.focus();
      document.addEventListener("keydown", onKey);
    }
    function close() {
      scrim.hidden = true;
      cog.setAttribute("aria-expanded", "false");
      document.removeEventListener("keydown", onKey);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
      else cog.focus();
    }

    function renderGate() {
      body.innerHTML =
        '<p class="eyebrow" style="margin-bottom:10px;">Admins only</p>' +
        "<h3 style=\"margin-bottom:8px;\">" + esc(T("Manage listings")) + "</h3>" +
        '<p class="muted" style="font-size:13.5px;margin:0 0 16px;">' + esc(T("Sign in as an admin to edit the market.")) + "</p>" +
        '<button class="btn btn-primary" type="button" id="catalog-signin">' + esc(T("Sign in as an admin")) + "</button>";
      var b = document.getElementById("catalog-signin");
      if (b) b.addEventListener("click", function () {
        close();
        if (window.ALDER_SETTINGS) window.ALDER_SETTINGS.open();
      });
    }

    function renderList() {
      var list = merge();
      var rows = list.length
        ? '<ul class="catalog-list">' + list.map(function (l) {
            return '<li class="catalog-row">' +
              '<span class="catalog-thumb">' + listingThumb(l) + "</span>" +
              "<div>" +
                '<div class="catalog-title">' + esc(l.title) + "</div>" +
                '<div class="meta">' + esc(l.sku) + " · " + esc(l.place) + "</div>" +
              "</div>" +
              '<div class="catalog-row-actions">' +
                '<button class="btn btn-ghost btn-sm" type="button" data-edit="' + esc(l.id) + '">' + esc(T("Edit")) + "</button>" +
                '<button class="btn btn-ghost btn-sm catalog-del" type="button" data-del="' + esc(l.id) + '">' + esc(T("Delete")) + "</button>" +
              "</div>" +
            "</li>";
          }).join("") + "</ul>"
        : '<p class="muted">' + esc(T("No listings yet")) + "</p>";

      body.innerHTML =
        '<p class="muted" style="font-size:13.5px;margin:0 0 14px;">' + esc(T("Manage what the family is selling")) + "</p>" +
        (statusMsg ? '<p class="meta" role="status" style="margin:0 0 12px;">' + esc(statusMsg) + "</p>" : "") +
        '<button class="btn btn-primary btn-sm" type="button" id="catalog-add">' + esc(T("Add a listing")) + "</button>" +
        rows;

      var add = document.getElementById("catalog-add");
      if (add) add.addEventListener("click", function () {
        view = "form";
        editingId = null;
        pendingImages = [];
        statusMsg = "";
        render();
      });
      Array.prototype.forEach.call(body.querySelectorAll("[data-edit]"), function (b) {
        b.addEventListener("click", function () {
          view = "form";
          editingId = b.getAttribute("data-edit");
          var cur = merge().filter(function (l) { return l.id === editingId; })[0];
          pendingImages = cur && cur.images ? cur.images.slice() : [];
          statusMsg = "";
          render();
        });
      });
      Array.prototype.forEach.call(body.querySelectorAll("[data-del]"), function (b) {
        b.addEventListener("click", function () {
          var id = b.getAttribute("data-del");
          var cur = merge().filter(function (l) { return l.id === id; })[0];
          var name = cur ? cur.title : id;
          if (!window.confirm(T("Delete this listing? It will leave the market on this device.") + "\n\n" + name)) return;
          remove(id);
          statusMsg = T("Listing removed.");
          render();
        });
      });
    }

    function photoStrip() {
      if (!pendingImages.length) return '<p class="hint">' + esc(T("No photos yet")) + "</p>";
      return '<div class="catalog-photos">' + pendingImages.map(function (src, i) {
        return '<figure class="catalog-photo">' +
          '<img src="' + esc(src) + '" alt="">' +
          '<button class="btn btn-ghost btn-sm" type="button" data-rm-photo="' + i + '">' + esc(T("Remove photo")) + "</button>" +
        "</figure>";
      }).join("") + "</div>";
    }

    function renderForm() {
      var cur = editingId ? merge().filter(function (l) { return l.id === editingId; })[0] : null;
      var heading = cur ? T("Edit listing") : T("Add a listing");
      body.innerHTML =
        '<button class="btn btn-ghost btn-sm" type="button" id="catalog-back">' + esc(T("Cancel")) + "</button>" +
        "<h3 style=\"margin:12px 0 16px;\">" + esc(heading) + "</h3>" +
        '<div class="form-summary" id="catalog-summary" hidden></div>' +
        '<form id="catalog-form" novalidate>' +
          '<div class="field"><label for="c-title">Title <span class="muted">(required)</span></label>' +
            '<input class="input" id="c-title" name="title" type="text" required maxlength="70" value="' + esc(cur ? cur.title : "") + '" />' +
            '<span class="error" id="c-title-error" role="alert"></span></div>' +
          '<div class="field"><label for="c-sku">SKU</label>' +
            '<input class="input" id="c-sku" name="sku" type="text" maxlength="32" value="' + esc(cur ? cur.sku : "") + '" placeholder="e.g. RHDM-OAK01" />' +
            '<span class="hint">Optional. Leave blank to generate one.</span></div>' +
          '<div class="field"><label for="c-category">Category <span class="muted">(required)</span></label>' +
            '<select class="select" id="c-category" name="category" required>' +
              '<option value="">Choose one…</option>' + catOptions(cur ? cur.category : "") +
            "</select>" +
            '<span class="error" id="c-category-error" role="alert"></span></div>' +
          '<div class="field"><label for="c-price">Price <span class="muted">(required)</span></label>' +
            '<input class="input" id="c-price" name="price" type="text" inputmode="decimal" required value="' + esc(cur ? String(cur.price) : "") + '" placeholder="e.g. 24, or 0 for free / borrow" />' +
            '<span class="error" id="c-price-error" role="alert"></span></div>' +
          '<div class="field"><label for="c-unit">Price unit</label>' +
            '<input class="input" id="c-unit" name="priceUnit" type="text" maxlength="24" value="' + esc(cur ? cur.priceUnit : "") + '" placeholder="Unit, e.g. / pair" /></div>' +
          '<div class="field"><label for="c-condition">Condition</label>' +
            '<input class="input" id="c-condition" name="condition" type="text" maxlength="40" value="' + esc(cur ? cur.condition : "") + '" /></div>' +
          '<div class="field"><label for="c-seller">Seller <span class="muted">(required)</span></label>' +
            '<input class="input" id="c-seller" name="seller" type="text" required value="' + esc(cur ? cur.seller : "") + '" />' +
            '<span class="error" id="c-seller-error" role="alert"></span></div>' +
          '<div class="field"><label for="c-place">Where it is <span class="muted">(required)</span></label>' +
            '<input class="input" id="c-place" name="place" type="text" required value="' + esc(cur ? cur.place : "") + '" />' +
            '<span class="error" id="c-place-error" role="alert"></span></div>' +
          '<div class="field"><label for="c-blurb">Description <span class="muted">(required)</span></label>' +
            '<textarea class="textarea" id="c-blurb" name="blurb" required maxlength="600">' + esc(cur ? cur.blurb : "") + "</textarea>" +
            '<span class="hint">20-600 characters. Say the honest bit.</span>' +
            '<span class="error" id="c-blurb-error" role="alert"></span></div>' +
          '<div class="field"><label for="c-details">Details (one per line)</label>' +
            '<textarea class="textarea" id="c-details" name="details">' + esc(cur ? (cur.details || []).join("\n") : "") + "</textarea></div>" +
          '<div class="field"><label for="c-tags">Tags (comma separated)</label>' +
            '<input class="input" id="c-tags" name="tags" type="text" value="' + esc(cur ? (cur.tags || []).join(", ") : "") + '" /></div>' +
          '<div class="field"><label for="c-photos">Images</label>' +
            '<input class="input" id="c-photos" name="photos" type="file" accept="image/*" multiple />' +
            '<span class="hint">Photos are stored on this device. Keep them small.</span>' +
            '<div id="catalog-photo-strip">' + photoStrip() + "</div></div>" +
          '<button class="btn btn-primary" type="submit" id="catalog-save">' + esc(T("Save listing")) + "</button>" +
        "</form>";

      document.getElementById("catalog-back").addEventListener("click", function () {
        view = "list";
        editingId = null;
        pendingImages = [];
        render();
      });
      wirePhotos();
      document.getElementById("catalog-form").addEventListener("submit", onSubmit);
      var titleEl = document.getElementById("c-title");
      if (titleEl) titleEl.focus();
    }

    function wirePhotos() {
      var strip = document.getElementById("catalog-photo-strip");
      if (strip) {
        Array.prototype.forEach.call(strip.querySelectorAll("[data-rm-photo]"), function (b) {
          b.addEventListener("click", function () {
            var i = Number(b.getAttribute("data-rm-photo"));
            pendingImages.splice(i, 1);
            strip.innerHTML = photoStrip();
            wirePhotos();
          });
        });
      }
      var input = document.getElementById("c-photos");
      if (!input || input.dataset.bound) return;
      input.dataset.bound = "1";
      input.addEventListener("change", function () {
        var files = Array.prototype.slice.call(input.files || []);
        var room = MAX_PHOTOS - pendingImages.length;
        files.slice(0, Math.max(0, room)).forEach(function (file) {
          readImage(file, function (dataUrl) {
            if (!dataUrl) return;
            pendingImages.push(dataUrl);
            var s = document.getElementById("catalog-photo-strip");
            if (s) { s.innerHTML = photoStrip(); wirePhotos(); }
          });
        });
        input.value = "";
      });
    }

    function readImage(file, cb) {
      if (!file || !file.type || file.type.indexOf("image/") !== 0) { cb(""); return; }
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var w = img.width;
          var h = img.height;
          if (w > MAX_IMAGE) { h = Math.round(h * (MAX_IMAGE / w)); w = MAX_IMAGE; }
          var canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          try { cb(canvas.toDataURL("image/jpeg", JPEG_Q)); }
          catch (err) { cb(String(reader.result || "")); }
        };
        img.onerror = function () { cb(""); };
        img.src = String(reader.result || "");
      };
      reader.onerror = function () { cb(""); };
      reader.readAsDataURL(file);
    }

    function showError(id, msg) {
      var input = document.getElementById(id);
      var err = document.getElementById(id + "-error");
      var wrap = input && input.closest ? input.closest(".field") : null;
      if (wrap) wrap.classList.add("is-invalid");
      if (input) input.setAttribute("aria-invalid", "true");
      if (err) err.textContent = msg;
    }

    function onSubmit(e) {
      e.preventDefault();
      var title = (document.getElementById("c-title").value || "").trim();
      var category = document.getElementById("c-category").value;
      var priceRaw = document.getElementById("c-price").value;
      var seller = (document.getElementById("c-seller").value || "").trim();
      var place = (document.getElementById("c-place").value || "").trim();
      var blurb = (document.getElementById("c-blurb").value || "").trim();
      var errors = [];
      Array.prototype.forEach.call(body.querySelectorAll(".field.is-invalid"), function (w) {
        w.classList.remove("is-invalid");
      });
      if (title.length < 3) { showError("c-title", T("Give it at least 3 characters.")); errors.push("title"); }
      else if (title.length > 70) { showError("c-title", T("Keep the title under 70 characters.")); errors.push("title"); }
      if (!category) { showError("c-category", T("Pick a category.")); errors.push("category"); }
      var price = Number(priceRaw);
      if (priceRaw.trim() === "") { showError("c-price", T("Enter a price, or 0 for free / borrow.")); errors.push("price"); }
      else if (isNaN(price) || price < 0) { showError("c-price", T("Price must be a number of 0 or more.")); errors.push("price"); }
      if (!seller) { showError("c-seller", T("Tell people who has it.")); errors.push("seller"); }
      if (!place) { showError("c-place", T("Tell people where to find it.")); errors.push("place"); }
      if (blurb.length < 20) { showError("c-blurb", T("Write at least 20 characters, a sentence or two.")); errors.push("blurb"); }
      else if (blurb.length > 600) { showError("c-blurb", T("Keep it under 600 characters.")); errors.push("blurb"); }

      var summary = document.getElementById("catalog-summary");
      if (errors.length) {
        if (summary) {
          summary.hidden = false;
          summary.innerHTML = "<h2 tabindex=\"-1\">" + esc(T("Fix the highlighted fields.")) + "</h2>";
          summary.querySelector("h2").focus();
        }
        return;
      }
      if (summary) summary.hidden = true;

      var existing = editingId ? merge().filter(function (l) { return l.id === editingId; })[0] : null;
      var id = existing ? existing.id : uniqueId(title, merge());
      var sku = (document.getElementById("c-sku").value || "").trim() || (existing && existing.sku) || skuOf(id);
      var details = (document.getElementById("c-details").value || "").split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
      if (!details.length) details = [blurb];
      var tags = (document.getElementById("c-tags").value || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
      var listing = normalize({
        id: id,
        sku: sku,
        title: title,
        category: category,
        price: price,
        priceUnit: (document.getElementById("c-unit").value || "").trim(),
        condition: (document.getElementById("c-condition").value || "").trim() || "Good",
        seller: seller,
        place: place,
        posted: existing ? existing.posted : today(),
        tint: existing ? existing.tint : TINTS[merge().length % TINTS.length],
        blurb: blurb,
        details: details,
        tags: tags,
        images: pendingImages.slice()
      });
      upsert(listing);
      statusMsg = T("Listing saved.");
      view = "list";
      editingId = null;
      pendingImages = [];
      render();
    }

    function render() {
      if (!isAdmin()) { renderGate(); }
      else if (view === "form") { renderForm(); }
      else { renderList(); }
      if (window.ALDER_LANG) window.ALDER_LANG.apply();
    }

    cog.addEventListener("click", function () {
      if (noHover() && cog.getAttribute("data-armed") !== "true") {
        cog.setAttribute("data-armed", "true");
        return;
      }
      scrim.hidden ? open() : close();
    });
    scrim.addEventListener("click", function (e) { if (e.target === scrim) close(); });
    document.getElementById("catalog-close").addEventListener("click", close);

    window.ALDER_CATALOG = {
      listings: merge,
      save: upsert,
      remove: remove,
      refresh: refreshPages,
      open: open,
      close: close
    };
  }

  function init() { build(); }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
