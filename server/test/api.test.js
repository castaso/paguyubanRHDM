"use strict";

/**
 * Backend API tests — no framework, no dependencies.
 *
 *   node server/test/api.test.js
 *
 * Boots the real server on a test port with a test config, then asserts the
 * access rules. Covers both session sources: our own signed cookie and a
 * Supabase-issued access token.
 */
const crypto = require("crypto");
const path = require("path");
const { spawn } = require("child_process");

const SERVER = path.resolve(__dirname, "..", "server.js");
const SESSION_LIB = path.resolve(__dirname, "..", "lib", "session.js");

const PORT = Number(process.env.TEST_PORT || 8799);
const BASE = `http://127.0.0.1:${PORT}`;

const SESSION_SECRET = "test-session-secret";
const SUPABASE_URL = "https://testproject.supabase.co";
const SUPABASE_JWT_SECRET = "test-supabase-jwt-secret";
const ALLOWED = ["paguyubanRHDM@gmail.com", "castasoft@gmail.com"];

/* ── token minting ───────────────────────────────────────────────────── */
function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function mintSupabaseToken(email, opts) {
  const o = opts || {};
  const secret = o.secret || SUPABASE_JWT_SECRET;
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT", kid: "test-key" };
  const payload = {
    iss: SUPABASE_URL + "/auth/v1",
    sub: "00000000-0000-4000-8000-000000000000",
    aud: "authenticated",
    role: "authenticated",
    email,
    iat: now,
    exp: now + (o.expSkew == null ? 3600 : o.expSkew),
  };
  const data = b64url(JSON.stringify(header)) + "." + b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  return data + "." + b64url(sig);
}

function mintSessionCookie(email) {
  const { sign } = require(SESSION_LIB);
  return sign(
    { email, provider: "google", iat: Date.now(), exp: Date.now() + 3600 * 1000 },
    SESSION_SECRET
  );
}

/* ── http helper ─────────────────────────────────────────────────────── */
async function get(pathname, headers) {
  const res = await fetch(BASE + pathname, { headers: headers || {} });
  const body = await res.text();
  return { status: res.status, body };
}

async function main() {
  const child = spawn(process.execPath, [SERVER], {
    env: Object.assign({}, process.env, {
      PORT: String(PORT),
      SESSION_SECRET,
      GOOGLE_CLIENT_ID: "test-client.apps.googleusercontent.com",
      GOOGLE_CLIENT_SECRET: "test-google-secret",
      ALLOWED_EMAILS: ALLOWED.join(","),
      SUPABASE_URL,
      SUPABASE_JWT_SECRET,
      SUPABASE_ANON_KEY: "test-anon-key",
      NODE_ENV: "development",
      SECURE_COOKIES: "0",
    }),
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  child.stderr.on("data", (d) => { stderr += d.toString(); });

  const results = [];
  const check = (name, ok, detail) => results.push({ name, ok, detail });

  try {
    // Wait for the server to accept connections.
    let ready = false;
    for (let i = 0; i < 60 && !ready; i++) {
      try {
        const r = await fetch(BASE + "/healthz");
        ready = r.ok;
      } catch (err) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    if (!ready) throw new Error("server did not become ready");

    const root = await get("/");
    check(
      "site is public (GET / → 200, real page)",
      root.status === 200 && root.body.indexOf("Everything we make, swap, and celebrate") !== -1,
      "status=" + root.status
    );

    const blocked = await get("/server/server.js");
    check("backend source is never served", blocked.status === 404, "status=" + blocked.status);

    const anon = await get("/api/settings");
    check("settings requires a session", anon.status === 401, "status=" + anon.status);

    const allowed = await get("/api/settings", {
      Authorization: "Bearer " + mintSupabaseToken("castasoft@gmail.com"),
    });
    check(
      "supabase token (allowed email) is accepted",
      allowed.status === 200 && allowed.body.indexOf("castasoft@gmail.com") !== -1,
      "status=" + allowed.status
    );

    const unlisted = await get("/api/settings", {
      Authorization: "Bearer " + mintSupabaseToken("attacker@example.com"),
    });
    check("supabase token (non-listed email) refused by RBAC", unlisted.status === 401, "status=" + unlisted.status);

    const forged = await get("/api/settings", {
      Authorization: "Bearer " + mintSupabaseToken("castasoft@gmail.com", { secret: "wrong-secret" }),
    });
    check("supabase token with a bad signature is refused", forged.status === 401, "status=" + forged.status);

    const expired = await get("/api/settings", {
      Authorization: "Bearer " + mintSupabaseToken("castasoft@gmail.com", { expSkew: -3600 }),
    });
    check("expired supabase token is refused", expired.status === 401, "status=" + expired.status);

    const cookie = await get("/api/settings", {
      Cookie: "alder_session=" + mintSessionCookie("paguyubanRHDM@gmail.com"),
    });
    check("signed cookie session still works", cookie.status === 200, "status=" + cookie.status);

    const start = await fetch(BASE + "/auth/google", { redirect: "manual" });
    const location = start.headers.get("location") || "";
    check(
      "google sign-in redirects to Google",
      start.status === 302 && location.indexOf("accounts.google.com") !== -1,
      "status=" + start.status
    );

    const cb = await get("/auth/google/callback?code=x&state=y");
    check("callback rejects a bad state", cb.status === 403, "status=" + cb.status);
  } finally {
    child.kill();
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;

  results.forEach((r) => console.log((r.ok ? "PASS  " : "FAIL  ") + r.name + "  (" + r.detail + ")"));
  console.log("");
  console.log("RESULT passed=" + passed + " total=" + results.length + " failed=" + failed);
  if (failed && stderr.trim()) {
    console.log("server stderr (first lines): " + stderr.trim().split("\n").slice(0, 4).join(" | "));
  }
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("test harness error:", err && err.message ? err.message : err);
  process.exit(1);
});
