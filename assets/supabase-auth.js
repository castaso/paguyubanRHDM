/* Paguyuban RHDM, zero-dependency Supabase Auth client.
 *
 * Talks to the Supabase Auth REST API directly (no supabase-js, no CDN, the
 * host's CSP blocks external scripts). Uses the implicit OAuth flow, which is
 * the right fit for a client-only static site:
 *
 *   1. signInWithGoogle() navigates to  {url}/auth/v1/authorize?provider=google
 *   2. Supabase bounces through Google and returns to redirect_to with
 *      #access_token=…&refresh_token=…&expires_in=… in the URL fragment
 *   3. captureFromUrl() lifts those into storage and scrubs the address bar
 *   4. getSession() refreshes when near expiry and resolves the user via
 *      GET {url}/auth/v1/user
 *
 * The anon key is a public client key by design; it is not a secret.
 * Real enforcement of the allow-list belongs in Postgres RLS, see
 * supabase/schema.sql.
 */
(function () {
  "use strict";

  function createClient(options) {
    var cfg = options || {};
    var base = String(cfg.url || "").replace(/\/+$/, "");
    var anonKey = String(cfg.anonKey || "");
    var storageKey = cfg.storageKey || "alderhouse.supabase.session";
    var configured = !!(base && anonKey);

    /* ── storage ─────────────────────────────────────────────────────── */
    function readStored() {
      try {
        var raw = window.localStorage.getItem(storageKey);
        return raw ? JSON.parse(raw) : null;
      } catch (err) { return null; }
    }
    function save(session) {
      try { window.localStorage.setItem(storageKey, JSON.stringify(session)); } catch (err) {}
    }
    function clearStored() {
      try { window.localStorage.removeItem(storageKey); } catch (err) {}
    }

    /* ── URL fragment (implicit flow) ────────────────────────────────── */
    function parseFragment() {
      var h = window.location.hash || "";
      if (h.length < 2) return null;
      try { return new URLSearchParams(h.slice(1)); } catch (err) { return null; }
    }
    function scrubFragment() {
      try {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      } catch (err) {}
    }

    /** Pull tokens (or an error) out of the fragment. Returns a result object. */
    function captureFromUrl() {
      var p = parseFragment();
      if (!p) return null;

      if (p.get("error")) {
        var msg = p.get("error_description") || p.get("error");
        scrubFragment();
        return { error: msg };
      }
      var access = p.get("access_token");
      if (!access) return null;

      var session = {
        access_token: access,
        refresh_token: p.get("refresh_token") || "",
        token_type: p.get("token_type") || "bearer",
        expires_in: Number(p.get("expires_in") || 3600),
        expires_at: Date.now() + Number(p.get("expires_in") || 3600) * 1000
      };
      save(session);
      scrubFragment();
      return { session: session };
    }

    /* ── requests ────────────────────────────────────────────────────── */
    function headers(token, json) {
      var h = { apikey: anonKey, Authorization: "Bearer " + (token || anonKey) };
      if (json) h["content-type"] = "application/json";
      return h;
    }

    function signInWithGoogle(redirectTo) {
      if (!configured) return null;
      var target = redirectTo || (window.location.origin + window.location.pathname + window.location.search);
      var url = base + "/auth/v1/authorize?provider=google&redirect_to=" + encodeURIComponent(target);
      window.location.href = url;
      return url;
    }

    function fetchUser(accessToken) {
      return fetch(base + "/auth/v1/user", { headers: headers(accessToken) })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }

    function refresh(session) {
      if (!session || !session.refresh_token) return Promise.resolve(null);
      return fetch(base + "/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        headers: headers(null, true),
        body: JSON.stringify({ refresh_token: session.refresh_token })
      })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (!data || !data.access_token) return null;
          var next = {
            access_token: data.access_token,
            refresh_token: data.refresh_token || session.refresh_token,
            token_type: data.token_type || "bearer",
            expires_in: Number(data.expires_in || 3600),
            expires_at: Date.now() + Number(data.expires_in || 3600) * 1000
          };
          save(next);
          return next;
        })
        .catch(function () { return null; });
    }

    /**
     * Resolve the current user, refreshing the token when it is near expiry.
     * Returns { email, id, token } or null.
     */
    function getSession(opts) {
      var force = !!(opts && opts.force);
      var stored = readStored();
      if (!stored) return Promise.resolve(null);

      var nearExpiry = !stored.expires_at || Date.now() > stored.expires_at - 30000;
      var chain = (force || nearExpiry) && stored.refresh_token
        ? refresh(stored)
        : Promise.resolve(stored);

      return chain.then(function (current) {
        if (!current) { clearStored(); return null; }
        return fetchUser(current.access_token).then(function (user) {
          if (!user || !user.email) { clearStored(); return null; }
          return { email: String(user.email).toLowerCase(), id: user.id, token: current.access_token };
        });
      });
    }

    function signOut() {
      var stored = readStored();
      clearStored();
      if (stored && stored.access_token) {
        // Best-effort revoke; the local session is already gone either way.
        try {
          fetch(base + "/auth/v1/logout", { method: "POST", headers: headers(stored.access_token) })
            .catch(function () {});
        } catch (err) {}
      }
    }

    return {
      isConfigured: function () { return configured; },
      url: base,
      signInWithGoogle: signInWithGoogle,
      captureFromUrl: captureFromUrl,
      getSession: getSession,
      refresh: function () { var s = readStored(); return refresh(s); },
      signOut: signOut,
      readStored: readStored,
      clearStored: clearStored
    };
  }

  window.ALDER_SUPABASE = { createClient: createClient };
})();
