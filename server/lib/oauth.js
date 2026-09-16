"use strict";

/**
 * Google OAuth 2.0 — Authorization Code flow with PKCE, plus real
 * verification of the returned ID token against Google's JWKS.
 * Uses only Node built-ins (node:crypto + global fetch).
 */
const crypto = require("crypto");

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function fromB64url(str) {
  return Buffer.from(String(str).replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function createPkce() {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}
function createState() {
  return b64url(crypto.randomBytes(16));
}

function buildAuthUrl(cfg, opts) {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: opts.state,
    code_challenge: opts.challenge,
    code_challenge_method: "S256",
    access_type: "online",
    prompt: "select_account",
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

async function exchangeCode(cfg, opts) {
  const body = new URLSearchParams({
    code: opts.code,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: cfg.redirectUri,
    grant_type: "authorization_code",
    code_verifier: opts.verifier,
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (err) {
    /* non-JSON error body */
  }
  if (!res.ok || !json) {
    const err = new Error("token_exchange_failed");
    err.status = res.status;
    err.detail = json || text.slice(0, 300);
    throw err;
  }
  return json; // { id_token, access_token, expires_in, ... }
}

/* ── JWKS (cached) ─────────────────────────────────────────────────── */
let jwksCache = { at: 0, keys: [] };

async function getJwks(force) {
  const now = Date.now();
  if (!force && jwksCache.keys.length && now - jwksCache.at < 60 * 60 * 1000) {
    return jwksCache.keys;
  }
  const res = await fetch(JWKS_URI);
  if (!res.ok) throw new Error("jwks_fetch_failed");
  const json = await res.json();
  jwksCache = { at: now, keys: json.keys || [] };
  return jwksCache.keys;
}

function decodeSegment(seg) {
  return JSON.parse(fromB64url(seg).toString("utf8"));
}

/** Verify signature + claims. Throws on any failure. Returns the payload. */
async function verifyIdToken(idToken, opts) {
  const parts = String(idToken || "").split(".");
  if (parts.length !== 3) throw new Error("malformed_id_token");

  const header = decodeSegment(parts[0]);
  const payload = decodeSegment(parts[1]);

  if (header.alg !== "RS256") throw new Error("unexpected_alg");
  if (!opts.audience || payload.aud !== opts.audience) throw new Error("bad_audience");
  if (ISSUERS.indexOf(payload.iss) === -1) throw new Error("bad_issuer");
  if (!payload.exp || Date.now() > payload.exp * 1000 - 5000) throw new Error("token_expired");

  let keys = await getJwks(false);
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    keys = await getJwks(true); // key rotated — refetch once
    jwk = keys.find((k) => k.kid === header.kid);
  }
  if (!jwk) throw new Error("signing_key_not_found");

  const key = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const ok = crypto.verify(
    "sha256",
    Buffer.from(`${parts[0]}.${parts[1]}`),
    key,
    fromB64url(parts[2])
  );
  if (!ok) throw new Error("bad_signature");

  return payload; // { email, email_verified, name, picture, sub, ... }
}

module.exports = { createPkce, createState, buildAuthUrl, exchangeCode, verifyIdToken, ISSUERS };
