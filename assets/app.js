/* Paguyuban RHDM, shared front-end logic.
   Single source of truth is window.ALDER (data.js). No external requests. */
(function () {
  "use strict";

  var D = window.ALDER || { categories: [], members: [], listings: [], events: [], news: [], recipes: [], site: {} };

  /* ── helpers ───────────────────────────────────────────────────────── */
  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(n, unit) {
    if (!n) return "Free / borrow";
    return "$" + n + (unit || "");
  }
  function catLabel(id) {
    for (var i = 0; i < D.categories.length; i++) if (D.categories[i].id === id) return D.categories[i].label;
    return id;
  }
  function shortName(full) { return String(full).split(" ")[0] + " " + (String(full).split(" ")[1] || "").charAt(0) + "."; }
  function initials(full) {
    return String(full).split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join("").toUpperCase();
  }
  function fmtDate(iso) {
    var d = new Date(iso + "T12:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  function monthLabel(iso) {
    var d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  function daysUntil(iso) {
    var d = new Date(iso + "T12:00:00");
    return Math.ceil((d - new Date()) / 86400000);
  }

  /* ── shared chrome ─────────────────────────────────────────────────── */
  function setChrome() {
    var here = location.pathname.split("/").pop() || "index.html";
    $all("[data-nav]").forEach(function (a) {
      if (a.getAttribute("data-nav") === here) a.setAttribute("aria-current", "page");
    });
    $all("[data-year]").forEach(function (n) { n.textContent = new Date().getFullYear(); });
    $all("[data-brand]").forEach(function (n) { n.textContent = D.site.brand; });
    $all("[data-organizer]").forEach(function (n) { n.textContent = D.site.organizer; });
    $all("[data-count-listings]").forEach(function (n) { n.textContent = D.listings.length; });
    $all("[data-count-members]").forEach(function (n) { n.textContent = D.members.length; });
    $all("[data-contact]").forEach(function (n) {
      n.textContent = D.site.contact;
      if (n.tagName === "A") n.href = "mailto:" + D.site.contact;
    });
  }

  /* ── cards ─────────────────────────────────────────────────────────── */
  function listingCard(l) {
    return '' +
      '<article class="listing-card card-hover">' +
        '<div class="listing-media" style="--card-tint: var(' + esc(l.tint) + ')" role="img" aria-label="Placeholder image for ' + esc(l.title) + '">Photo · replace with your own</div>' +
        '<div class="listing-body">' +
          '<span class="badge">' + esc(catLabel(l.category)) + '</span>' +
          '<h3><a href="listing.html?id=' + encodeURIComponent(l.id) + '">' + esc(l.title) + '</a></h3>' +
          '<p class="muted clamp-2" style="margin:0;font-size:14.5px;">' + esc(l.blurb) + '</p>' +
          '<div class="listing-foot">' +
            '<span class="listing-price">' + esc(money(l.price, l.priceUnit)) + '</span>' +
            '<span>' + esc(shortName(l.seller)) + ' · ' + esc(l.place.split(",")[0]) + '</span>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function skeletonCard() {
    return '<div class="skel-card" aria-hidden="true">' +
      '<div class="skel skel-media"></div>' +
      '<div class="skel skel-line" style="width:35%"></div>' +
      '<div class="skel skel-line" style="width:78%"></div>' +
      '<div class="skel skel-line" style="width:60%"></div>' +
    '</div>';
  }

  /* ── market page ───────────────────────────────────────────────────── */
  function initMarket() {
    var root = $("#market");
    if (!root) return;

    var resultsEl = $("#market-results");
    var chipsEl = $("#market-chips");
    var searchEl = $("#market-search");
    var sortEl = $("#market-sort");
    var countEl = $("#market-count");
    var statusEl = $("#market-status");

    var params = new URLSearchParams(location.search);
    var state = {
      q: params.get("q") || "",
      cat: params.get("cat") || "all",
      sort: params.get("sort") || "newest",
      forceError: params.get("state") === "error"
    };

    function renderChips() {
      var html = '<button class="chip" type="button" data-cat="all" aria-pressed="' + (state.cat === "all") + '">All</button>';
      D.categories.forEach(function (c) {
        html += '<button class="chip" type="button" data-cat="' + esc(c.id) + '" aria-pressed="' + (state.cat === c.id) + '">' + esc(c.label) + "</button>";
      });
      chipsEl.innerHTML = html;
      $all(".chip", chipsEl).forEach(function (b) {
        b.addEventListener("click", function () {
          state.cat = b.getAttribute("data-cat");
          $all(".chip", chipsEl).forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
          apply();
        });
      });
    }

    function filtered() {
      var q = state.q.trim().toLowerCase();
      var out = D.listings.filter(function (l) {
        if (state.cat !== "all" && l.category !== state.cat) return false;
        if (!q) return true;
        var hay = [l.title, l.seller, l.place, l.blurb, catLabel(l.category)].concat(l.tags || []).join(" ").toLowerCase();
        return hay.indexOf(q) !== -1;
      });
      out.sort(function (a, b) {
        if (state.sort === "price-asc") return (a.price - b.price) || a.title.localeCompare(b.title);
        if (state.sort === "price-desc") return (b.price - a.price) || a.title.localeCompare(b.title);
        return b.posted.localeCompare(a.posted);
      });
      return out;
    }

    function syncUrl() {
      var p = new URLSearchParams();
      if (state.q) p.set("q", state.q);
      if (state.cat !== "all") p.set("cat", state.cat);
      if (state.sort !== "newest") p.set("sort", state.sort);
      var qs = p.toString();
      history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
    }

    function renderError() {
      resultsEl.className = "";
      resultsEl.innerHTML =
        '<div class="state state-error" role="group" aria-labelledby="market-err-h">' +
          '<h3 id="market-err-h">The listings did not load</h3>' +
          '<p>We could not reach the listing data. Your filters are preserved. If it keeps failing, contact the organiser.</p>' +
          '<p class="meta" style="margin-bottom:16px;">Last attempted: just now</p>' +
          '<button class="btn btn-secondary" type="button" id="market-retry">Try again</button>' +
        '</div>';
      countEl.textContent = "Listings unavailable";
      var retry = $("#market-retry");
      if (retry) retry.addEventListener("click", function () { state.forceError = false; apply(); });
    }

    function renderEmpty(list) {
      var echo = state.q ? 'No listings match "' + esc(state.q) + '"' : "Nothing in this category yet";
      resultsEl.className = "";
      resultsEl.innerHTML =
        '<div class="state" role="group" aria-labelledby="market-empty-h" style="grid-column:1/-1;">' +
          '<h3 id="market-empty-h">' + echo + "</h3>" +
          '<p>Try a broader word, a different category, or clear the filters to see all ' + D.listings.length + " listings.</p>" +
          '<button class="btn btn-secondary" type="button" id="market-clear">Clear filters</button>' +
        "</div>";
      var clear = $("#market-clear");
      if (clear) clear.addEventListener("click", function () {
        state.q = ""; state.cat = "all"; state.sort = "newest";
        if (searchEl) searchEl.value = ""; if (sortEl) sortEl.value = "newest";
        renderChips(); apply();
      });
      countEl.textContent = "No listings found";
    }

    function renderResults(list) {
      resultsEl.className = "listing-grid";
      resultsEl.innerHTML = list.map(listingCard).join("");
      countEl.textContent = list.length + (list.length === 1 ? " listing" : " listings");
      if (statusEl) {
        statusEl.textContent = list.length + " listings shown" +
          (state.cat !== "all" ? ", category " + catLabel(state.cat) : "") +
          (state.q ? ', search "' + state.q + '"' : "") + ".";
      }
    }

    function apply() {
      syncUrl();
      if (state.forceError) { renderError(); return; }
      var list = filtered();
      resultsEl.className = "listing-grid";
      resultsEl.innerHTML = Array(3).fill(skeletonCard()).join("");
      if (countEl) countEl.textContent = "Loading listings…";
      if (statusEl) statusEl.textContent = "Loading listings.";
      window.setTimeout(function () {
        if (list.length === 0) renderEmpty(list);
        else renderResults(list);
      }, 420);
    }

    renderChips();
    if (searchEl) {
      searchEl.value = state.q;
      var t;
      searchEl.addEventListener("input", function () {
        window.clearTimeout(t);
        t = window.setTimeout(function () { state.q = searchEl.value; apply(); }, 220);
      });
    }
    if (sortEl) {
      sortEl.value = state.sort;
      sortEl.addEventListener("change", function () { state.sort = sortEl.value; apply(); });
    }
    apply();
  }

  /* ── listing detail ────────────────────────────────────────────────── */
  function initListing() {
    var root = $("#listing-root");
    if (!root) return;
    var id = new URLSearchParams(location.search).get("id");
    var l = null;
    for (var i = 0; i < D.listings.length; i++) if (D.listings[i].id === id) l = D.listings[i];

    if (!l) {
      root.innerHTML =
        '<div class="state state-error" role="group" aria-labelledby="nf-h">' +
          '<h3 id="nf-h">That listing is not here</h3>' +
          '<p>' + (id ? "We could not find a listing with the reference “" + esc(id) + "”. It may have sold or been taken down." : "No listing was specified.") + "</p>" +
          '<a class="btn btn-primary" href="marketplace.html">Back to the market</a>' +
        "</div>";
      var crumb = $("#listing-crumb");
      if (crumb) crumb.textContent = "Not found";
      document.title = "Listing not found · " + D.site.brand;
      return;
    }

    document.title = l.title + " · " + D.site.brand;
    var crumb = $("#listing-crumb");
    if (crumb) crumb.textContent = l.title;

    root.innerHTML =
      '<div class="detail-grid">' +
        "<div>" +
          '<div class="ph-img wide" style="--tint-1: var(' + esc(l.tint) + '); margin-bottom:24px;" role="img" aria-label="Placeholder image for ' + esc(l.title) + '">Photo · replace with your own</div>' +
          '<p class="eyebrow">' + esc(catLabel(l.category)) + "</p>" +
          "<h1>" + esc(l.title) + "</h1>" +
          '<p class="lead" style="margin-top:14px;">' + esc(l.blurb) + "</p>" +
          '<div class="prose" style="margin-top:28px;">' +
            "<h2 class=\"h3\">Details</h2>" +
            '<ul class="list-plain" style="margin-top:10px;">' + l.details.map(function (d) { return "<li>" + esc(d) + "</li>"; }).join("") + "</ul>" +
          "</div>" +
          '<div class="row" style="margin-top:20px;gap:8px;">' + (l.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") + "</div>" +
        "</div>" +
        "<aside class=\"price-box\">" +
          '<div class="card">' +
            '<div class="listing-price" style="font-size:28px;">' + esc(money(l.price, l.priceUnit)) + "</div>" +
            '<p class="muted" style="margin:6px 0 20px;">Listed ' + esc(fmtDate(l.posted)) + "</p>" +
            '<div class="row" style="gap:12px;margin-bottom:20px;">' +
              '<span class="avatar" aria-hidden="true">' + esc(initials(l.seller)) + "</span>" +
              "<div><div style=\"font-weight:600;\">" + esc(l.seller) + '</div><div class="meta">' + esc(l.place) + "</div></div>" +
            "</div>" +
            '<button class="btn btn-primary btn-block" type="button" id="contact-seller">Message ' + esc(shortName(l.seller)) + "</button>" +
            '<button class="btn btn-secondary btn-block" type="button" id="save-listing" aria-pressed="false" style="margin-top:10px;">Save this listing</button>' +
            '<p class="meta" id="contact-note" role="status" style="margin:14px 0 0;"></p>' +
          "</div>" +
          '<dl class="card spec-list" style="margin-top:20px;">' +
            "<dt>Category</dt><dd>" + esc(catLabel(l.category)) + "</dd>" +
            "<dt>Condition</dt><dd>" + esc(l.condition) + "</dd>" +
            "<dt>Place</dt><dd>" + esc(l.place) + "</dd>" +
            "<dt>Posted</dt><dd>" + esc(fmtDate(l.posted)) + "</dd>" +
          "</dl>" +
        "</aside>" +
      "</div>";

    var note = $("#contact-note");
    var cbtn = $("#contact-seller");
    if (cbtn) cbtn.addEventListener("click", function () {
      note.innerHTML = "Message " + esc(l.seller) + " at <a href=\"mailto:" + esc(D.site.contact) + "\" style=\"text-decoration:underline;\">" + esc(D.site.contact) + "</a>. Payment and pickup happen offline, between the two of you.";
    });
    var sbtn = $("#save-listing");
    if (sbtn) sbtn.addEventListener("click", function () {
      var on = sbtn.getAttribute("aria-pressed") === "true";
      sbtn.setAttribute("aria-pressed", String(!on));
      sbtn.textContent = !on ? "Saved ✓" : "Save this listing";
      note.textContent = !on ? "Saved to your shortlist." : "Removed from your shortlist.";
    });

    var related = $("#listing-related");
    if (related) {
      var others = D.listings.filter(function (x) { return x.category === l.category && x.id !== l.id; }).slice(0, 3);
      if (others.length === 0) others = D.listings.filter(function (x) { return x.id !== l.id; }).slice(0, 3);
      related.innerHTML = others.map(listingCard).join("");
    }
  }

  /* ── home page ─────────────────────────────────────────────────────── */
  function initHome() {
    var feed = $("#home-feed");
    if (feed) {
      feed.innerHTML = D.news.slice(0, 3).map(function (n) {
        return '<div class="feed-item">' +
          '<div><span class="badge">' + esc(n.tag) + "</span></div>" +
          '<div><h3>' + esc(n.title) + '</h3><p>' + esc(n.excerpt) + '</p>' +
          '<p class="meta" style="margin-top:6px;">' + esc(n.author) + " · " + esc(fmtDate(n.date)) + "</p></div>" +
        "</div>";
      }).join("");
    }

    var ev = $("#home-events");
    if (ev) {
      ev.innerHTML = upcoming(3).map(function (e) {
        var d = daysUntil(e.date);
        return '<div class="feed-item">' +
          '<div style="min-width:74px;"><div class="num" style="font-weight:600;">' + esc(fmtDate(e.date).replace(/,.*/, "")) + '</div><div class="meta">' + (d > 0 ? "in " + d + " days" : "today") + "</div></div>" +
          '<div><h3>' + esc(e.title) + '</h3><p>' + esc(e.place) + '</p><p class="meta" style="margin-top:6px;">' + esc(e.going) + " going</p></div>" +
        "</div>";
      }).join("");
    }

    var fl = $("#home-listings");
    if (fl) {
      var newest = D.listings.slice().sort(function (a, b) { return b.posted.localeCompare(a.posted); }).slice(0, 3);
      fl.innerHTML = newest.map(listingCard).join("");
    }

    var side = $("#home-listings-side");
    if (side) {
      var fresh = D.listings.slice().sort(function (a, b) { return b.posted.localeCompare(a.posted); }).slice(0, 4);
      side.innerHTML = fresh.map(function (l) {
        return '<a class="feed-item" href="listing.html?id=' + encodeURIComponent(l.id) + '" style="align-items:center;">' +
          '<span class="avatar" aria-hidden="true" style="--card-tint: var(' + esc(l.tint) + ')">' + esc(initials(l.seller)) + '</span>' +
          '<span style="flex:1;"><span style="display:block;font-weight:600;font-size:14.5px;">' + esc(l.title) + '</span>' +
          '<span class="meta">' + esc(catLabel(l.category)) + ' · ' + esc(shortName(l.seller)) + '</span></span>' +
          '<span class="listing-price" style="font-size:14px;white-space:nowrap;">' + esc(money(l.price, l.priceUnit)) + '</span>' +
        '</a>';
      }).join("");
    }

    var counts = $("#home-counts");
    if (counts) {
      counts.innerHTML =
        stat(D.listings.length, "items in the market") +
        stat(D.members.length, "family members") +
        stat(upcoming(99).length, "events coming up") +
        stat(D.recipes.length, "shared recipes");
    }
  }
  function stat(n, label) {
    return '<div><div class="stat-n">' + n + '</div><div class="stat-l">' + esc(label) + "</div></div>";
  }
  function upcoming(n) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    return D.events.filter(function (e) { return new Date(e.date + "T12:00:00") >= today; })
      .sort(function (a, b) { return a.date.localeCompare(b.date); }).slice(0, n);
  }

  /* ── family page ───────────────────────────────────────────────────── */
  function initFamily() {
    var albums = $("#family-albums");
    if (albums) {
      var A = [
        { title: "Reunion 2025", count: 148, tint: "--tint-2", note: "Three days, one very competitive egg-and-spoon race." },
        { title: "The cabin kitchen", count: 34, tint: "--tint-3", note: "Before, during, and the countertop that was oak all along." },
        { title: "Ivy's first week", count: 61, tint: "--tint-5", note: "Mostly sleeping. Occasionally not." },
        { title: "Coyote Creek, spring", count: 92, tint: "--tint-1", note: "The orchard, the hens, and Al's tomatoes in progress." },
        { title: "Nora's half-marathon", count: 27, tint: "--tint-4", note: "The finish line, and the face she made at kilometre 19." },
        { title: "Grandpa Al's workshop", count: 45, tint: "--tint-6", note: "Forty years of tools, catalogued at last." }
      ];
      albums.innerHTML = A.map(function (a) {
        return '<figure class="album" style="margin:0;">' +
          '<div class="album-cover" style="--card-tint: var(' + esc(a.tint) + ')" role="img" aria-label="Album cover placeholder for ' + esc(a.title) + '">Photo · replace with your own</div>' +
          "<figcaption><h3>" + esc(a.title) + '</h3><p class="meta">' + a.count + " photos</p>" +
          '<p class="muted" style="font-size:14px;margin:6px 0 0;">' + esc(a.note) + "</p></figcaption>" +
        "</figure>";
      }).join("");
    }

    var members = $("#family-members");
    if (members) {
      members.innerHTML = D.members.map(function (m) {
        return '<div class="member-card">' +
          '<span class="avatar avatar-lg" aria-hidden="true">' + esc(m.initials) + "</span>" +
          "<div><div class=\"m-name\">" + esc(m.name) + '</div><div class="meta">' + esc(m.branch) + " · " + esc(m.place) + "</div>" +
          '<p class="muted" style="font-size:13.5px;margin:6px 0 0;">' + esc(m.role) + "</p></div>" +
        "</div>";
      }).join("");
    }

    var recipes = $("#family-recipes");
    if (recipes) {
      recipes.innerHTML = D.recipes.map(function (r) {
        return '<article class="recipe-card">' +
          "<h3>" + esc(r.title) + "</h3>" +
          '<p class="meta">' + esc(r.by) + " · " + r.minutes + " min</p>" +
          '<p class="muted" style="font-size:14px;margin:0;">' + esc(r.note) + "</p>" +
          '<div class="row" style="gap:6px;margin-top:4px;">' + r.tags.map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") + "</div>" +
        "</article>";
      }).join("");
    }
  }

  /* ── events page ───────────────────────────────────────────────────── */
  function initEvents() {
    var list = $("#events-list");
    if (!list) return;
    var evs = upcoming(99);
    var groups = {};
    evs.forEach(function (e) { (groups[monthLabel(e.date)] = groups[monthLabel(e.date)] || []).push(e); });
    var keys = Object.keys(groups);
    if (keys.length === 0) {
      list.innerHTML = '<div class="state"><h3>No events on the calendar</h3><p>Nothing is scheduled yet. The next Sunday roast will appear here once it is.</p><a class="btn btn-secondary" href="family.html">See family news</a></div>';
      return;
    }
    list.innerHTML = keys.map(function (k) {
      return '<section style="margin-bottom:40px;">' +
        '<h2 class="h3" style="margin-bottom:8px;">' + esc(k) + "</h2>" +
        groups[k].map(function (e) {
          var d = daysUntil(e.date);
          return '<article class="log-row">' +
            '<span class="meta">' + esc(fmtDate(e.date)) + "</span>" +
            "<div><h3>" + esc(e.title) + '</h3><p class="muted" style="font-size:14px;margin:4px 0 0;">' + esc(e.note) + "</p></div>" +
            '<span class="pull meta">' + esc(e.place.split(",")[0]) + " · " + (d > 0 ? "in " + d + "d" : "today") + "<br>" + esc(e.going) + " going</span>" +
          "</article>";
        }).join("") +
      "</section>";
    }).join("");
  }

  /* ── sell form ─────────────────────────────────────────────────────── */
  function initSell() {
    var form = $("#sell-form");
    if (!form) return;
    var summary = $("#form-summary");
    var success = $("#sell-success");

    var FIELDS = [
      { id: "title", label: "Title", test: function (v) { return v.length >= 3 && v.length <= 70 ? "" : (v.length < 3 ? "Give it at least 3 characters." : "Keep the title under 70 characters."); } },
      { id: "category", label: "Category", test: function (v) { return v ? "" : "Pick a category."; } },
      { id: "price", label: "Price", test: function (v) { if (v.trim() === "") return "Enter a price, or 0 for free / borrow."; var n = Number(v); return (isNaN(n) || n < 0) ? "Price must be a number of 0 or more." : ""; } },
      { id: "place", label: "Where it is", test: function (v) { return v.trim() ? "" : "Tell people where to find it."; } },
      { id: "description", label: "Description", test: function (v) { return v.trim().length >= 20 && v.trim().length <= 600 ? "" : (v.trim().length < 20 ? "Write at least 20 characters, a sentence or two." : "Keep it under 600 characters."); } }
    ];

    function fieldWrap(f) { return document.getElementById(f.id); }
    function errorNode(f) { return document.getElementById(f.id + "-error"); }
    function touched(id) { return form.querySelector('[name="' + id + '"]').dataset.touched === "1"; }

    function validateField(f, show) {
      var input = form.querySelector('[name="' + f.id + '"]');
      if (!input) return "";
      var msg = f.test(input.value);
      var wrap = input.closest(".field");
      if (show) {
        if (msg) {
          wrap.classList.add("is-invalid");
          input.setAttribute("aria-invalid", "true");
          var en = errorNode(f);
          if (en) en.textContent = msg;
        } else {
          wrap.classList.remove("is-invalid");
          input.removeAttribute("aria-invalid");
        }
      }
      return msg;
    }

    FIELDS.forEach(function (f) {
      var input = form.querySelector('[name="' + f.id + '"]');
      if (!input) return;
      input.addEventListener("blur", function () {
        input.dataset.touched = "1";
        validateField(f, true);
      });
      input.addEventListener("input", function () {
        if (touched(f.id)) validateField(f, true);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var errors = [];
      FIELDS.forEach(function (f) {
        var msg = validateField(f, true);
        if (msg) errors.push({ field: f, msg: msg });
      });

      if (errors.length) {
        summary.innerHTML = '<h2 tabindex="-1" id="form-summary-h">' + errors.length + (errors.length === 1 ? " problem" : " problems") + " to fix</h2>" +
          "<ul>" + errors.map(function (er) {
            return '<li><a href="#' + er.field.id + '">' + esc(er.field.label + ": " + er.msg) + "</a></li>";
          }).join("") + "</ul>";
        summary.hidden = false;
        var h = document.getElementById("form-summary-h");
        if (h) h.focus();
        return;
      }

      summary.hidden = true;
      var btn = $("#sell-submit");
      if (btn) { btn.disabled = true; btn.textContent = "Posting…"; }
      var status = $("#sell-status");
      if (status) status.textContent = "Posting your listing.";

      window.setTimeout(function () {
        form.hidden = true;
        if (summary) summary.hidden = true;
        var data = new FormData(form);
        var s = $("#sell-success-title");
        if (s) s.textContent = data.get("title") || "Your listing";
        if (success) success.hidden = false;
        var back = $("#sell-back");
        if (back) back.focus();
        if (status) status.textContent = "Your listing was posted.";
      }, 700);
    });

    var again = $("#sell-again");
    if (again) again.addEventListener("click", function () {
      if (success) success.hidden = true;
      form.hidden = false;
      form.reset();
      $all(".field", form).forEach(function (w) { w.classList.remove("is-invalid"); });
      $all("[name]", form).forEach(function (i) { i.dataset.touched = "0"; i.removeAttribute("aria-invalid"); });
      $("#sell-submit").disabled = false;
      $("#sell-submit").textContent = "Post listing";
      var f = form.querySelector('[name="title"]'); if (f) f.focus();
    });
  }

  /* ── boot ──────────────────────────────────────────────────────────── */
  function boot() {
    setChrome();
    initHome();
    initMarket();
    initListing();
    initFamily();
    initEvents();
    initSell();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
