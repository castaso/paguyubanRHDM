"use strict";

/**
 * Verify a Supabase Auth access token (JWT), so the backend can accept a
 * Supabase-issued session and still apply the allow-list itself.
 *
 * Two signing schemes are supported, because Supabase projects differ:
 *   - HS256 — the project's legacy JWT secret (SUPABASE_JWT_SECRET)
 *   - RS256 / ES256 — the project's JWKS at
 *     {SUPABASE_URL}/auth/v1/.well-known/jwks.json (newer projects)
 */
const crypto = require("crypto");

const JWKS_PATH = "/auth/v1/.well-known/jwks.json";
const ISSUER_SUFFIX = "/auth/v1";
const ALLOWED_ALGS = ["HS256", "RS256", "ES256"];

function fromB64url(str) {
  return Buffer.from(String(str).replace(/-/g, "+").replace(/_/g, "/"), "base64");
}
function decodeSegment(seg) {
  return JSON.parse(fromB64url(seg).toString("utf8"));
}
function stripSlash(url) {
  return String(url || "").replace(/\/+$/, "");
}

let jwksCache = { at: 0, url: "", keys: [] };

async function getJwks(projectUrl, force) {
  const now = Date.now();
  if (
    !force &&
    jwksCache.keys.length &&
    jwksCache.url === projectUrl &&
    now - jwksCache.at < 60 * 60 * 1000
  ) {
    return jwksCache.keys;
  }
  const res = await fetch(stripSlash(projectUrl) + JWKS_PATH);
  if (!res.ok) throw new Error("jwks_fetch_failed");
  const json = await res.json();
  jwksCache = { at: now, url: projectUrl, keys: json.keys || [] };
  return jwksCache.keys;
}

/**
 * @param {string} token  the Supabase access token
 * @param {{url?:string, jwtSecret?:string}} cfg
 * @returns {Promise<object>} the verified claims
 */
async function verifySupabaseToken(token, cfg) {
  const options = cfg || {};
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new Error("malformed_token");

  const header = decodeSegment(parts[0]);
  const payload = decodeSegment(parts[1]);
  const signingInput = Buffer.from(parts[0] + "." + parts[1]);
  const signature = fromB64url(parts[2]);

  if (ALLOWED_ALGS.indexOf(header.alg) === -1) throw new Error("unexpected_alg");

  const projectUrl = stripSlash(options.url);
  if (projectUrl && payload.iss && payload.iss !== projectUrl + ISSUER_SUFFIX) {
    throw new Error("bad_issuer");
  }
  if (payload.aud && payload.aud !== "authenticated") throw new Error("bad_audience");
  if (!payload.exp || Date.now() > payload.exp * 1000 - 5000) throw new Error("token_expired");

  if (header.alg === "HS256") {
    if (!options.jwtSecret) throw new Error("jwt_secret_not_configured");
    const expected = crypto
      .createHmac("sha256", options.jwtSecret)
      .update(parts[0] + "." + parts[1])
      .digest();
    if (expected.length !== signature.length || !crypto.timingSafeEqual(expected, signature)) {
      throw new Error("bad_signature");
    }
  } else {
    if (!projectUrl) throw new Error("supabase_url_not_configured");
    let keys = await getJwks(projectUrl, false);
    let jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) {
      keys = await getJwks(projectUrl, true); // key rotated — refetch once
      jwk = keys.find((k) => k.kid === header.kid);
    }
    if (!jwk) throw new Error("signing_key_not_found");
    const key = crypto.createPublicKey({ key: jwk, format: "jwk" });
    if (!crypto.verify("sha256", signingInput, key, signature)) throw new Error("bad_signature");
  }

  if (!payload.email) throw new Error("no_email_claim");
  return payload;
}

module.exports = { verifySupabaseToken, ALLOWED_ALGS };
