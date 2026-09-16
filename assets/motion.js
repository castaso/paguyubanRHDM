/* Paguyuban RHDM - motion engine.
 *
 * Hand-written, no library: the host serves a strict Content-Security-Policy
 * that blocks external scripts, and this site has no build step.
 *
 * Four moving parts, as requested:
 *   - scroll reveals      [data-reveal]  (optionally data-reveal-delay="1..4")
 *   - parallax layers     [data-parallax="0.12"]
 *   - card hover physics  [data-tilt]    (fine pointers only)
 *   - marquee ticker      .ticker-track  (pure CSS, built by app.js)
 *
 * Everything here is opt-in and reversible: if the visitor prefers reduced
 * motion the script returns immediately and the page renders fully static,
 * with no hidden content waiting on an animation that will never run.
 */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;

  var reduceQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  if (reduceQuery && reduceQuery.matches) return;

  root.setAttribute("data-motion", "on");

  var fineQuery = window.matchMedia ? window.matchMedia("(pointer: fine)") : null;
  var observer = null;
  var parallaxEls = [];
  var ticking = false;

  /* ── scroll reveals ────────────────────────────────────────────────── */
  function observeReveals() {
    var els = doc.querySelectorAll("[data-reveal]:not(.is-in)");
    if (!els.length) return;

    if (!("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(els, function (el) { el.classList.add("is-in"); });
      return;
    }
    if (!observer) {
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -10% 0px", threshold: 0.06 });
    }
    Array.prototype.forEach.call(els, function (el) { observer.observe(el); });
  }

  /* ── parallax ──────────────────────────────────────────────────────── */
  function collectParallax() {
    parallaxEls = Array.prototype.slice.call(doc.querySelectorAll("[data-parallax]"));
  }

  function frame() {
    ticking = false;
    if (!parallaxEls.length) return;
    var mid = window.innerHeight / 2;
    parallaxEls.forEach(function (el) {
      var strength = parseFloat(el.getAttribute("data-parallax"));
      if (isNaN(strength)) strength = 0.12;
      var rect = el.getBoundingClientRect();
      var offset = (rect.top + rect.height / 2 - mid) / window.innerHeight;
      el.style.transform = "translate3d(0," + (offset * strength * -100).toFixed(2) + "px,0)";
    });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(frame);
  }

  /* ── card hover physics ────────────────────────────────────────────── */
  function bindTilt() {
    if (!fineQuery || !fineQuery.matches) return;
    Array.prototype.forEach.call(doc.querySelectorAll("[data-tilt]"), function (el) {
      if (el.getAttribute("data-tilt-bound") === "1") return;
      el.setAttribute("data-tilt-bound", "1");
      el.addEventListener("pointermove", function (ev) {
        var r = el.getBoundingClientRect();
        var px = (ev.clientX - r.left) / r.width - 0.5;
        var py = (ev.clientY - r.top) / r.height - 0.5;
        el.style.transform =
          "perspective(760px) rotateY(" + (px * 7).toFixed(2) + "deg) rotateX(" +
          (-py * 7).toFixed(2) + "deg) translateZ(0)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
      el.addEventListener("blur", function () { el.style.transform = ""; });
    });
  }

  /* ── lifecycle ─────────────────────────────────────────────────────── */
  function init() {
    observeReveals();
    collectParallax();
    bindTilt();
    onScroll();
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () { collectParallax(); onScroll(); }, { passive: true });

  /* app.js re-renders the data sections on language change; re-arm then. */
  doc.addEventListener("alder:langchange", function () {
    window.requestAnimationFrame(function () { window.requestAnimationFrame(init); });
  });

  window.ALDER_MOTION = { init: init, reduced: false };

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", init);
    window.addEventListener("load", init);
  } else {
    init();
  }
})();
