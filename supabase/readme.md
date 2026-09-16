# Supabase setup

Sign-in for the settings panel runs through **Supabase Auth** with the Google
provider. The site stays public; only the settings area asks who you are, and
Postgres RLS is what actually enforces the allow-list.

Nothing here needs the `supabase-js` SDK — `assets/supabase-auth.js` talks to the
Auth REST API directly, so nothing is loaded from a CDN.

---

## 1. Create the project

1. <https://supabase.com/dashboard> → **New project**. Pick a region near the family.
2. Wait for it to finish provisioning.
3. Note the **Project URL** (looks like `https://abcdefghijkl.supabase.co`) from
   **Project Settings → API**.

## 2. Turn on Google

Supabase does the OAuth handshake; you just give it credentials.

1. In **Google Cloud Console → APIs & Services → Credentials**, create an
   **OAuth client ID → Web application**, and add this **Authorised redirect
   URI** (replace the project ref):

   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```

2. Copy the client ID and secret.
3. In Supabase: **Authentication → Providers → Google** → enable, paste both,
   save.

## 3. Set the URLs

**Authentication → URL Configuration**:

- **Site URL** — the domain the family will actually use.
- **Redirect URLs** — add every origin that may receive the session back:
  - `https://your-domain.example/**`
  - `http://localhost:8787/**` (if you run the Node backend locally)
  - the AutoClaw preview URL, if you want to test there

A redirect that isn't on this list is silently rejected, which is the usual
cause of "it just bounces back to the sign-in screen".

## 4. Create the schema

**SQL → New query** → paste all of `supabase/schema.sql` → **Run**.

That creates:

| Object | Purpose |
|---|---|
| `allowed_emails` | The RBAC list — **edit this one to change who gets in** |
| `is_allowed()` | Helper: is the current JWT's email on the list? |
| `listings` | Marketplace rows, with a `seller_email` column |
| policies | Anyone may *read* listings; only the allow-listed admins may insert, update, or delete |

> Change the two seeded addresses in `schema.sql` before running, or update the
> table afterwards — it is the authoritative list.

## 5. Point the site at it

`assets/auth.js`:

```js
authMode: "supabase",
supabase: {
  url: "https://<your-project-ref>.supabase.co",
  anonKey: "<anon public key>",   // Project Settings → API
  storageKey: "alderhouse.supabase.session"
},
```

The **anon key is a public client key** — it is designed to be shipped in the
browser and is not a secret. Your data is protected by RLS, not by hiding it.

Reload, click the cog, and **Continue with Google** should work.

## 6. Optional — let the Node backend accept Supabase sessions

If you also run `server/`, its `/api/settings` endpoint will accept a Supabase
access token as well as its own cookie. Add to `server/.env`:

```
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon public key>
# Only for legacy HS256-signed projects (Settings → API → JWT Settings):
SUPABASE_JWT_SECRET=<jwt secret>
```

Newer projects sign with RS256/ES256 and need only `SUPABASE_URL` — the server
fetches the JWKS and verifies the signature itself.

---

## How the flow works

```
cog clicked → panel asks for a session
      ↓
/auth/v1/authorize?provider=google   (browser navigation)
      ↓
Google consent → supabase.co/auth/v1/callback
      ↓
redirect back to the site with
#access_token=…&refresh_token=…&expires_in=…
      ↓
assets/supabase-auth.js lifts the tokens into localStorage,
scrubs the address bar, and resolves the user via /auth/v1/user
      ↓
email is checked against the client allow-list (UI)
and against allowed_emails + RLS (authoritative)
```

The implicit flow is used deliberately: it is the right fit for a client-only
static site, because PKCE needs a code exchange that only a server can do.

## Two caveats

- **The static preview can't reach Supabase.** That host sends a strict
  Content-Security-Policy (`connect-src 'self'`) and blocks every cross-origin
  request, so `*.supabase.co` is unreachable there. Supabase mode works on a
  real domain or behind the Node backend. The preview keeps working in
  `prototype` mode.
- **Keep the two lists in sync.** `assets/auth.js → allowedEmails` only affects
  the UI; `allowed_emails` in Postgres is what actually refuses a stranger.
  Adding someone to one and not the other is the predictable support ticket.
