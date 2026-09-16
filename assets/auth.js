/* Alder House — settings panel + RBAC sign-in.
 *
 * The site itself is PUBLIC. Sign-in is only offered from the invisible
 * settings cog in the top-right of the header: clicking it opens the panel,
 * which asks for an approved Google account before showing the settings.
 *
 * Two modes, chosen by CFG.authMode:
 *
 *   "prototype" (default) — browser-only. Required on the static preview,
 *       which has no server. CAN BE BYPASSED; it guards a settings panel, not
 *       content. See README.md.
 *
 *   "server"  — talks to the backend in ../server (Google OAuth + signed
 *       session cookie + server-enforced RBAC). Set authMode:"server" once the
 *       backend is deployed.
 */
(function () {
  "use strict";

  var CFG = {
    provider: "google",

    /* "prototype" | "server" */
    authMode: "prototype",
    /* Backend origin. "" = same origin (usual when the backend serves the site). */
    apiBase: "",

    allowedEmails: ["paguyubanRHDM@gmail.com", "castasoft@gmail.com"],
    sessionKey: "alderhouse.session.v1",
    prototype: true
  };

  var SERVER_MODE = CFG.authMode === "server";
  var serverSession = null;

  /* ── session helpers (prototype mode) ─────────────────────────────── */
  function normalize(e) { return String(e == null ? "" : e).trim().toLowerCase(); }
  function isAllowed(e) { return CFG.allowedEmails.indexOf(normalize(e)) !== -1; }
  function readSession() {
    try {
      var raw = window.localStorage.getItem(CFG.sessionKey);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !isAllowed(s.email)) return null;
      return s;
    } catch (err) { return null; }
  }
  function writeSession(email) {
    var s = { email: normalize(email), at: Date.now(), provider: CFG.provider };
    try { window.localStorage.setItem(CFG.sessionKey, JSON.stringify(s)); } catch (err) {}
    return s;
  }
  function clearSession() { try { window.localStorage.removeItem(CFG.sessionKey); } catch (err) {} }
  function initialsOf(email) { return normalize(email).slice(0, 2).toUpperCase(); }
  function currentSession() { return SERVER_MODE ? serverSession : readSession(); }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  window.ALDER_AUTH = {
    config: CFG,
    mode: SERVER_MODE ? "server" : "prototype",
    session: currentSession,
    isAllowed: isAllowed,
    allowedEmails: function () { return CFG.allowedEmails.slice(); },
    signIn: function (email) {
      if (SERVER_MODE) {
        window.location.href = CFG.apiBase + "/auth/google?next=" +
          encodeURIComponent(location.pathname + location.search);
        return null;
      }
      if (!isAllowed(email)) return null;
      return writeSession(email);
    },
    signOut: function () {
      if (SERVER_MODE) { window.location.href = CFG.apiBase + "/auth/signout"; return; }
      clearSession();
    },
    refresh: function () { if (window.ALDER_SETTINGS) window.ALDER_SETTINGS.refresh(); }
  };

  /* ── panel content ────────────────────────────────────────────────── */
  var GOOGLE_ICON =
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="4" y="10.5" width="16" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>';

  function signOutPanel() {
    if (SERVER_MODE) {
      return '<a class="btn btn-primary btn-block auth-google" href="' + CFG.apiBase +
        "/auth/google?next=" + encodeURIComponent(location.pathname + location.search) +
        '" style="text-decoration:none;">' + GOOGLE_ICON + " Continue with Google</a>";
    }
    return '' +
      '<button class="btn btn-primary btn-block auth-google" type="button" id="signin-start">' +
        GOOGLE_ICON + " Continue with Google</button>" +
      '<div id="signin-step2" hidden style="margin-top:14px;">' +
        '<p class="auth-note">Google\'s account chooser cannot load on this static preview — cross-origin requests are blocked here. Enter the account email to continue. On a real deployment this step is Google\'s.</p>' +
        '<form id="signin-form" novalidate>' +
          '<div class="field" style="margin-bottom:10px;">' +
            '<label for="signin-email">Google account email</label>' +
            '<input class="input" id="signin-email" name="email" type="email" autocomplete="email" placeholder="name@gmail.com" aria-describedby="signin-error" />' +
          "</div>" +
          '<button class="btn btn-primary btn-block" type="submit">Sign in</button>' +
        "</form>" +
      "</div>" +
      '<p class="auth-error" id="signin-error" role="alert"></p>' +
      '<p class="auth-badge">Prototype gate · not real authentication</p>';
  }

  function accountPanel(s) {
    if (!s) {
      return '<p class="eyebrow" style="margin-bottom:10px;">Account</p>' +
        '<h3 style="margin-bottom:8px;">Sign in</h3>' +
        '<p class="muted" style="font-size:13.5px;margin:0 0 16px;">Sign in with an approved Google account to change the house settings.</p>' +
        signOutPanel();
    }
    return '<p class="eyebrow" style="margin-bottom:10px;">Account</p>' +
      '<div class="row" style="gap:12px;">' +
        '<span class="avatar" aria-hidden="true">' + esc(initialsOf(s.email)) + "</span>" +
        '<div><div style="font-weight:600;">' + esc(s.email) + "</div>" +
        '<div class="meta">signed in · ' + esc(s.provider) + " · " + (SERVER_MODE ? "server session" : "prototype") + "</div></div>" +
      "</div>" +
      '<button class="btn btn-secondary btn-sm" type="button" id="settings-signout" style="margin-top:16px;">Sign out</button>';
  }

  var RBAC_SECTION =
    '<section>' +
      '<p class="eyebrow" style="margin-bottom:10px;">Access control (RBAC)</p>' +
      '<p class="muted" style="font-size:13.5px;margin:0 0 10px;">Only these accounts may sign in:</p>' +
      '<ul class="settings-list" id="settings-allow"></ul>' +
      '<p class="meta" style="margin-top:12px;">Edit the list in <span class="kbd">assets/auth.js</span> → <span class="kbd">allowedEmails</span> (prototype) or the server\'s <span class="kbd">ALLOWED_EMAILS</span> env var (server mode).</p>' +
    "</section>";

  var ENFORCE_SECTION =
    '<section>' +
      '<p class="eyebrow" style="margin-bottom:10px;">How this is enforced</p>' +
      '<p class="muted" style="font-size:13.5px;margin:0;">' +
        (SERVER_MODE
          ? "Enforced on the server: Google OAuth 2.0, a verified ID token, a signed HttpOnly session cookie, and the allow-list re-checked on every request."
          : "This protects the settings panel, not the site — the pages stay public. The check currently runs in the browser and can be bypassed; real enforcement needs the server in <span class=\"kbd\">server/</span>. See <span class=\"kbd\">README.md</span>.") +
      "</p>" +
    "</section>";

  /* ── the cog + panel ──────────────────────────────────────────────── */
  function buildSettings() {
    var actions = document.querySelector(".topnav-actions") || document.querySelector(".topnav-inner");
    if (!actions) return;

    var cog = document.createElement("button");
    cog.className = "cog";
    cog.type = "button";
    cog.id = "settings-cog";
    cog.setAttribute("aria-label", "Settings");
    cog.setAttribute("aria-haspopup", "dialog");
    cog.setAttribute("aria-expanded", "false");
    cog.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="3.1"/><path d="M19.5 12a7.5 7.5 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.6 3h-3.9l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.5 7.5 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h3.9l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.06-.4.1-.8.1-1.2z"/></svg>';
    actions.appendChild(cog);

    var scrim = document.createElement("div");
    scrim.className = "settings-scrim";
    scrim.id = "settings-scrim";
    scrim.hidden = true;
    scrim.innerHTML =
      '<div class="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-h" tabindex="-1">' +
        '<div class="settings-head">' +
          '<h2 id="settings-h" class="h3">Settings</h2>' +
          '<button class="btn btn-ghost btn-sm" type="button" id="settings-close" aria-label="Close settings">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>' +
          "</button>" +
        "</div>" +
        '<section id="settings-account"></section>' +
        RBAC_SECTION +
        ENFORCE_SECTION +
      "</div>";
    document.body.appendChild(scrim);

    var panel = scrim.querySelector(".settings-panel");
    var lastFocus = null;

    function render() {
      var s = currentSession();
      document.getElementById("settings-account").innerHTML = accountPanel(s);
      document.getElementById("settings-allow").innerHTML = CFG.allowedEmails.map(function (e) {
        return "<li><span>" + esc(e) + '</span><span class="badge badge-ok"><span class="dot"></span>allowed</span></li>';
      }).join("");

      var out = document.getElementById("settings-signout");
      if (out) {
        out.addEventListener("click", function () {
          window.ALDER_AUTH.signOut();
          if (SERVER_MODE) return; // full redirect to /auth/signout
          render();
        });
      }

      if (SERVER_MODE) return;

      var start = document.getElementById("signin-start");
      var step2 = document.getElementById("signin-step2");
      var form = document.getElementById("signin-form");
      var email = document.getElementById("signin-email");
      var error = document.getElementById("signin-error");
      if (!start) return;

      start.addEventListener("click", function () {
        start.hidden = true;
        step2.hidden = false;
        email.focus();
      });

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var val = email.value;
        if (!val || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          error.textContent = "That does not look like an email address.";
          email.focus();
          return;
        }
        if (!window.ALDER_AUTH.signIn(val)) {
          error.textContent = "Access denied — " + normalize(val) + " is not on the access list (RBAC). Only approved family accounts may sign in.";
          email.setAttribute("aria-invalid", "true");
          email.focus();
          return;
        }
        render(); // now signed in — swap to the account view
      });
    }

    function refreshServerSession() {
      return fetch(CFG.apiBase + "/auth/me", { credentials: "include", headers: { accept: "application/json" } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          serverSession = data && data.authenticated ? { email: data.email, provider: data.provider } : null;
        })
        .catch(function () { serverSession = null; });
    }

    function open() {
      lastFocus = document.activeElement;
      if (SERVER_MODE) {
        refreshServerSession().then(function () { render(); });
      } else {
        render();
      }
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
    function onKey(e) {
      if (e.key === "Escape") { close(); return; }
      if (e.key !== "Tab") return;
      var f = panel.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    cog.addEventListener("click", function () { scrim.hidden ? open() : close(); });
    scrim.addEventListener("click", function (e) { if (e.target === scrim) close(); });
    document.getElementById("settings-close").addEventListener("click", close);

    window.ALDER_SETTINGS = { refresh: render, open: open, close: close };
  }

  function init() {
    buildSettings();
    if (SERVER_MODE) refreshServerSessionQuietly();
  }

  function refreshServerSessionQuietly() {
    fetch(CFG.apiBase + "/auth/me", { credentials: "include", headers: { accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        serverSession = data && data.authenticated ? { email: data.email, provider: data.provider } : null;
      })
      .catch(function () {});
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
