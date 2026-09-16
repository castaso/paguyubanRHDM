"use strict";

/**
 * Alder House backend.
 *
 *   - Google OAuth 2.0 (Authorization Code + PKCE) sign-in
 *   - Server-enforced RBAC allow-list (never trusts the browser)
 *   - Signed HttpOnly session cookie
 *   - Serves the PUBLIC static site; the settings area is what's protected
 *     (`/auth/*` and `/api/settings`), not the pages.
 *
 * Run:  node server/server.js     (see server/.env.example)
 */
const http = require("http");
const path = require("path");

const config = require("./config");
const { createRbac } = require("./lib/rbac");
const { createSession, parseCookies } = require("./lib/session");
const oauth = require("./lib/oauth");
const staticSite = require("./lib/static-site");

const rbac = createRbac(config.allowedEmails);
const session = createSession(config.session);

const STATE_COOKIE = "alder_oauth_state";
const VERIFIER_COOKIE = "alder_oauth_verifier";
const NEXT_COOKIE = "alder_oauth_next";
const OAUTH_COOKIE_TTL = 600; // 10 minutes to finish a sign-in

/** Never serve these, even to a signed-in visitor. */
const BLOCKED_PREFIXES = ["/server/", "/.git/", "/.env", "/node_modules/"];

/* ── helpers ────────────────────────────────────────────────────────── */
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function securityHeaders(extra) {
  return Object.assign(
    {
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy": [
        "default-src 'self'",
        "img-src 'self' data:",
        "style-src 'self' 'unsafe-inline'",
        "script-src 'self'",
        "connect-src 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "base-uri 'none'",
      ].join("; "),
    },
    extra || {}
  );
}

function sendHtml(res, status, body, extra) {
  res.writeHead(status, securityHeaders(Object.assign({
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  }, extra || {})));
  res.end(body);
}

function sendJson(res, status, obj, extra) {
  const body = JSON.stringify(obj, null, 2);
  res.writeHead(status, securityHeaders(Object.assign({
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  }, extra || {})));
  res.end(body);
}

function redirect(res, location, cookies) {
  const headers = securityHeaders({ Location: location });
  if (cookies && cookies.length) headers["Set-Cookie"] = cookies;
  res.writeHead(302, headers);
  res.end();
}

function safeNext(value) {
  if (!value || typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

/**
 * The signed-in user for this request, or null.
 * The session cookie proves *who*; the RBAC list decides whether they may
 * still enter — so removing someone from ALLOWED_EMAILS revokes their session
 * on the very next request.
 */
function currentUser(req) {
  const s = session.read(req.headers.cookie);
  if (!s) return null;
  if (!rbac.isAllowed(s.email)) return null;
  return s;
}

/* ── pages ──────────────────────────────────────────────────────────── */
const HOUSE_MARK =
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.7" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M10 20v-5h4v5"/></svg>';

function loginPage(denied) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Sign in · Alder House</title>
<meta name="description" content="Sign in to Alder House with an approved Google account." />
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
<link rel="stylesheet" href="/assets/styles.css" />
</head>
<body>
<div class="auth-gate">
  <div class="auth-card">
    <div class="auth-brand">${HOUSE_MARK} Alder House</div>
    <h1>Sign in to come in</h1>
    <p class="auth-sub">This house is for the family. Access is limited to approved Google accounts.</p>
    ${denied ? `<p class="auth-error" role="alert">${esc(denied)}</p>` : ""}
    <a class="btn btn-primary btn-block auth-google" href="/auth/google"
       style="margin-top:18px;text-decoration:none;">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="4" y="10.5" width="16" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>
      Continue with Google
    </a>
    <p class="auth-foot">Access is checked on the server against the family allow-list. If your account is not on it, you will be turned away.</p>
  </div>
</div>
</body>
</html>`;
}

function errorPage(title, detail) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)} · Alder House</title>
<link rel="stylesheet" href="/assets/styles.css" /></head>
<body><div class="auth-gate"><div class="auth-card">
<div class="auth-brand">${HOUSE_MARK} Alder House</div>
<h1>${esc(title)}</h1>
<p class="auth-sub">${esc(detail)}</p>
<a class="btn btn-secondary btn-block" href="/" style="text-decoration:none;">Back to the house</a>
</div></div></body></html>`;
}

function notFound(res) {
  sendHtml(res, 404, errorPage("Not found", "That page is not here. Check the address and try again."));
}

/* ── auth routes ────────────────────────────────────────────────────── */
function startAuth(req, res, url) {
  if (!config.google.clientId || !config.google.clientSecret) {
    return sendHtml(
      res,
      500,
      errorPage(
        "Google sign-in is not configured",
        "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (copy server/.env.example), then restart the server."
      )
    );
  }
  const { verifier, challenge } = oauth.createPkce();
  const state = oauth.createState();
  const next = safeNext(url.searchParams.get("next"));
  const location = oauth.buildAuthUrl(config.google, { state, challenge });

  redirect(res, location, [
    session.cookie(STATE_COOKIE, state, OAUTH_COOKIE_TTL),
    session.cookie(VERIFIER_COOKIE, verifier, OAUTH_COOKIE_TTL),
    session.cookie(NEXT_COOKIE, next, OAUTH_COOKIE_TTL),
  ]);
}

async function finishAuth(req, res, url) {
  const cookies = parseCookies(req.headers.cookie);
  const googleError = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const deny = (message) =>
    sendHtml(res, 403, loginPage(message), {
      "Set-Cookie": [
        session.clear(STATE_COOKIE),
        session.clear(VERIFIER_COOKIE),
        session.clear(NEXT_COOKIE),
      ],
    });

  if (googleError) return deny(`Google refused the sign-in: ${googleError}.`);
  if (!code) return deny("The sign-in did not return a code. Start again.");
  if (!state || state !== cookies[STATE_COOKIE]) {
    return deny("That sign-in could not be verified (state mismatch). Start again.");
  }

  try {
    const tokens = await oauth.exchangeCode(config.google, {
      code,
      verifier: cookies[VERIFIER_COOKIE],
    });
    const claims = await oauth.verifyIdToken(tokens.id_token, {
      audience: config.google.clientId,
    });
    const email = rbac.normalize(claims.email);

    if (!claims.email_verified) {
      return deny("That Google account has an unverified email address.");
    }
    if (!rbac.isAllowed(email)) {
      // RBAC decision point — server-side, non-negotiable.
      return deny(rbac.denyReason(email));
    }

    const { token } = session.issue(email);
    const next = safeNext(cookies[NEXT_COOKIE]);
    redirect(res, next, [
      session.cookie(config.session.cookieName, token, config.session.ttlSeconds),
      session.clear(STATE_COOKIE),
      session.clear(VERIFIER_COOKIE),
      session.clear(NEXT_COOKIE),
    ]);
  } catch (err) {
    deny(`Google sign-in failed (${err.message}). Try again.`);
  }
}

function signOut(res) {
  redirect(res, "/", [session.clear(config.session.cookieName)]);
}

/* ── static ─────────────────────────────────────────────────────────── */
function serveStatic(req, res, url) {
  const pathname = url.pathname;

  if (BLOCKED_PREFIXES.some((p) => pathname.startsWith(p))) return notFound(res);

  if (staticSite.isPublic(config.publicPrefixes, pathname)) {
    const file = staticSite.resolve(config.siteRoot, pathname);
    if (file && staticSite.send(req, res, file, securityHeaders())) return;
    return notFound(res);
  }

  const file = staticSite.resolve(config.siteRoot, pathname === "/" ? "/index.html" : pathname);
  if (file && staticSite.send(req, res, file, securityHeaders())) return;

  if (!path.extname(pathname)) {
    const idx = staticSite.resolve(config.siteRoot, "/index.html");
    if (idx && staticSite.send(req, res, idx, securityHeaders())) return;
  }
  return notFound(res);
}

/* ── router ─────────────────────────────────────────────────────────── */
async function handle(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (pathname === "/healthz") {
    const s = currentUser(req);
    return sendJson(res, 200, {
      ok: true,
      uptimeSeconds: Math.round(process.uptime()),
      authProvider: "google",
      allowedAccounts: rbac.list.length,
      signedIn: s ? s.email : null,
    });
  }

  if (pathname === "/auth/me") {
    const s = currentUser(req);
    if (!s) return sendJson(res, 401, { authenticated: false });
    return sendJson(res, 200, {
      authenticated: true,
      email: s.email,
      provider: s.provider,
      expiresAt: s.exp ? new Date(s.exp).toISOString() : null,
    });
  }

  if (pathname === "/api/settings") {
    const s = currentUser(req);
    if (!s) {
      return sendJson(res, 401, { error: "unauthorized", signInUrl: "/auth/google" });
    }
    return sendJson(res, 200, {
      signedInAs: s.email,
      provider: s.provider,
      allowedEmails: rbac.list,
      expiresAt: s.exp ? new Date(s.exp).toISOString() : null,
    });
  }

  if (pathname === "/auth/google" && (req.method === "GET" || req.method === "HEAD")) {
    return startAuth(req, res, url);
  }
  if (pathname === "/auth/google/callback" && (req.method === "GET" || req.method === "HEAD")) {
    return finishAuth(req, res, url);
  }
  if (pathname === "/auth/signout") {
    return signOut(res);
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return sendJson(res, 405, { error: "method_not_allowed" });
  }

  return serveStatic(req, res, url);
}

function createServer() {
  return http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      if (!res.headersSent) {
        sendJson(res, 500, { error: "internal_error", message: err.message });
      } else {
        res.end();
      }
    });
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(config.port, config.host, () => {
    const missing = [];
    if (!config.google.clientId) missing.push("GOOGLE_CLIENT_ID");
    if (!config.google.clientSecret) missing.push("GOOGLE_CLIENT_SECRET");
    if (!config.session.secret) missing.push("SESSION_SECRET");

    console.log(`Alder House backend listening on http://localhost:${config.port}`);
    console.log(`  site root     : ${config.siteRoot}`);
    console.log(`  allowed (RBAC): ${rbac.list.join(", ")}`);
    console.log(`  redirect uri  : ${config.google.redirectUri}`);
    if (missing.length) {
      console.warn(`  ⚠ missing env : ${missing.join(", ")} — sign-in will not start until these are set.`);
    }
  });
}

module.exports = { createServer, config, rbac };
