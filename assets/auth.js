/* Paguyuban RHDM, settings panel + RBAC sign-in.
 *
 * The site itself is PUBLIC. Sign-in is only offered from the invisible
 * settings cog in the top-right of the header: clicking it opens the panel,
 * which asks for an approved account before showing the settings.
 *
 * Three modes, chosen by CFG.authMode:
 *
 *   "prototype" (default), browser-only. Required on the static preview, which
 *       has no server. CAN BE BYPASSED; it guards a settings panel, not content.
 *
 *   "supabase", Supabase Auth with the Google provider, via
 *       assets/supabase-auth.js (no SDK, no CDN). Set supabase.url +
 *       supabase.anonKey. Enforcement belongs in Postgres RLS, see
 *       supabase/schema.sql.
 *
 *   "server" , the backend in ../server (Google OAuth directly + signed session
 *       cookie). Set authMode:"server" and apiBase.
 */
(function () {
  "use strict";

  var CFG = {
    /* "prototype" | "supabase" | "server" */
    authMode: "prototype",

    /* Backend origin for server mode. "" = same origin. */
    apiBase: "",

    /* Supabase project settings (authMode: "supabase"). The anon key is a
       public client key, it is not a secret. */
    supabase: {
      url: "",                        // e.g. "https://abcdefgh.supabase.co"
      anonKey: "",                    // Project Settings → API → anon public
      storageKey: "alderhouse.supabase.session"
    },

    /* RBAC, the same list must exist in supabase/schema.sql (server-enforced). */
    allowedEmails: ["paguyubanRHDM@gmail.com", "castasoft@gmail.com"],
    sessionKey: "alderhouse.session.v1",
    prototype: true
  };

  var MODE = CFG.authMode === "supabase" ? "supabase"
    : CFG.authMode === "server" ? "server"
    : "prototype";

  var serverSession = null;   // server mode
  var supabaseUser = null;    // supabase mode: { email, id }
  var supabaseDenied = null;  // supabase: an email that authenticated but failed RBAC
  var authError = null;       // message to surface in the panel

  var client = (MODE === "supabase" && window.ALDER_SUPABASE)
    ? window.ALDER_SUPABASE.createClient(CFG.supabase)
    : null;

  /* ── prototype session helpers ────────────────────────────────────── */
  function normalize(e) { return String(e == null ? "" : e).trim().toLowerCase(); }
  function isAllowed(e) { return CFG.allowedEmails.indexOf(normalize(e)) !== -1; }

  function readLocalSession() {
    try {
      var raw = window.localStorage.getItem(CFG.sessionKey);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !isAllowed(s.email)) return null;
      return s;
    } catch (err) { return null; }
  }
  function writeLocalSession(email) {
    var s = { email: normalize(email), at: Date.now(), provider: CFG.provider || "google" };
    try { window.localStorage.setItem(CFG.sessionKey, JSON.stringify(s)); } catch (err) {}
    return s;
  }
  function clearLocalSession() { try { window.localStorage.removeItem(CFG.sessionKey); } catch (err) {} }

  function currentSession() {
    if (MODE === "server") return serverSession;
    if (MODE === "supabase") return supabaseUser;
    return readLocalSession();
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function initialsOf(email) { return normalize(email).slice(0, 2).toUpperCase(); }

  window.ALDER_AUTH = {
    config: CFG,
    mode: MODE,
    session: currentSession,
    isAllowed: isAllowed,
    allowedEmails: function () { return CFG.allowedEmails.slice(); },
    signIn: function (email) {
      if (MODE === "supabase") {
        if (client && client.isConfigured()) client.signInWithGoogle();
        return null;
      }
      if (MODE === "server") {
        window.location.href = CFG.apiBase + "/auth/google?next=" +
          encodeURIComponent(window.location.pathname + window.location.search);
        return null;
      }
      if (!isAllowed(email)) return null;
      return writeLocalSession(email);
    },
    signOut: function () {
      if (MODE === "supabase") {
        if (client) client.signOut();
        supabaseUser = null;
        supabaseDenied = null;
        authError = null;
        return;
      }
      if (MODE === "server") { window.location.href = CFG.apiBase + "/auth/signout"; return; }
      clearLocalSession();
    },
    refresh: function () { if (window.ALDER_SETTINGS) window.ALDER_SETTINGS.refresh(); }
  };

  /* ── panel content ────────────────────────────────────────────────── */
  var GOOGLE_ICON =
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="4" y="10.5" width="16" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>';

  function googleButton(id, label) {
    return '<button class="btn btn-primary btn-block auth-google" type="button" id="' + id + '">' +
      GOOGLE_ICON + " " + (label || "Continue with Google") + "</button>";
  }

  function providerLabel() {
    return MODE === "supabase" ? "supabase auth" : MODE === "server" ? "server session" : "prototype";
  }

  function signInBlock() {
    /* Supabase, but not wired up yet. */
    if (MODE === "supabase" && (!client || !client.isConfigured())) {
      return '<div class="notice" style="display:block;">' +
        '<strong>Supabase is not configured.</strong>' +
        '<p style="margin:6px 0 0;">Set <span class="kbd">supabase.url</span> and ' +
        '<span class="kbd">supabase.anonKey</span> in <span class="kbd">assets/auth.js</span>. ' +
        'Setup steps: <span class="kbd">supabase/README.md</span>.</p>' +
      "</div>";
    }

    /* Supabase with the Google provider. */
    if (MODE === "supabase") {
      var err = authError
        ? '<p class="auth-error" role="alert">' + esc(authError) + "</p>"
        : "";
      var denied = supabaseDenied
        ? '<p class="auth-error" role="alert">Access denied, ' + esc(supabaseDenied) +
          " is not on the access list (RBAC). Only approved family accounts may sign in.</p>"
        : "";
      return googleButton("signin-google") +
        '<p class="auth-note" style="margin-top:14px;">You will be sent to Google. On return, Supabase hands the session back to this page.</p>' +
        err + denied;
    }

    /* Server mode. */
    if (MODE === "server") {
      return '<a class="btn btn-primary btn-block auth-google" href="' + CFG.apiBase +
        "/auth/google?next=" + encodeURIComponent(window.location.pathname + window.location.search) +
        '" style="text-decoration:none;">' + GOOGLE_ICON + " Continue with Google</a>";
    }

    /* Prototype. */
    return googleButton("signin-start") +
      '<div id="signin-step2" hidden style="margin-top:14px;">' +
        '<p class="auth-note">Google\'s account chooser cannot load on this static preview, cross-origin requests are blocked here. Enter the account email to continue. On a real deployment this step is Google\'s.</p>' +
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
        signInBlock();
    }
    return '<p class="eyebrow" style="margin-bottom:10px;">Account</p>' +
      '<div class="row" style="gap:12px;">' +
        '<span class="avatar" aria-hidden="true">' + esc(initialsOf(s.email)) + "</span>" +
        '<div><div style="font-weight:600;">' + esc(s.email) + "</div>" +
        '<div class="meta">signed in · ' + esc(s.provider || providerLabel()) + " · " + providerLabel() + "</div></div>" +
      "</div>" +
      '<button class="btn btn-secondary btn-sm" type="button" id="settings-signout" style="margin-top:16px;">Sign out</button>';
  }

  var RBAC_SECTION =
    '<section>' +
      '<p class="eyebrow" style="margin-bottom:10px;">Access control (RBAC)</p>' +
      '<p class="muted" style="font-size:13.5px;margin:0 0 10px;">Only these accounts may sign in:</p>' +
      '<ul class="settings-list" id="settings-allow"></ul>' +
      '<p class="meta" style="margin-top:12px;">' +
        (MODE === "supabase"
          ? 'Client list: <span class="kbd">assets/auth.js</span> → <span class="kbd">allowedEmails</span>. Enforced list: the <span class="kbd">allowed_emails</span> table + RLS in <span class="kbd">supabase/schema.sql</span>, keep the two in sync.'
          : 'Edit the list in <span class="kbd">assets/auth.js</span> → <span class="kbd">allowedEmails</span> (prototype) or the server\'s <span class="kbd">ALLOWED_EMAILS</span> env var (server mode).') +
      "</p>" +
    "</section>";

  function enforceText() {
    if (MODE === "supabase") {
      return "Supabase Auth verifies the Google identity and hands this page a signed session. The allow-list is enforced in Postgres with row level security, so the database itself refuses a non-listed account, see <span class=\"kbd\">supabase/schema.sql</span>.";
    }
    if (MODE === "server") {
      return "Enforced on the server: Google OAuth 2.0, a verified ID token or Supabase JWT, a signed HttpOnly session cookie, and the allow-list re-checked on every request.";
    }
    return "This protects the settings panel, not the site, the pages stay public. The check currently runs in the browser and can be bypassed; real enforcement needs Supabase RLS or the server in <span class=\"kbd\">server/</span>. See <span class=\"kbd\">README.md</span>.";
  }

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
        '<section id="settings-admin"></section>' +
        RBAC_SECTION +
        '<section>' +
          '<p class="eyebrow" style="margin-bottom:10px;">How this is enforced</p>' +
          '<p class="muted" style="font-size:13.5px;margin:0;">' + enforceText() + "</p>" +
        "</section>" +
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

      var admin = document.getElementById("settings-admin");
      if (admin) {
        admin.innerHTML = s
          ? '<p class="eyebrow" style="margin-bottom:10px;">Admin</p>' +
            '<p class="muted" style="font-size:13.5px;margin:0 0 14px;">You can set up and post goods and services.</p>' +
            '<a class="btn btn-secondary btn-sm" href="sell.html" style="text-decoration:none;">Post a listing</a>'
          : "";
      }
      applyAdminGate();

      var out = document.getElementById("settings-signout");
      if (out) {
        out.addEventListener("click", function () {
          window.ALDER_AUTH.signOut();
          if (MODE === "server") return; // full redirect
          render();
        });
      }

      if (MODE === "supabase") {
        var g = document.getElementById("signin-google");
        if (g) g.addEventListener("click", function () { if (client) client.signInWithGoogle(); });
        return;
      }

      if (MODE === "server") return;

      /* prototype */
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
          error.textContent = "Access denied, " + normalize(val) + " is not on the access list (RBAC). Only approved family accounts may sign in.";
          email.setAttribute("aria-invalid", "true");
          email.focus();
          return;
        }
        render();
      });
    }

    function open() {
      lastFocus = document.activeElement;
      if (MODE === "server") {
        refreshServerSession().then(function () { render(); });
      } else if (MODE === "supabase") {
        refreshSupabaseSession().then(function () { render(); });
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

  /**
   * Selling is admin-only. Any element marked [data-requires-admin] stays hidden
   * until an admin is signed in, and its sibling #admin-restricted takes over
   * with a sign-in prompt.
   */
  function applyAdminGate() {
    var area = document.querySelector("[data-requires-admin]");
    if (!area) return;
    var restricted = document.getElementById("admin-restricted");
    var signedIn = !!currentSession();
    area.hidden = !signedIn;
    if (restricted) restricted.hidden = signedIn;
    if (!signedIn && restricted && restricted.getAttribute("data-wired") !== "1") {
      var b = document.getElementById("admin-signin");
      if (b) {
        b.addEventListener("click", function () {
          if (window.ALDER_SETTINGS) window.ALDER_SETTINGS.open();
        });
      }
      restricted.setAttribute("data-wired", "1");
    }
  }

  /* ── session resolution ───────────────────────────────────────────── */
  function refreshServerSession() {
    return fetch(CFG.apiBase + "/auth/me", { credentials: "include", headers: { accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        serverSession = data && data.authenticated ? { email: data.email, provider: data.provider } : null;
      })
      .catch(function () { serverSession = null; });
  }

  function refreshSupabaseSession() {
    if (!client || !client.isConfigured()) return Promise.resolve(null);
    return client.getSession().then(function (user) {
      if (!user) { supabaseUser = null; return null; }
      if (!isAllowed(user.email)) {
        supabaseUser = null;
        supabaseDenied = user.email;
        return null;
      }
      supabaseDenied = null;
      supabaseUser = { email: user.email, provider: "google", id: user.id };
      return supabaseUser;
    });
  }

  function init() {
    buildSettings();

    if (MODE === "supabase") {
      applyAdminGate();
      if (!client || !client.isConfigured()) return;
      var captured = client.captureFromUrl();
      if (captured && captured.error) authError = "Sign-in was not completed: " + captured.error;
      refreshSupabaseSession().then(function () {
        if (window.ALDER_SETTINGS) window.ALDER_SETTINGS.refresh();
        applyAdminGate();
      });
      return;
    }

    if (MODE === "server") {
      applyAdminGate();
      refreshServerSession().then(applyAdminGate);
      return;
    }

    applyAdminGate();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
