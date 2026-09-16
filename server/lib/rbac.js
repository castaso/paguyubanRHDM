"use strict";

/** RBAC — the access list, enforced on the server, never in the browser. */
function normalize(email) {
  return String(email == null ? "" : email).trim().toLowerCase();
}

function createRbac(allowedEmails) {
  const list = Array.from(new Set((allowedEmails || []).map(normalize))).filter(Boolean);
  return {
    list,
    normalize,
    isAllowed(email) {
      return list.indexOf(normalize(email)) !== -1;
    },
    /** Short, safe explanation for a denial (never echoes unknown data). */
    denyReason(email) {
      return `Access denied: ${normalize(email) || "that account"} is not on the access list.`;
    },
  };
}

module.exports = { createRbac, normalize };
