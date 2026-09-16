/* Alder House — access control (RBAC) + settings panel.
 *
 * Two modes, chosen by CFG.authMode:
 *
 *   "prototype" (default) — a browser-only gate. Required for the static
 *       preview, which has no server. CAN BE BYPASSED; see README.md.
 *
 *   "server"  — talks to the backend in ../server (Google OAuth + a signed
 *       session cookie + server-enforced RBAC). Set authMode:"server" and
 *       apiBase once the backend is deployed.
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

  var root = document.documentElement;
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

  var session = readSession();
  // Set synchronously (this script is in <head>) so the page never flashes.
  // In server mode we start locked and unlock once /auth/me answers.
  root.setAttribute("data-auth", SERVER_MODE ? "locked" : (session ? "open" : "locked"));

  function currentSession() { return SERVER_MODE ? serverSession : readSession(); }

  window.ALDER_AUTH = {
    config: CFG,
    mode: SERVER_MODE ? "server" : "prototype",
    session: currentSession,
    isAllowed: isAllowed,
    allowedEmails: function () { return CFG.allowedEmails.slice(); },
    signIn: function (email) {
      if (SERVER_MODE) { window.location.href = CFG.apiBase + "/auth/google"; return null; }
      if (!isAllowed(email)) return null;
      session = writeSession(email);
      root.setAttribute("data-auth", "open");
      return session;
    },
    signOut: function () {
      if (SERVER_MODE) { window.location.href = CFG.apiBase + "/auth/signout"; return; }
      clearSession();
      session = null;
      root.setAttribute("data-auth", "locked");
    }
  };

  /* ── the gate ─────────────────────────────────────────────────────── */
  var GOOGLE_BTN =
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="4" y="10.5" width="16" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg> Continue with Google';

  function buildGate() {
    var g = document.createElement("div");
    g.className = "auth-gate";
    g.setAttribute("role", "dialog");
    g.setAttribute("aria-modal", "true");
    g.setAttribute("aria-labelledby", "auth-h");

    var primary = SERVER_MODE
      ? '<a class="btn btn-primary btn-block auth-google" href="' +
          CFG.apiBase + "/auth/google?next=" + encodeURIComponent(location.pathname + location.search) +
          '" style="text-decoration:none;">' + GOOGLE_BTN + "</a>"
      : '<button class="btn btn-primary btn-block auth-google" type="button" id="auth-start">' + GOOGLE_BTN + "</button>";

    var step2 = SERVER_MODE
      ? ""
      : '<div class="auth-step" id="auth-step2" hidden>' +
          '<p class="auth-note">Google\'s account chooser cannot load on this static preview — cross-origin requests are blocked here. Enter the account email to continue. On a real deployment this step is Google\'s.</p>' +
          '<form id="auth-form" novalidate>' +
            '<div class="field" style="margin-bottom:10px;">' +
              '<label for="auth-email">Google account email</label>' +
              '<input class="input" id="auth-email" name="email" type="email" autocomplete="email" placeholder="name@gmail.com" aria-describedby="auth-error" />' +
            "</div>" +
            '<button class="btn btn-primary btn-block" type="submit" id="auth-submit">Sign in</button>' +
          "</form>" +
        "</div>";

    var badge = SERVER_MODE
      ? ""
      : '<p class="auth-badge">Prototype gate · not real authentication</p>';

    g.innerHTML =
      '<div class="auth-card">' +
        '<div class="auth-brand">' +
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.7" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M10 20v-5h4v5"/></svg>' +
          "Alder House</div>" +
        '<h1 id="auth-h">Sign in to come in</h1>' +
        '<p class="auth-sub">This house is for the family. Access is limited to approved Google accounts.</p>' +
        '<div class="auth-step">' + primary + "</div>" +
        step2 +
        '<p class="auth-error" id="auth-error" role="alert"></p>' +
        '<p class="auth-foot">' +
          (SERVER_MODE
            ? "Access is checked on the server against the family allow-list. If your account is not on it, you will be turned away."
            : "Signed in with an account that is not on the access list? It will be refused. Ask the organiser to add you.") +
        "</p>" +
        badge +
      "</div>";

    document.body.appendChild(g);

    if (SERVER_MODE) {
      var link = g.querySelector("a.btn");
      if (link) link.focus();
      return g;
    }

    var start = g.querySelector("#auth-start");
    var step2El = g.querySelector("#auth-step2");
    var form = g.querySelector("#auth-form");
    var email = g.querySelector("#auth-email");
    var error = g.querySelector("#auth-error");

    start.addEventListener("click", function () {
      start.hidden = true;
      step2El.hidden = false;
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
      error.textContent = "";
      dismissGate(g);
    });

    start.focus();
    return g;
  }

  function dismissGate(g) {
    g.remove();
    if (window.ALDER_SETTINGS) window.ALDER_SETTINGS.refresh();
  }

  /* ── the settings cog + panel ─────────────────────────────────────── */
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
        '<section>' +
          '<p class="eyebrow" style="margin-bottom:10px;">Access control (RBAC)</p>' +
          '<p class="muted" style="font-size:13.5px;margin:0 0 10px;">Only these accounts may sign in:</p>' +
          '<ul class="settings-list" id="settings-allow"></ul>' +
          '<p class="meta" style="margin-top:12px;">Edit the list in <span class="kbd">assets/auth.js</span> → <span class="kbd">allowedEmails</span> (prototype) or the server\'s <span class="kbd">ALLOWED_EMAILS</span> env var (server mode).</p>' +
        "</section>" +
        '<section>' +
          '<p class="eyebrow" style="margin-bottom:10px;">How this is enforced</p>' +
          '<p class="muted" style="font-size:13.5px;margin:0;">' +
            (SERVER_MODE
              ? "Enforced on the server: Google OAuth 2.0, a verified ID token, a signed HttpOnly session cookie, and the allow-list re-checked on every request."
              : "On this static preview the check runs in the browser and can be bypassed. Real enforcement needs the server in <span class=\"kbd\">server/</span>. See <span class=\"kbd\">README.md</span>.") +
          "</p>" +
        "</section>" +
      "</div>";
    document.body.appendChild(scrim);

    var panel = scrim.querySelector(".settings-panel");
    var lastFocus = null;

    function render() {
      var s = currentSession();
      var account = document.getElementById("settings-account");
      if (s) {
        account.innerHTML =
          '<p class="eyebrow" style="margin-bottom:10px;">Account</p>' +
          '<div class="row" style="gap:12px;">' +
            '<span class="avatar" aria-hidden="true">' + initialsOf(s.email) + "</span>" +
            "<div><div style=\"font-weight:600;\">" + s.email + '</div>' +
            '<div class="meta">signed in · ' + s.provider + " · " + (SERVER_MODE ? "server session" : "prototype") + "</div></div>" +
          "</div>" +
          '<button class="btn btn-secondary btn-sm" type="button" id="settings-signout" style="margin-top:14px;">Sign out</button>';
        account.querySelector("#settings-signout").addEventListener("click", function () {
          window.ALDER_AUTH.signOut();
          if (SERVER_MODE) return; // full redirect
          close();
          showGate();
        });
      } else {
        account.innerHTML = '<p class="eyebrow" style="margin-bottom:10px;">Account</p><p class="muted" style="font-size:13.5px;margin:0;">Not signed in.</p>';
      }
      document.getElementById("settings-allow").innerHTML = window.ALDER_AUTH.allowedEmails().map(function (e) {
        return "<li><span>" + e + '</span><span class="badge badge-ok"><span class="dot"></span>allowed</span></li>';
      }).join("");
    }

    function open() {
      lastFocus = document.activeElement;
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

  var gateEl = null;
  function showGate() {
    if (!gateEl || !document.body.contains(gateEl)) gateEl = buildGate();
  }

  /* ── server-mode session check ────────────────────────────────────── */
  function checkServerSession() {
    return fetch(CFG.apiBase + "/auth/me", { credentials: "include", headers: { accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        serverSession = data && data.authenticated ? { email: data.email, provider: data.provider } : null;
      })
      .catch(function () { serverSession = null; });
  }

  function init() {
    buildSettings();
    if (SERVER_MODE) {
      checkServerSession().then(function () {
        root.setAttribute("data-auth", serverSession ? "open" : "locked");
        if (!serverSession) showGate();
        if (window.ALDER_SETTINGS) window.ALDER_SETTINGS.refresh();
      });
      return;
    }
    if (root.getAttribute("data-auth") === "locked") showGate();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
