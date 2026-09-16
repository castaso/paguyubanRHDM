"use strict";

/** Minimal, traversal-safe static file server for the site root. */
const fs = require("fs");
const path = require("path");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

function contentType(filePath) {
  return TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

/** Resolve a URL path to a file inside root, or null if it escapes. */
function resolve(root, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(String(urlPath).split("?")[0].split("#")[0]);
  } catch (err) {
    return null;
  }
  const rel = decoded.replace(/^\/+/, "");
  const filePath = path.join(root, path.normalize(rel));
  const relCheck = path.relative(root, filePath);
  if (relCheck.startsWith("..") || path.isAbsolute(relCheck)) return null;
  return filePath;
}

/** True when the path is an asset that may load before sign-in. */
function isPublic(publicPrefixes, urlPath) {
  const p = String(urlPath).split("?")[0];
  if (p === "/favicon.svg" || p === "/favicon.ico") return true;
  return (publicPrefixes || []).some((prefix) => p.startsWith(prefix));
}

/** Stream a file. Returns true when something was sent. */
function send(req, res, filePath, extraHeaders, status) {
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch (err) {
    return false;
  }
  if (stat.isDirectory()) {
    const index = path.join(filePath, "index.html");
    try {
      if (!fs.statSync(index).isFile()) return false;
    } catch (err) {
      return false;
    }
    return send(req, res, index, extraHeaders, status);
  }
  if (!stat.isFile()) return false;

  const headers = Object.assign(
    {
      "Content-Type": contentType(filePath),
      "Content-Length": stat.size,
      "Cache-Control": "no-cache",
    },
    extraHeaders || {}
  );
  res.writeHead(status || 200, headers);
  if (req.method === "HEAD") return res.end(), true;
  fs.createReadStream(filePath).pipe(res);
  return true;
}

module.exports = { resolve, isPublic, send, contentType, TYPES };
