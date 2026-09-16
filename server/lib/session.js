"use strict";

/**
 * Stateless signed-cookie sessions.
 * Token = base64url(JSON payload) + "." + base64url(HMAC-SHA256(payload)).
 * No server-side store, no dependency.
 */
const crypto = require("crypto");

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function unb64url(str) {
  const s = String(str).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(s, "base64");
}

function sign(payload, secret) {
  const data = b64url(JSON.stringify(payload));
  const mac = crypto.createHmac("sha256", secret).update(data).digest();
  return `${data}.${b64url(mac)}`;
}

function verify(token, secret) {
  if (!token || typeof token !== "string") return null;
  const i = token.lastIndexOf(".");
  if (i < 1) return null;

  const data = token.slice(0, i);
  const expected = b64url(crypto.createHmac("sha256", secret).update(data).digest());
  const a = Buffer.from(token.slice(i + 1));
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(unb64url(data).toString("utf8"));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (err) {
    return null;
  }
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(";").forEach((part) => {
    const i = part.indexOf("=");
    if (i < 0) return;
    const k = part.slice(0, i).trim();
    if (!k || Object.prototype.hasOwnProperty.call(out, k)) return;
    try {
      out[k] = decodeURIComponent(part.slice(i + 1).trim());
    } catch (err) {
      out[k] = part.slice(i + 1).trim();
    }
  });
  return out;
}

function serializeCookie(name, value, opts) {
  const o = opts || {};
  const bits = [`${name}=${encodeURIComponent(value)}`, `Path=${o.path || "/"}`];
  if (o.maxAge != null) bits.push(`Max-Age=${Math.floor(o.maxAge)}`);
  if (o.httpOnly !== false) bits.push("HttpOnly");
  if (o.secure) bits.push("Secure");
  bits.push(`SameSite=${o.sameSite || "Lax"}`);
  return bits.join("; ");
}

function clearCookie(name, opts) {
  return serializeCookie(name, "", Object.assign({}, opts, { maxAge: 0 }));
}

/** Cookie-bound session helpers for one request/response pair. */
function createSession(cfg) {
  return {
    issue(email) {
      const now = Date.now();
      const payload = {
        email: String(email).toLowerCase(),
        provider: "google",
        iat: now,
        exp: now + cfg.ttlSeconds * 1000,
      };
      return { token: sign(payload, cfg.secret), payload };
    },
    read(cookieHeader) {
      const cookies = parseCookies(cookieHeader);
      return verify(cookies[cfg.cookieName], cfg.secret);
    },
    cookie(name, value, maxAge) {
      return serializeCookie(name, value, {
        maxAge,
        secure: cfg.secure,
        httpOnly: true,
        sameSite: "Lax",
      });
    },
    clear(name) {
      return clearCookie(name, {
        secure: cfg.secure,
        httpOnly: true,
        sameSite: "Lax",
      });
    },
  };
}

module.exports = { createSession, sign, verify, parseCookies, serializeCookie, b64url, unb64url };
