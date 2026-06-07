# Deploying Woodshed (Vercel + Turso)

Source repo: `github.com/hoorangyee/woodshed` (branch `main`).

## 1. Turso (database)

```bash
# install (macOS)
brew install tursodatabase/tap/turso        # or: curl -sSfL https://tur.so/install.sh | bash
turso auth login

turso db create woodshed
turso db show woodshed --url                 # → TURSO_DATABASE_URL  (libsql://…)
turso db tokens create woodshed              # → TURSO_AUTH_TOKEN
```

Apply the schema to the production DB (run from this repo dir):

```bash
TURSO_DATABASE_URL='libsql://…' TURSO_AUTH_TOKEN='…' npm run db:migrate
```

## 2. Vercel (app)

1. vercel.com → **Add New → Project → Import** `hoorangyee/woodshed` (Framework auto-detects Next.js).
2. **Environment Variables** (Production):

   | Key | Value |
   |---|---|
   | `AUTH_SECRET` | a fresh random string — `openssl rand -base64 33` |
   | `AUTH_GOOGLE_ID` | your Google OAuth client ID |
   | `AUTH_GOOGLE_SECRET` | your Google OAuth client secret |
   | `TURSO_DATABASE_URL` | from step 1 |
   | `TURSO_AUTH_TOKEN` | from step 1 |
   | `AUTH_ADMIN_EMAILS` | your Google email (grants you `/admin`) |

   Do **not** set `AUTH_DEV_LOGIN` in production (it is disabled in prod regardless).
3. **Deploy.** You'll get a URL like `https://woodshed-xxxx.vercel.app`.

## 3. Google OAuth — add the production domain

Google Cloud Console → Credentials → your OAuth client:

- **Authorized JavaScript origins:** `https://<your-vercel-domain>`
- **Authorized redirect URIs:** `https://<your-vercel-domain>/api/auth/callback/google`

Make sure the OAuth consent screen is **External** and **Published** (so anyone can sign in).

## 4. First run

- Sign in with Google → set your handle. Because your email is in `AUTH_ADMIN_EMAILS`,
  you'll have the **Admin** link (moderation queue).
- Fresh DB has no licks; create some and toggle visibility to **Public** to populate Explore.

## Notes

- `AUTH_DEV_LOGIN` mock login is automatically off in production.
- A "middleware is deprecated" build warning is harmless on Next 16.
- Re-deploys: push to `main` → Vercel auto-builds. Schema changes: re-run `db:migrate` against Turso.
- Backup: `turso db dump woodshed`.
