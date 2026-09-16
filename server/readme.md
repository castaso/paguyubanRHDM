# Alder House backend

Google sign-in with **server-enforced** access control, plus the static site.

Zero dependencies — Node's built-ins only (`node:crypto`, `node:http`, global
`fetch`). Requires **Node 20+** (Node 22 recommended).

## What it does

1. Sends the visitor to Google's consent screen (OAuth 2.0 Authorization Code
   flow **with PKCE** and a `state` check).
2. Exchanges the code for tokens and **verifies the returned ID token** against
   Google's JWKS: signature (RS256), issuer, audience, expiry.
3. Checks the verified email against the **RBAC allow-list** — server-side.
   Anything not on the list gets a 403 and a "not on the access list" message.
4. Issues a **signed, HttpOnly session cookie** and re-checks the allow-list on
   every subsequent request, so removing an address revokes that session
   immediately.
5. Serves the static site and refuses to render any page to a visitor without a
   valid session — the browser never decides who gets in.

## Setup

```bash
cd server
cp .env.example .env
# fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET
node --env-file=.env server.js        # Node 20.6+
# or:  node server.js   after exporting the vars yourself
```

Then open <http://localhost:8787>.

### Google Cloud Console

1. Create (or pick) a project → **APIs & Services → OAuth consent screen**.
   Add the two family addresses as **Test users** while the app is unpublished.
2. **Credentials → Create credentials → OAuth client ID → Web application.**
3. **Authorised redirect URI** must match `OAUTH_REDIRECT_URI` exactly, e.g.
   `http://localhost:8787/auth/google/callback`.
4. Copy the client ID and secret into `.env`.

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/auth/google` | public | Begin sign-in; 302 to Google |
| GET | `/auth/google/callback` | public | Finish sign-in; sets the session cookie |
| GET | `/auth/me` | public | `{authenticated, email}` — 401 when anonymous |
| GET | `/auth/signout` | public | Clear the session; 302 to `/` |
| GET | `/healthz` | public | Liveness + config summary |
| GET | `/assets/*` | public | Styles/scripts the sign-in screen needs |
| GET | everything else | **session required** | The site. Anonymous → sign-in screen |

`/server/*` and `/.git/*` are never served.

## Configuration

Everything is environment-driven — see `.env.example`.

| Variable | Default | Notes |
|---|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | Required for sign-in |
| `OAUTH_REDIRECT_URI` | `http://localhost:PORT/auth/google/callback` | Must match Google's config exactly |
| `SESSION_SECRET` | — | Required; HMAC key for session cookies |
| `ALLOWED_EMAILS` | the two family addresses | The RBAC list |
| `SESSION_TTL_SECONDS` | `1209600` (14 days) | Session lifetime |
| `SECURE_COOKIES` | `1` when `NODE_ENV=production` | Set to 1 behind HTTPS |
| `PORT` / `HOST` | `8787` / `0.0.0.0` | |
| `SITE_ROOT` | `..` (the site root) | What gets served and gated |

## Deploying

**Docker** (build from the site root, so the image has both site and server):

```bash
docker build -t alder-house -f server/Dockerfile .
docker run -p 8080:8080 --env-file server/.env alder-house
```

Any container host works (Cloud Run, Fly.io, Render, a VPS). Two rules:

- Put it behind **HTTPS** and set `SECURE_COOKIES=1`.
- Register the **production** callback URL in Google Cloud Console.

Serverless functions (Vercel/Netlify-style) need the handler adapted — this is a
plain `http` server, not a function signature.

## Pointing the site at it

The front end uses a browser-only gate by default so the static preview still
works. Once this backend is live, edit `assets/auth.js`:

```js
authMode: "server",   // was "prototype"
apiBase: "",          // "" = same origin; or "https://auth.example.com"
```

The header's settings cog then shows a *server session* and signs out through
`/auth/signout`.

## Security notes

- The allow-list is enforced **server-side only**. The value the browser sends is
  never trusted.
- The session cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
  It is HMAC-signed; tampering invalidates it.
- `state` + PKCE protect the callback against CSRF and code interception.
- The ID token is verified against Google's JWKS — an unsigned or foreign token
  is rejected before the allow-list is even consulted.
- Security headers (CSP, `nosniff`, `frame-ancestors 'none'`) ship on every
  response.
- This is a small, readable auth service. It is **not** a substitute for a
  hardened identity provider if the stakes change.
