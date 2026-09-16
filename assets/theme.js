/* Paguyuban RHDM, dark / light theme.
 *
 * Loaded in <head> so the attribute is set before first paint: no flash of the
 * wrong theme. Defaults to the system preference and only pins a choice once
 * the visitor uses the toggle.
 *
 * Theme strategy: CSS variables. The tokens live in styles.css (:root and
 * [data-theme="dark"]); this file only decides which one applies.
 */
(function () {
  "use strict";

  var KEY = "alderhouse.theme";
  var root = document.documentElement;

  function stored() {
    try {
      var v = window.localStorage.getItem(KEY);
      return v === "light" || v === "dark" ? v : null;
    } catch (err) { return null; }
  }
  function system() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  function current() { return stored() || system(); }

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    var btn = document.getElementById("theme-toggle");
    if (btn) {
      var next = theme === "dark" ? "light" : "dark";
      btn.setAttribute("aria-label", "Switch to " + next + " mode");
      btn.setAttribute("title", "Switch to " + next + " mode");
    }
  }

  function set(theme) {
    try { window.localStorage.setItem(KEY, theme); } catch (err) {}
    apply(theme);
  }

  /* Set the theme before the body paints. */
  apply(current());

  var SUN = '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/></svg>';
  var MOON = '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M20.5 14.2A8.6 8.6 0 0 1 9.8 3.5a7.4 7.4 0 1 0 10.7 10.7z"/></svg>';

  function build() {
    var host = document.querySelector(".topnav-actions") || document.querySelector(".topnav-inner");
    if (!host || document.getElementById("theme-toggle")) return;

    var btn = document.createElement("button");
    btn.className = "icon-btn";
    btn.type = "button";
    btn.id = "theme-toggle";
    btn.innerHTML = SUN + MOON;
    btn.addEventListener("click", function () {
      set(current() === "dark" ? "light" : "dark");
    });
    host.appendChild(btn);
    apply(current());
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();

  /* Follow the system while the visitor has not made an explicit choice. */
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var onSystemChange = function () { if (!stored()) apply(system()); };
    if (mq.addEventListener) mq.addEventListener("change", onSystemChange);
    else if (mq.addListener) mq.addListener(onSystemChange);
  }

  window.ALDER_THEME = { get: current, set: set, key: KEY };
})();
