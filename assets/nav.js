/* Paguyuban RHDM - mobile navigation drawer.
 *
 * On desktop the drawer is transparent to layout (display: contents), so the
 * header is unchanged. Below the breakpoint the toggle collapses the nav and
 * the header controls into one panel that expands on click.
 *
 * A disclosure button, not a mystery-meat icon: it is a real <button> with
 * aria-expanded and aria-controls, it closes on Escape, on an outside click,
 * on choosing a link, and when the viewport grows back to desktop.
 */
(function () {
  "use strict";

  var BREAKPOINT = 861;
  var toggle = document.getElementById("nav-toggle");
  var drawer = document.getElementById("nav-drawer");
  if (!toggle || !drawer) return;

  function label(open) {
    var key = open ? "Close menu" : "Menu";
    return window.ALDER_LANG ? window.ALDER_LANG.t(key) : key;
  }
  function isOpen() {
    return document.documentElement.getAttribute("data-nav-open") === "true";
  }
  function set(open) {
    document.documentElement.setAttribute("data-nav-open", open ? "true" : "false");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", label(open));
  }
  function close() {
    if (isOpen()) set(false);
  }

  toggle.addEventListener("click", function (ev) {
    ev.stopPropagation();
    set(!isOpen());
  });

  /* choosing a destination closes the drawer */
  drawer.addEventListener("click", function (ev) {
    var target = ev.target;
    if (target && target.closest && target.closest("a")) close();
  });

  /* clicking away closes it */
  document.addEventListener("click", function (ev) {
    if (!isOpen()) return;
    if (drawer.contains(ev.target) || toggle.contains(ev.target)) return;
    close();
  });

  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" || ev.key === "Esc") close();
  });

  /* never leave it open when the layout returns to desktop */
  window.addEventListener("resize", function () {
    if (window.innerWidth >= BREAKPOINT) close();
  });

  /* the label is translated, so refresh it when the language changes */
  document.addEventListener("alder:langchange", function () {
    toggle.setAttribute("aria-label", label(isOpen()));
  });

  set(false);
  window.ALDER_NAV = { open: function () { set(true); }, close: close, isOpen: isOpen };
})();
