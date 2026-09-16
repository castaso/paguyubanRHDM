"use strict";

/**
 * Alder House backend — configuration.
 * Every value comes from the environment; see .env.example.
 */
const path = require("path");

function bool(v, fallback) {
  if (v == null || v === "") return fallback;
  return /^(1|true|yes|on)$/i.test(String(v));
}

const SERVER_DIR = path.resolve(__dirname);
const PROJECT_ROOT = path.resolve(__dirname, ".."); // the static site root

module.exports = {
  port: Number(process.env.PORT || 8787),
  host: process.env.HOST || "0.0.0.0",
  nodeEnv: process.env.NODE_ENV || "development",

  // The static site to serve and protect. Defaults to the parent folder
  // (the site root that also hosts index.html).
  siteRoot: process.env.SITE_ROOT ? path.resolve(process.env.SITE_ROOT) : PROJECT_ROOT,
  serverDir: SERVER_DIR,

  // Paths served without a session. Everything else (HTML pages) is gated.
  publicPrefixes: ["/assets/"],

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri:
      process.env.OAUTH_REDIRECT_URI ||
      `http://localhost:${process.env.PORT || 8787}/auth/google/callback`,
  },

  session: {
    secret: process.env.SESSION_SECRET || "",
    cookieName: process.env.SESSION_COOKIE || "alder_session",
    ttlSeconds: Number(process.env.SESSION_TTL_SECONDS || 60 * 60 * 24 * 14),
    secure: bool(process.env.SECURE_COOKIES, (process.env.NODE_ENV || "development") === "production"),
  },

  // RBAC allow-list. Server-enforced; the browser never decides this.
  allowedEmails: (
    process.env.ALLOWED_EMAILS || "paguyubanRHDM@gmail.com,castasoft@gmail.com"
  )
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),

  maxBodyBytes: 64 * 1024,
};
