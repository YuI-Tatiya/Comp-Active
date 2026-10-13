# Deployment checklist — production

Target architecture (decided in planning, see commit history / PR descriptions
for the reasoning):

```
Browser ──► app.yourdomain.com / admin.yourdomain.com   (Vercel, Next.js frontend)
              │
              │ Vercel rewrites() proxies /api/* server-side (keeps the auth
              │ cookie first-party — see "Why not just point the frontend at
              │ api.yourdomain.com directly?" below)
              ▼
            api.yourdomain.com ──► Railway (NestJS backend, Docker)
                                         ├──► Railway Postgres (same project, private network)
                                         └──► Cloudflare R2 (uploads — see backend/src/config/storage.config.ts)
```

Nothing here runs on the university VM — it blocks both inbound and outbound
traffic with no exceptions available without a specific, justified request to
IT, so it was dropped from the plan entirely in favor of Railway.

Each top-level section below is one platform. Work through them in order —
later sections assume the env values the earlier ones produce.

---

## 0. Prerequisites

- [ ] Domain registered, with access to its DNS management (confirmed already
      have this)
- [ ] GitHub repo accessible to: Railway, Vercel (both connect via GitHub App
      install, scoped to this repo only)
- [ ] Cloudflare account (for R2 — a Cloudflare account is free; only R2
      storage/requests are billed)
- [ ] Railway account with billing set up (confirmed already done)
- [ ] Vercel account

---

## 1. Cloudflare R2 (uploads)

1. [ ] Cloudflare dashboard → **R2 Object Storage** → **Create bucket**.
       Name it something like `compactive-uploads`. Location: Automatic.
2. [ ] **Settings** tab on the bucket → **Public access** → enable the
       `r2.dev` public bucket URL (or connect a custom subdomain, e.g.
       `cdn.yourdomain.com` — see step 4 below for why a custom domain is
       nicer but not required to get started).
       Note the public URL Cloudflare shows you — this is `R2_PUBLIC_URL`.
3. [ ] **R2** → **Manage R2 API Tokens** (this is a *separate* token type
       from a general Cloudflare API token) → **Create API Token**.
       Permissions: **Object Read & Write**, scoped to the bucket from step 1.
       Save the three values it shows you **once** (they're not retrievable
       again): `Access Key ID`, `Secret Access Key`, and the `Account ID`
       (shown in the R2 overview page, not the token itself).
4. [ ] *(Optional, do this later if you want a nicer URL than `*.r2.dev`)*
       R2 bucket → **Settings** → **Custom Domains** → add e.g.
       `cdn.yourdomain.com`, pointed through Cloudflare DNS (orange-clouded).
       If you do this, `R2_PUBLIC_URL` becomes `https://cdn.yourdomain.com`
       instead of the `r2.dev` one, and you can redo this step any time
       without touching backend code — it's just an env var.

You now have all five `R2_*` values for backend env in step 3.2.

---

## 2. Railway (backend + Postgres)

### 2.1 Create the project and database

1. [ ] Railway → **New Project** → **Deploy from GitHub repo** → pick this
       repo.
2. [ ] Railway will try to auto-detect a service from the repo root, which
       is wrong (this is a monorepo) — delete that auto-created service once
       the project exists, or configure its **Root Directory** to `backend`
       immediately (Settings → Source → Root Directory).
3. [ ] In the same project: **+ New** → **Database** → **PostgreSQL**.
       Railway provisions it and exposes `DATABASE_URL` (and the individual
       `PGHOST`/`PGPORT`/etc. vars) as **reference variables** other services
       in the same project can pull in — you don't type the connection
       string by hand.

### 2.2 The backend service (production image, `runner` target)

1. [ ] On the backend service → **Settings** → **Source**: root directory
       `backend`, confirm Railway found `backend/Dockerfile`.
2. [ ] **Settings** → **Build** → set the Docker **build target** to
       `runner` (this is the lean stage with no Prisma CLI — see
       `backend/Dockerfile` and the "Production image" note in `CLAUDE.md`;
       don't skip this, the default is to build the last stage, which is
       already `runner`, but double-check since typos here ship a bloated
       image rather than an error).
3. [ ] **Variables** tab — add every var from `backend/.env.example`
       **except** `DATABASE_URL` (reference the Postgres service's instead —
       Railway's variable picker lets you reference `${{Postgres.DATABASE_URL}}`
       directly, no copy-pasting a connection string that can drift).
       Concretely, set:
       - `DATABASE_URL` → reference `${{Postgres.DATABASE_URL}}`
       - `PORT` → `3001` (Railway also sets its own `PORT`; NestJS reads from
         `process.env.PORT` via `ConfigService`, so just make sure this one
         wins — check `backend/src/main.ts`'s `configService.get('PORT', 3001)`
         call picks up whichever `PORT` Railway injects, they should agree)
       - `NODE_ENV` → `production`
       - `PRISMA_ACCEPT_DATA_LOSS` → `false` (only flip true temporarily for
         a deliberately destructive schema change, then flip back)
       - `JWT_SECRET` → **generate a fresh one**, don't reuse the dev value:
         `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
       - `JWT_EXPIRES_IN` → `7d` (or your preference)
       - `AUTH_COOKIE_SAMESITE` → `lax` (this stays `lax` — see "Why not
         just point the frontend at api.yourdomain.com directly?" below;
         same-origin is preserved via the Vercel rewrite, so `lax` is still
         correct even though the browser's own request goes to app.*)
       - `FRONTEND_URL` → `https://app.yourdomain.com`
       - `ADMIN_FRONTEND_URL` → `https://admin.yourdomain.com`
       - `ADMIN_INVITE_EXPIRES_HOURS` → `48` (or your preference)
       - `ADMIN_IP_ALLOWLIST_ENABLED` → `false` unless you specifically want
         this; if `true`, also set `ADMIN_IP_ALLOWLIST` and tune
         `TRUST_PROXY_HOPS` (Railway's own edge is one hop — verify by
         logging `req.ip` after first deploy rather than guessing a number)
       - `ADMIN_EMAIL` / `ADMIN_PASSWORD` → the real admin account to seed
       - `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS`
         / `SMTP_FROM` → real Gmail (or other) SMTP credentials
       - `SMTP_ALLOW_SELF_SIGNED` → `false` (production — never `true`)
       - `CHATBOT_API_KEY` / `CHATBOT_BASE_URL` / `CHATBOT_MODEL` → as before.
         **Known risk, test this early:** `gen.ai.kku.ac.th` may only accept
         traffic from inside KKU's network. Railway's egress IP is *not*
         inside KKU. If it's blocked, the chatbot fails closed (a fixed
         "not configured" reply, not a crash — see `CLAUDE.md`) but the
         feature won't work until KKU IT allowlists Railway's IP range, or
         you accept the chatbot being unavailable in production.
       - `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` /
         `R2_BUCKET` / `R2_PUBLIC_URL` → from section 1.
4. [ ] **Networking** → **Generate Domain** to get a `*.up.railway.app` URL
       first (verify the service boots before wiring the real domain), then
       **Custom Domain** → add `api.yourdomain.com`. Railway shows a CNAME
       target — add that at your DNS provider (section 4).

### 2.3 Running the migration (`migrator` target)

Railway doesn't have docker-compose's `depends_on: service_completed_successfully`
— there's no automatic "run this once, then start that" ordering between two
services. The lean-production-image approach (keep the Prisma CLI out of the
image that actually serves traffic — see `CLAUDE.md`) means the `runner`
image literally *can't* run `prisma db push`, so this has to be a second,
deliberate step, not an automatic one:

1. [ ] Add a **second Railway service** in the same project, same repo, root
       directory `backend`, but build target `migrator` instead of `runner`.
2. [ ] Give it the same `DATABASE_URL` reference as the backend service (and
       `PRISMA_ACCEPT_DATA_LOSS` if you need it for a specific deploy).
3. [ ] **Settings** → set it to **not** auto-restart (it's meant to run once
       and exit cleanly — `migrate.sh` already does this; an unexpected
       restart loop here is a sign the migration itself is failing, not
       something to "fix" by restarting it forever).
4. [ ] **Before every deploy that changes `prisma/schema.prisma`:** manually
       trigger a redeploy of this `migrator` service *first*, wait for it to
       finish (check its logs for `[migrate] เรียบร้อย`), *then* redeploy the
       `runner` backend service. Railway may have since added a way to chain
       these automatically — worth checking their current docs rather than
       assuming this manual order is still the only option.

---

## 3. Vercel (frontend)

1. [ ] Vercel → **Add New Project** → import this repo → **Root Directory**:
       `frontend`.
2. [ ] **Environment Variables**:
       - `NEXT_PUBLIC_API_URL` → `same-origin` (unchanged from Docker — see
         "Why not just point the frontend at api.yourdomain.com directly?"
         below for why this stays `same-origin` even though the real
         backend lives on a different host now)
       - `NEXT_PUBLIC_ADMIN_HOSTS` → `admin.yourdomain.com`
       - `ADMIN_HOSTS` → `admin.yourdomain.com` (server-side, read by
         `proxy.ts`)
       - `ENABLE_HTTPS` → `true` (Vercel terminates real TLS — this is safe
         to turn on, unlike the Docker/Nginx setup which has no TLS yet)
       - `NEXT_PUBLIC_UPLOADS_ORIGIN` → the R2 `R2_PUBLIC_URL` from section 1
         (only needed if you actually configured R2 in section 1 — leave
         unset if uploads are still disk-backed)
       - `BACKEND_ORIGIN` → `https://api.yourdomain.com` — **this is what
         makes `next.config.ts`'s `rewrites()` proxy `/api/*` (and
         `/uploads/*`, for the non-R2 case) to the real backend server-side**
         (done — see `next.config.ts`). Without it, the browser would call
         the backend cross-origin directly and the auth cookie breaks
         exactly the way `CLAUDE.md`'s "Do not point the portals back at
         `api.*`" warning describes — same failure, new hosting, same root
         cause. Not a `NEXT_PUBLIC_*` var on purpose: it only drives a
         build-time rewrite destination, the browser never reads it.
4. [ ] **Domains** tab → add both `app.yourdomain.com` and
       `admin.yourdomain.com` to this *one* project (not two separate
       projects — `proxy.ts` already splits by `Host` header, that's the
       whole point of the shared deploy).
5. [ ] Vercel shows the DNS records each domain needs (usually a CNAME to
       `cname.vercel-dns.com`, or an A record to Vercel's anycast IP for an
       apex domain) — add those at your DNS provider (section 4).

### Why not just point the frontend at `api.yourdomain.com` directly?

`app.yourdomain.com` (Vercel) and `api.yourdomain.com` (Railway) are
different hosts. If the browser called the backend directly, the session
cookie becomes third-party from the browser's point of view, and Brave/
Safari block or partition third-party cookies — this is the exact failure
mode `CLAUDE.md` already documents for the Docker/Nginx setup, just with
different hosting underneath. The `rewrites()` proxy, driven by `BACKEND_ORIGIN`
in step 2 above, makes Vercel's edge do that cross-origin call server-side instead, so the
browser only ever talks to its own host (`app.*`/`admin.*`) and the
`/api/...` path still looks first-party to it. Same reasoning the whole
same-origin architecture is already built around — nothing new to
re-derive, just a different thing doing the proxying.

---

## 4. DNS records

At your domain registrar / DNS provider:

| Host | Type | Target | Purpose |
|---|---|---|---|
| `app.yourdomain.com` | CNAME (or per Vercel's instructions) | Vercel's target | Student/organizer portal |
| `admin.yourdomain.com` | CNAME (or per Vercel's instructions) | Vercel's target | Admin portal |
| `api.yourdomain.com` | CNAME | Railway's target | Backend (only reached server-side by Vercel's rewrite — see above) |
| `cdn.yourdomain.com` *(optional)* | CNAME, orange-clouded | Cloudflare R2 custom domain | Only if you did step 1.4 |

DNS propagation can take minutes to a few hours depending on your provider
and existing TTLs — don't assume a domain not resolving yet means something
is misconfigured; check again after waiting.

---

## 5. First real deploy — order of operations

1. [ ] Railway: deploy the `migrator` service first, confirm it finishes
       cleanly (section 2.3).
2. [ ] Railway: deploy the `runner` backend service, check logs for a clean
       boot — specifically watch for the `JWT_SECRET` validation (it throws
       and refuses to boot on a placeholder/short value, by design) and the
       admin-seed log line.
3. [ ] Confirm `https://api.yourdomain.com/api/activities` (or any public
       GET route) responds before touching the frontend — isolates backend
       problems from frontend/rewrite problems.
4. [ ] Set `BACKEND_ORIGIN` on Vercel (section 2) before deploying it — the
       `rewrites()` config is already in place, it just needs that value.
5. [ ] Confirm `https://app.yourdomain.com/api/activities` returns the same
       thing as step 3 — if it doesn't, the rewrite is wrong before anything
       else is.

---

## 6. Smoke test (do this for real, not just "looks fine")

- [ ] Register a new student account on `app.yourdomain.com` → confirm the
      OTP email actually arrives (real SMTP, not the dev-safe broken
      override the test suite uses) → verify → confirm you land on a
      logged-in page, not bounced back to login (this is the exact cookie
      failure mode the architecture section above exists to prevent — if
      it happens, the rewrite or `AUTH_COOKIE_SAMESITE` is wrong, don't
      guess, check the `Set-Cookie` response header in devtools for
      `Secure`/`SameSite` and compare against what's expected over real
      HTTPS same-origin)
- [ ] Log in as the seeded admin on `admin.yourdomain.com`
- [ ] As an organizer, create an activity with a cover image upload →
      confirm the image actually renders (if R2 is configured: open
      devtools network tab, confirm the image request goes to the R2/CDN
      origin, not a 404 against the old `/uploads/` path)
- [ ] Upload an event attachment → confirm it downloads instead of opening
      inline (the `Content-Disposition: attachment` check)
- [ ] Try the chatbot → confirm whether `gen.ai.kku.ac.th` is actually
      reachable from Railway (see the known risk noted in section 2.2) —
      if not, that's a known, accepted gap, not a bug to chase here
- [ ] Check that Swagger (`/api`) is **not** reachable on `api.yourdomain.com`
      (should 404 — `NODE_ENV=production` disables it)

---

## 7. Ongoing

- Schema changes: redeploy `migrator` before `runner`, every time (section
  2.3) — there's no migration history to "catch up" automatically with
  `db push`, so skipping this step means the backend boots against a
  schema Prisma doesn't actually match.
- Rotate `JWT_SECRET` only with a plan for what happens to existing sessions
  (every issued cookie becomes invalid at once — fine for a planned
  maintenance window, not something to do mid-day without warning users).
- `*.sql` dumps stay out of the repo except under `prisma/migrations/` and
  `prisma/backfills/` — this doesn't change just because the DB is now on
  Railway instead of a local Postgres container.
