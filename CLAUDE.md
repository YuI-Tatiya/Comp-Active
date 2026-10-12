# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Comp Active is an activity management, soft-skills tracking, and volunteer service platform for a college computing department. Three core roles — **student**, **organizer**, and **admin** — plus **external developers** interact with the system across multi-domain access points routed via an **Nginx API Gateway**.

### Core Architecture & Multi-Domain Setup

```text
                               ┌──► admin.compactive.com ──► Admin Portal (React/Next)
[ Users / External Devs ] ──► Nginx Gateway ├──► app.compactive.com   ──► Student & Organizer Portal
                               └──► api.compactive.com   ──► Public Services (Developer API)
```

#### Admin Portal (`admin.compactive.com`)

Isolated subdomain with dedicated Admin authentication.

**Responsibilities:** Landing page content management, organizer approval/management, system analytics dashboards, and flagged user moderation.

#### Student & Organizer Portal (`app.compactive.com`)

Shared login path for both Students and Organizers (`/auth`).

- **Student Features:** Register for activities, request volunteer certificates, gain points across 12 soft skills (communication, time management, flexibility/adaptability, teamwork/collaboration, analytic/critical thinking, decision making, creativity, complex problem solving, curiosity/lifelong learning, negotiation/persuasion, leadership, positive attitude), and evaluate activities.
- **Organizer Features:** Create activities (with soft-skill point rules), download registration/attendance data, view activity feedback, and view activity dashboards.

#### Public Developer Services (`api.compactive.com`)

Public REST API endpoints for external integration:

- **Activity Newsfeed Service:** Public activity newsfeed and event data.
- **Volunteer Format Service:** Standardized volunteer certificate format & verification service.

## Codebase Architecture & Modular MVC Structure

The backend (`backend/`) is built with NestJS and Prisma using a **Modular Feature-based MVC + Service Layer Architecture**.

```text
backend/src/
├── config/                     # Environment, JWT, Database & Gateway configs
├── common/                     # Shared decorators, guards, filters, interceptors
│   ├── guards/                 # JwtAuthGuard, RolesGuard, ApiKeyGuard (for Dev API)
│   ├── middleware/             # RateLimiter, CORS, DomainContext middleware
│   └── enums/                  # UserRole, ActivityStatus, ApprovalStatus, etc.
│
├── modules/                    # 📦 Feature-based Modules (Core MVC + Service)
│   ├── auth/                   # Authentication (Separate Admin & Shared Student/Organizer)
│   ├── users/                  # User management & moderation
│   ├── activities/             # Activity creation, soft-skills mapping & newsfeed
│   ├── registrations/          # Activity registration & attendance export
│   ├── volunteer-services/     # Volunteer certificate formatting & verification API
│   ├── admin-dashboard/        # Landing page content management & system analytics
│   └── developer-portal/       # API Key management & rate-limit controls for External Devs
│
├── prisma/                     # Prisma Client wrapper (PrismaService)
├── app.module.ts               # Global module wiring
└── main.ts                     # Application entry point
```

### Pattern within each Feature Module (`src/modules/<feature>/`)

Each module enforces clean layer isolation:

- **`*.controller.ts` (Thin Controller):** Receives HTTP requests, executes DTO validation, delegates business logic to services, and returns formatted responses. Controllers are segregated by domain access (e.g., `admin.controller.ts`, `user.controller.ts`, `api.v1.controller.ts`).
- **`*.service.ts` (Fat Service / Business Logic):** Contains core domain rules, soft-skill score calculations, evaluation scoring, and volunteer format generators. Shared across controllers.
- **`*.repository.ts` / Prisma Layer:** Handles raw database queries through PrismaService.
- **`*.routes.ts` / DTOs:** Defines route maps, Swagger documentation decorators, and class-validator DTOs.

## Architecture Details

### Backend — NestJS + Prisma

Feature modules live under `backend/src/modules/`, split by who owns the route rather than by entity:

- `modules/admin/`, `modules/organizer/`, `modules/student/` — role-specific controllers (admin also owns API-key management for the developer portal).
- `modules/shared/` — the domain modules those controllers delegate to: `auth`, `users`, `activities`, `events`, `registrations`, `volunteer-services`, `admin-dashboard`, `mail`, `seed`.

Each carries `*.module.ts`, `*.controller.ts`, `*.service.ts`, and `*.repository.ts`, wired together in `app.module.ts`. (The ASCII tree in "Codebase Architecture" above describes the intended layering, not the literal folder names.)

Prisma is accessed only through PrismaService (`backend/src/prisma/prisma.service.ts`), which wraps PrismaClient with the `@prisma/adapter-pg` driver adapter and exposes one getter per model (`.user`, `.activity`, `.registration`, `.certificate`, `.evaluation`, etc.) plus `$transaction`. Don't instantiate PrismaClient directly in feature code.

The generated Prisma client lives at `backend/generated/prisma` (not the default `node_modules/.prisma`) — re-run `prisma generate` after schema changes, and import client types from there (`../../generated/prisma/client`).

#### Auth & Guards

- **Internal Users:** JWT via Passport (`JwtAuthGuard` in `common/guards`), plus role checks via `RolesGuard` (`@Roles(...UserRole[])`). Guard order is `@UseGuards(JwtAuthGuard, RolesGuard)`. Get user via `@CurrentUser()`.
- **Session transport:** The JWT travels in an **httpOnly cookie**, not `localStorage` — `JwtStrategy` reads the cookie first (`common/utils/auth-cookie.util.ts` owns the name and options) and falls back to the `Authorization: Bearer` header for non-browser clients (Swagger, Postman). Login, admin-login and `POST /api/auth/register/verify-otp` issue the cookie (`register` itself only returns `pendingVerification` and emails an OTP); `POST /api/auth/logout` clears it, which is why that endpoint has to exist server-side.
- **Login throttling:** `AuthThrottlerGuard` keys the rate-limit bucket by the **target account** (hashed identifier), not by IP — the whole college shares one NAT address, so per-IP counting would lock out honest users while an attacker just rotates IPs.
- **Admin surface:** `AdminIpGuard` (inert until `ADMIN_IP_ALLOWLIST_ENABLED=true`) fronts admin login.
- **External Developers:** Protected by `ApiKeyGuard` and throttled per key by `ApiKeyThrottlerGuard` (backed by `ThrottlerModule`), plus a coarse per-IP limit at Nginx.

#### Global Plumbing (`main.ts`)

CORS restricted to domain origins **with `credentials: true`** (required for the auth cookie), `cookieParser()`, `helmet()`, explicit body-size limits (512 kb), and `trust proxy` so `req.ip` is the real client behind Nginx rather than the gateway. Then the global `ValidationPipe` (`whitelist: true`, `transform: true`, `forbidNonWhitelisted: true`), global `HttpExceptionFilter`, and global `TransformInterceptor` wrapping responses as `{ success, data, timestamp }` (errors as `{ success: false, statusCode, message, timestamp, path }`).

Helmet notes: `crossOriginResourcePolicy` is set to `cross-origin` on purpose — the default (`same-origin`) would stop `app.*` from loading uploaded images off `api.*`. CSP is enabled only in production because Swagger UI needs inline scripts.

Swagger docs are auto-generated from decorators and served at `/api` (`ApiTags`/`ApiOperation`/`ApiBearerAuth`) — **disabled when `NODE_ENV=production`**, and Nginx 404s `/api`, `/api-json`, `/api-yaml` as a second layer.

Static/uploaded files (activity images) are served from `backend/public` via `ServeStaticModule`, which stamps `X-Content-Type-Options: nosniff` on everything and `Content-Disposition: attachment` on `uploads/attachments/*` so user-supplied files can never render as HTML on the API origin. File uploads use multer (`diskStorage` + `FileInterceptor`) — see the upload rule under Security.

Enums (`UserRole`, `ActivityStatus`, `ApprovalStatus`, `RegistrationStatus`, `AttendanceStatus`, `SoftSkillType`) are defined in `schema.prisma` and mirrored in `common/enums/`.

### Frontend — Next.js App Router

All backend calls go through `frontend/lib/api.ts`, a single typed client keyed off `NEXT_PUBLIC_API_URL` (routed through Nginx Gateway).

In Docker, `NEXT_PUBLIC_API_URL=same-origin`: `API_BASE_URL` becomes `''`, so the portals call `/api/...` and load `/uploads/...` on their **own host** (`app.*`, `admin.*`), and Nginx forwards those paths to the backend. This keeps the auth cookie first-party. Do not point the portals back at `api.*`: on `*.localhost` that is cross-site, so Brave and Safari block or partition the cookie, and a stale cookie survives logout and makes a new login act as the old account. `api.*` remains the external Developer API host, and `/api/v1/` is 404 on the portal hosts. Image previews are converted back to stored paths with `uploadPathFromPreview` (`lib/api-base.ts`), never with `startsWith(API_BASE_URL)`, because `''` prefixes everything.

Every request sends `credentials: 'include'`; there is no `Authorization` header and **nothing auth-related is kept in `localStorage`**.

Auth state is a React context in `frontend/lib/auth-context.tsx` (`AuthProvider`/`useAuth`). Because the JWT lives in an httpOnly cookie the client cannot read, session state is established by calling `authAPI.getProfile()` on mount — a successful call means the cookie is valid. `useAuth()` exposes no token.

`frontend/proxy.ts` (Next 16's renamed `middleware.ts`) maps the admin subdomain onto `app/admin/*`. It decides from the **`Host` header against an allowlist** (`ADMIN_HOSTS`), never from client-supplied `x-forwarded-host`; the one exception is Next's own internal re-entry after a rewrite, where `Host` becomes the server's loopback address. Treat this as routing, not authorization — the real checks are the backend guards.

Routes organized under `app/`:

- `app/admin/*` — Admin subdomain portal (separate login)
- `app/student/*` & `app/organizer/*` — Student/Organizer portal
- `app/auth/*` — Shared authentication routes for Student and Organizer
- `app/events/*` — Public landing and activity showcases

Shared UI in `components/ui/` (Radix + Tailwind + CVA) and auth UI in `components/auth/`.

**Theme — Denim Varsity, system-wide:**

- **Tokens:** the theme lives in the tokens, so new pages get it by using them.
  - `brand-*` is the denim scale (`brand-600` = denim, `brand-900` = denim-deep).
  - `surface`/`border`/`fg*` are the denim paper, line and ink tones.
  - `denim-*`/`amber` are for denim-specific pieces.
- **Fonts:** `--font-sans` = IBM Plex Sans Thai and `--font-heading` = Bai Jamjuree, from `lib/denim-fonts.ts` on `<html>`.
  - Plex and Bai are preloaded (10 files). JetBrains Mono is lazy.
  - The font tokens stay in `@theme inline`, which resolves `var()` at the element. A plain `@theme` once silently fell back to the system font.
- **Chrome:**
  - `SiteHeader` (public), `AppHeader` + `UserMenu` (student/organizer) and `SiteFooter` have a single denim variant and no theme prop.
  - The admin portal styles itself with inline hex, already mapped onto the denim palette. Keep new admin colors on that palette.
  - Use light accents (amber, `#c3d3ea`) for numbers and text on dark denim panels. Green and denim are unreadable there.
- **Shared pieces:**
  - `components/denim/denim-ui.tsx`: hero frame, terminal prompt, section heading, stat cards, status tabs, filter panel, card cover/pill/row, create tile.
  - `components/denim/public-activity-card.tsx`: the participant-facing activity card. `/`, `/student`, `/events` and `/student/events` all build their items with `buildFeaturedCards` (`lib/events-filter.ts`): one card per event, plus standalone activities.
    - The public home `/` is the size reference: the card is identical on every page and is never sized ad hoc.
    - Width is a column of `ACTIVITY_GRID`. The horizontal rows on the list pages use `ACTIVITY_GRID_COLUMN`, which computes the same width from the page's `@container` wrapper, because those rows are narrower than the grid. Keep the two constants in sync.
    - Height is fixed by fixed inner slots, not a fixed total. The text block holds 1 title line plus 1 description line; a 2-line title fills it and hides the description. The registration-window row keeps its space even when it is empty.
  - **Auth pages:** `/auth` (login/register) and `/auth/organizer/register` share `components/auth/auth-shell.tsx`.
    - It provides a two-panel card (denim aside with checker strip, white form side) plus the shared inputs, the password field with show/hide, and the heading.
    - The aside hides below `lg`, so each page shows its own back link on the form side.
    - Mascots are PNGs (`mascot-wave.png`, `mascot-laptop.png`). Convert Canva SVG exports to PNG first: they wrap base64 rasters, and `next/image` can't resize SVG.
  - **Activity/event detail page:** `components/activity/activity-registration-view.tsx` is the single page for every role.
    - `mode="register"` serves students and guests, for both events and standalone activities. `mode="preview"` serves the organizer's view-only pages.
    - The pieces are the hero (`activity-detail-hero`: cover, title, WHEN/WHERE, round picker), the bottom bars (`activity-detail-bars`: every `describeAction` state) and the numbered sections plus sidebar (`activity-detail-sections`).
    - Don't fork a role-specific copy; add a prop instead. The organizer views used to drift from the student page exactly that way.
  - **Card covers (`CardCover`, used by every denim card):**
    - When the organizer attached an image, the cover shows that photo. For an event, `eventImagePath` picks the event cover, otherwise the earliest sub-activity's image.
    - When there is no image, or it fails to load, the cover falls back to the theme pattern. The pattern always sits underneath, so a slow or broken image never leaves a blank cover.
    - A navy gradient scrim plus a text shadow keep the white date and labels readable on bright photos. Check new overlay text against a near-white image.
    - Card images are plain `<img loading="lazy">`, because uploads are served from the backend `/uploads` and do not go through Next's image optimizer. They count toward the Nginx `general` burst, so keep them lazy.
  - `PageHeader` is the denim band used by list pages.
  - Page-specific parts live in `components/organizer/*`, `components/home/*` (public `/`), `components/about/*` and `components/student/*`.
  - **My activities (`/student/my-registrations`):** the four status cards and their counts both come from `registrationBucket` (`lib/registration-bucket.ts`), so a count always matches its list.
    - An organizer-cancelled activity counts as **cancelled** even though its registration row stays `pending`/`confirmed`, because `cancelByOrganizer` doesn't touch registrations.
    - A row with an evaluation stays **evaluated** even if the activity is cancelled later.
- **Focus rings:** amber only on denim backgrounds. On white it is ~2:1, below the 3:1 a focus indicator needs, so use denim there.
- **News:** both `/` and `/student` show text slides from `lib/news.ts`.

**Request budget:** a cold page load (first visit or hard refresh) must stay well under the burst of Nginx's `general` zone (60), and font files count. Preload only the weights pages actually use — Sarabun used to preload 32 files on every page, which pushed `/organizer` to 72 requests; the trailing API calls got 429 and rendered as empty lists. Today a cold load is 40-53 requests with at most 11 font files. Measure with `performance.getEntriesByType('resource')` after a no-cache load. Weight counts too: `next/image` does not optimize SVGs, so raster art belongs in a PNG/JPG it can resize — the home hero's 20 MB `college.svg` (a photo wrapped in SVG) made the page 16.5 MB; `college-building.png` brought it to 1.4 MB.

## Commands

### Backend (`backend/`)

```bash
npm install                    # install dependencies
npm run start:dev              # dev server with hot reload (port 3001, from PORT env)
npm run build                  # prisma generate + nest build
npm run start:prod             # run built dist/main
npm run lint                   # eslint --fix over src/
npm run format                 # prettier --write

npm run test                   # jest unit tests
npx jest src/modules/auth/auth.service.spec.ts   # run a single test file
npm run test:e2e               # jest e2e tests

npm run prisma:generate        # regenerate Prisma client into backend/generated/prisma
npm run prisma:push            # push schema.prisma to DB without migration (dev/Docker)
npm run prisma:migrate         # prisma migrate dev
npm run prisma:seed            # seed admin user from ADMIN_EMAIL/ADMIN_PASSWORD
```

`prisma` is a **devDependency** — it is a build/migrate tool, not a runtime one. See "Production image" below before moving it.

### Frontend (`frontend/`)

```bash
npm install
npm run dev      # next dev, port 3000
npm run build
npm run start
npm run lint
```

### Docker & Gateway (Full Environment)

```bash
docker compose up --build      # Postgres, migrate (runs once), Backend, Frontend, Nginx Gateway:80
```

Services start in order: `postgres` (healthcheck) → `migrate` (runs to completion) → `backend` / `frontend` → `nginx`. Postgres is published on `127.0.0.1:5433` only, so it is not reachable from the local network.

**`migrate` service:** applies `schema.prisma` to the database and exits; `backend` waits on `service_completed_successfully`. It runs from the `migrator` Docker stage, which is the only image carrying the Prisma CLI. Destructive schema changes fail unless `PRISMA_ACCEPT_DATA_LOSS=true` — the default refuses to drop columns silently at container start. After `db push` it runs every `prisma/backfills/*.sql` (data repairs, e.g. the Bangkok-time fix-up). There is no migration history to remember what already ran, so each backfill runs on every start and **must be idempotent**. `*.sql` is otherwise gitignored (DB dumps carry real student data); only `prisma/migrations/` and `prisma/backfills/` are excepted, so never drop a dump into either.

**Production image (`backend/Dockerfile`):** three stages — `builder` (full deps, `prisma generate` + `nest build`), `migrator` (`FROM builder`, runs `migrate.sh`), and `runner`. The runner installs with `npm ci --omit=dev --legacy-peer-deps`; the flag is load-bearing, not cosmetic: `@prisma/client` declares `prisma` as an *optional peerDependency*, so plain `--omit=dev` still drags the CLI (and its unused `mysql2` MySQL driver) into the production image. Verify this by hand after touching the Dockerfile or dependency split: install with `npm ci --omit=dev --legacy-peer-deps` in a scratch folder and confirm `node_modules/prisma` and `node_modules/mysql2` are absent. The runner ships only `dist/` — the compiled client lives at `dist/generated/`, so neither `prisma/` nor `generated/` is copied.

**Nginx Container:** routes subdomains (`admin.`, `app.`, `api.`) to the corresponding backend/frontend routes, overwrites `X-Forwarded-Host` so clients cannot spoof it, strips `X-Original-URL`/`X-Rewrite-URL`, and applies three rate-limit zones (`general`, `auth`, `devapi`). **TLS is not configured yet** — a ready-to-enable `443` block sits commented at the bottom of `nginx/default.conf`; a real domain and certificate are required first, after which set `ENABLE_HTTPS=true` for the frontend build.

## Environment Configuration

### Backend `.env`

Requires `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL`, `ADMIN_FRONTEND_URL`, and SMTP parameters (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`). Seeding additionally requires `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

- **`JWT_SECRET`** must be at least 32 characters and must not be one of the known placeholder values. `config/jwt.config.ts` throws at boot otherwise — the app fails to start rather than signing tokens with a guessable key.
- **`AUTH_COOKIE_SAMESITE`** (default `lax`) — keep `lax`. Portals call the API same-origin (see Frontend), so the cookie is first-party everywhere. `none` (which forces `Secure`) is only for a deliberately cross-site setup.
- **`SMTP_ALLOW_SELF_SIGNED`** (default `false`) — disables SMTP TLS certificate verification. Local test mail servers only; enabling it in production exposes OTPs and generated organizer passwords to anyone on the path.
- **`PRISMA_ACCEPT_DATA_LOSS`** (default `false`) — used by the `migrate` service, see Docker above.
- `ADMIN_IP_ALLOWLIST_ENABLED` / `ADMIN_IP_ALLOWLIST` / `TRUST_PROXY_HOPS` gate `AdminIpGuard`.

### Frontend `.env`

Requires `NEXT_PUBLIC_API_URL`: `same-origin` behind Nginx (Docker), or a full URL such as `http://localhost:3001` for bare `npm run dev`. It is baked in at build time and also feeds the CSP `connect-src`/`img-src` in `next.config.ts`, so it must be set for the Docker build, not just at runtime.

- **`ADMIN_HOSTS`** (default `admin.localhost,admin.compactive.com`) — exact-match allowlist used by `proxy.ts`.
- **`ENABLE_HTTPS`** (default `false`) — turns on HSTS and `upgrade-insecure-requests`. Only set it once TLS actually terminates at Nginx; enabling it over plain HTTP makes browsers rewrite API calls to `https://` and the app stops working.

## Developer Guidelines & Strict Rules

- **Prisma Access:** Access Prisma ONLY through PrismaService (`src/prisma/prisma.service.ts`). Never instantiate PrismaClient directly in feature modules.
- **DTO & Validation:** Every request body/query parameter must have a dedicated DTO with class-validator decorators. Global `ValidationPipe` enforces `whitelist: true` and `forbidNonWhitelisted: true`.
- **Response Standardization:** All controller responses are automatically wrapped by `TransformInterceptor` as `{ success, data, timestamp }`. Errors are standardized via `HttpExceptionFilter`.
- **Developer API Security:** External endpoints under `api.compactive.com` MUST be protected by `ApiKeyGuard` and throttled via `ApiKeyThrottlerGuard`. Public endpoints must filter out internal/confidential user data.
- **Role & Guard Application:** Enforce route security using `@UseGuards(JwtAuthGuard, RolesGuard)` alongside `@Roles(...)`. Endpoints exposed on `admin.compactive.com` MUST strictly verify `UserRole.ADMIN`.
- **Ownership checks belong in the service:** Controllers pass `callerId` and `callerRole` down; the service decides. The established shape is `if (callerRole !== UserRole.ADMIN && resource.organizerId !== callerId) throw new ForbiddenException(...)`. Keep it — a role check alone does not stop one organizer from editing another's activity.
- **Evaluation visibility (360° mode):** an activity with `peerAssessmentEnabled` creates its `Evaluation` rows as `pending_approval` and students must not see those scores until the organizer approves them. Every student/public/admin reader of `Evaluation` filters with `APPROVED_ONLY` (`modules/shared/registrations/evaluation-visibility.util.ts`), and student-facing payloads that carry an `evaluation` object pass it through `maskUnapprovedEvaluation` (the row stays because the frontend treats "has an evaluation" as "checked in"; only the scores are zeroed). Organizer-facing readers deliberately do not filter. A row with an `EvaluationApproval` is locked — Batch Evaluation and `PATCH /evaluations/:registrationId` must not overwrite it; only the approval flow may.
- **Event publishing (`Event.isPublic`) is enforced by `canViewerSeeEvent`** (`modules/shared/events/event-visibility.util.ts`), which adds the publish rule on top of the restricted-audience rule. Every public/student reader of events or activities, plus `RegistrationsService.create`, goes through it. An unpublished event is visible only to its own organizer (preview, and the organizer home reuses the public feed) and to admins; everyone else gets the same 404 as a missing record. It **fails closed** when `isPublic` was not loaded, so a query feeding it must select `isPublic` + `organizerId`. Queries with no viewer (Developer API newsfeed, chatbot) filter in SQL with `PUBLIC_EVENTS_ONLY`. `ActivitiesService.findById` is deliberately not gated (the owner-checked write paths use it); the public `GET /api/activities/:id` uses `findByIdPublic`, which also strips the organizer's email.
- **Never `include: { student: true }` (or any bare `true` on a User relation):** it ships the whole User row, password hash and OTP included. Use `STUDENT_BASIC_SELECT` / `STUDENT_CONTACT_SELECT` from `common/constants/user-select.ts`; `user-select.spec.ts` fails the build if a bare include comes back.
- **Thai wall-clock time goes through `common/utils/time.util.ts`:** the containers run in UTC, so `getHours()`, `toISOString().slice(0, 10)` or a bare `toLocale*String()` on a `Date` gives UTC values (a 09:30 activity was stored as `02:30`). Use `formatHHmm` / `bangkokDateOnly` / `bangkokParts`, pass `timeZone: APP_TIME_ZONE` to `toLocale*`, and append `APP_UTC_OFFSET` when parsing a stored `date` + `HH:mm`. Jest runs with `TZ=UTC` (`jest.global-setup.js`) so these bugs fail tests instead of hiding on a Thai-time laptop.
- **Skill transcript = snapshot (`modules/shared/skill-transcripts/`):** the public `GET /api/skill-transcripts/verify/:code` returns the score snapshot frozen at issue time, never live scores, and only `name` + `studentId` of the holder (no email/phone/rank). A revoked transcript returns no snapshot. Build snapshots only from `findByStudentWithActivity` (already `APPROVED_ONLY`) and the shared `summarizeEvaluations`, so PDF numbers always match the dashboard.

## Security Conventions

These exist because each one closed a real hole. Follow them rather than re-deriving them.

- **Never trust client-supplied routing headers.** `x-forwarded-host`, `x-original-url`, `x-rewrite-url` are attacker-controlled unless Nginx overwrites them. Decide from `Host`, and match against an allowlist rather than a prefix (`admin.evil.com` passes `startsWith('admin.')`).
- **Uploads are validated three times:** declared mimetype → extension → **magic bytes read back off disk**, via `common/utils/upload.util.ts`. The stored filename is a UUID plus an extension derived from the *allowlisted mimetype*, never from `file.originalname`. A filename regex alone is trivially bypassed by editing the multipart body.
- **Escape user data in outbound email.** Use `escapeHtml()` for anything interpolated into HTML bodies and `sanitizeHeaderValue()` for subject/recipient (`common/utils/html.util.ts`). Activity names and rejection reasons are free text; unescaped, they turn our mail server into a phishing relay.
- **Rate-limit every credential-accepting endpoint.** `@UseGuards(AuthThrottlerGuard)` + `@Throttle(...)` for anything taking a password, OTP, or invite token.
- **Secrets and randomness:** anything a user must not guess (OTPs, tokens) comes from `crypto.randomInt`/`randomBytes`, never `Math.random()`. Compare secrets with `timingSafeEqual`, and give failed lookups the same cost as successful ones (see the dummy bcrypt compare in `auth.service.ts`) so response timing does not leak which accounts exist.
- **Password policy lives in `common/constants/password.ts`.** Admin accounts have their own, stricter rule. Do not add a `@MinLength` inline.
- **Fail closed on misconfiguration.** Missing or placeholder `JWT_SECRET` aborts boot; SMTP verifies TLS certificates by default; destructive migrations require an explicit opt-in.
- **Keep CLI-only tooling out of the production image.** If you add a build/migrate tool, it belongs in `devDependencies` and in the `migrator` stage. After touching `backend/Dockerfile` or the dependency split, verify manually — `npm ci --omit=dev --legacy-peer-deps` in a scratch folder — that no CLI-only package (`prisma`, `mysql2`, etc.) leaked into the production tree.
- **Log security events without logging people.** Failed logins are recorded by user `id` and role, never by email — logs should not become the PII leak.
- **Registration OTP proves the registrant, not just the inbox.** `register/verify-otp` is unauthenticated yet issues a session, so it rejects already-verified accounts outright (never "idempotently" logs them in — that was a full account takeover by email) and requires the emailed OTP **plus** the password stored on the pending row, committed with a compare-and-set (`markRegistrationVerified`). `register` may overwrite an unverified row so a typo'd email cannot squat an address; that is safe only because of the password binding.