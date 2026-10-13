

Comp Active is an activity management, soft-skills tracking, and volunteer service platform for a college computing department. Three core roles — **student**, **organizer**, and **admin** — plus **external developers** reach the system through a single Nginx gateway that routes to three domains by hostname:

```
                               ┌──► admin.compactive.com ──► Admin Portal
[ Users / External Devs ] ──► Nginx Gateway ├──► app.compactive.com   ──► Student & Organizer Portal
                               └──► api.compactive.com   ──► Public Developer API
```

Students register for activities, get auto-evaluated across 12 soft skills when they check in (with an optional 360° self/peer mode an organizer can turn on), and can issue a verifiable PDF skill transcript or volunteer certificate. Organizers build activities (single or multi-round "events"), set per-skill scoring, and manage registrations/attendance. Admins approve activities and organizer applications, moderate users, and manage the public landing page. External developers get a read-only activity newsfeed and a certificate-verification endpoint behind an API key.

---

## Tech Stack

### Backend
| Layer | Technology |
|-------|-----------|
| Framework | NestJS 11 (Node.js) |
| Language | TypeScript |
| Database | PostgreSQL 16 |
| ORM | Prisma 7 (`@prisma/adapter-pg` driver adapter) |
| Authentication | Passport.js — JWT in an httpOnly cookie |
| Password Hashing | bcryptjs |
| Email | Nodemailer (SMTP), OTP-based registration/verification |
| Chat Assistant | KKU IntelSphere (OpenAI-Chat-Completions-compatible gateway) |
| API Docs | Swagger / OpenAPI (dev only, disabled in production) |

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI Library | React 19 |
| Styling | Tailwind CSS v4 ("Denim Varsity" design system) |
| Components | Radix UI primitives + `class-variance-authority` |
| Icons | lucide-react |
| Charts | Recharts (soft-skill radar) |
| QR | `qrcode.react` (generate) / `jsqr` (scan, client-side decode) |

### Infrastructure
| Layer | Technology |
|-------|-----------|
| Reverse proxy / gateway | Nginx (subdomain routing, rate limiting, header hardening) |
| Containers | Docker Compose (Postgres, a one-shot migration step, backend, frontend, Nginx) |
| CI | GitHub Actions — lint + build + backend tests on every push/PR (`.github/workflows/ci.yml`) |

---

## System Modules

### 1. Authentication
- Student/organizer share one login endpoint; admin has a fully separate login (and optional IP/VPN allowlist).
- JWT travels in an httpOnly cookie (not `localStorage`), so it can't be read or stolen via XSS.
- Student self-registration goes through email OTP verification before the account is usable.
- New organizer accounts aren't self-registered: an applicant submits a request, an admin approves it, and credentials are emailed out.
- Login attempts are rate-limited per account (not per IP), so one shared campus NAT address can't lock out everyone else.

### 2. Activities & Events
- An **Event** can bundle multiple **Activities** (rounds/sessions students pick from); a plain Activity can also stand alone.
- New activities need admin approval (`pending_approval → approved / rejected`) before they're public, and publishing is a separate on/off switch an organizer controls afterward.
- Organizers can request cancellation (admin confirms) or cancel outright, depending on the activity; registration windows (open/close dates), seat caps, and category tags are all organizer-configurable.

### 3. Registration & Check-in
- Students browse/filter public activities, register, and track status (pending → confirmed → evaluated, or cancelled) on one page.
- Attendance is marked either by the organizer or by the student scanning a **rotating QR code** the organizer displays (a short-lived HMAC token, not a static image that could be screenshotted and reused).
- A volunteer certificate (with hours and role) can be issued once attendance is confirmed, and is publicly verifiable by its code.

### 4. Soft Skills Evaluation
Organizers set a target level per skill when creating an activity, across all **12 soft skills** (communication, time management, flexibility/adaptability, teamwork, analytical/critical thinking, decision making, creativity, complex problem solving, lifelong learning, negotiation/persuasion, leadership, positive attitude). Scores use a 3-tier scale rather than a numeric range:

| Level | Meaning |
|-------|---------|
| 1 | ผ่าน (Pass) |
| 2 | ดี (Good) |
| 3 | ดีเยี่ยม (Excellent) |

- Checking in auto-records the activity's preset levels for the student — no manual grading needed for most activities.
- Longer/staff-style activities can optionally enable **360° evaluation**: students also self-assess and peer-assess, the organizer reviews and approves a net score per skill, and scores stay hidden from the student until approved.
- Students accumulate points, a rank among all students, and badges from their evaluation history, visualized with a radar chart.
- A **skill transcript** — a point-in-time PDF snapshot, independently verifiable by a public code/QR — is the formal, shareable proof of a student's soft-skill record.

### 5. Admin
- Review/approve organizer applications and activity submissions.
- Moderate users (block/unblock), manage landing-page content, and view platform-wide analytics.
- Issue and rotate API keys for the developer API, and invite additional admins.

### 6. Public Developer API (`api.*`)
- Read-only activity newsfeed and a volunteer-certificate verification endpoint, both behind an API key (per-key rate limiting, plus a coarser IP-based limit at the gateway).

### 7. Chat Assistant
- A draggable chat widget (mascot) answers common "how do I…" questions with instant canned replies, and falls back to an AI model (via KKU IntelSphere, an OpenAI-compatible gateway) for anything else — scoped to site-usage questions only, with no access to any user's actual account data.

---

## Getting Started

### Option A — Docker (Recommended)

**Prerequisites:** Docker Desktop

```bash
# Start everything with one command
docker compose up --build
```

Everything is reached through the Nginx gateway on port **80** — the frontend and backend containers are not published directly.

| What | URL |
|------|-----|
| Student & Organizer portal | http://app.localhost |
| Admin portal | http://admin.localhost |
| Backend API (used by the portals) | `/api` and `/uploads` on the portal's own host, e.g. http://app.localhost/api |
| Developer API (external) | http://api.localhost |
| PostgreSQL | `127.0.0.1:5433` (local tools only, not exposed to the network) |

> **Swagger is off in Docker.** The compose file runs the backend with `NODE_ENV=production`, which disables the docs. Use Option B below if you need Swagger.

> If `app.localhost` does not resolve on your machine, add `127.0.0.1 app.localhost admin.localhost api.localhost` to your hosts file (`C:\Windows\System32\drivers\etc\hosts` on Windows, `/etc/hosts` on macOS/Linux).

**Useful Docker commands:**
```bash
docker compose up --build          # First run (build images + start)
docker compose up                  # Start without rebuilding
docker compose down                # Stop all containers
docker compose down -v             # Stop and delete database volume
docker compose logs -f backend     # Stream backend logs
docker compose logs migrate        # See what the schema update did
```

---

### The `migrate` container — please read this once

`docker compose up` starts a container called **`compactive_migrate`** that does one job and then stops: it updates the database tables so they match `prisma/schema.prisma`, then runs any data-repair scripts under `backend/prisma/backfills/`.

Think of it as the crew that sets up the stage before the show. They come in first, arrange everything to plan, and leave before the audience arrives. Only once the stage is ready does the cast (the backend) come on.

```
postgres  →  migrate  →  backend  →  nginx
             runs and    starts only after
             exits       migrate succeeds
```

**Why this matters to you day to day:** if a teammate adds a field to `schema.prisma` and pushes it, your local database does not know about that column yet. Open the profile page and it breaks. The `migrate` container applies those changes for everyone automatically, so nobody has to remember to run anything by hand.

#### Three things that will look alarming but are not

**1. The container shows as stopped. That is correct.**

```
compactive_migrate   Exited (0)      ← finished its job and left. This is success.
compactive_backend   Up 2 minutes
```

`Exited (0)` means "done, no errors". Only worry if the number is something other than 0.

**2. You no longer run `prisma db push` yourself for Docker.** Just `docker compose up`.

**3. Sometimes `migrate` will refuse to run — on purpose.**

If a schema change would **destroy existing data** (dropping a column, changing a column's type), `migrate` stops and the backend never starts. You will see the failure instead of losing rows.

This is deliberate. The old setup passed `--accept-data-loss` on every single startup, which meant a careless schema edit could quietly wipe real data — the kind of thing you discover the day before a demo.

If the data loss is genuinely intended, set this in `docker-compose.yml`, run once, then **change it straight back**:

```yaml
PRISMA_ACCEPT_DATA_LOSS: "true"
```

Never commit `"true"`. If you are not sure why `migrate` is refusing, ask in the team chat before overriding it.

#### Why it is a separate container

The tool that edits database tables (the Prisma CLI) ships with drivers for MySQL and SQLite as well as PostgreSQL. We only use PostgreSQL, so none of that is needed once the app is running. Splitting the schema-update step out means the production image carries only what it needs to serve requests.

Same idea as the stage crew: the screwdrivers and hammers used to build the set do not stay on stage during the performance.

---

### Option B — Local Development (without Docker)

**Prerequisites:** Node.js 20+ (matches the Docker image), PostgreSQL 14+, npm

#### 1. Install Dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

#### 2. Configure Environment

Create `backend/.env` (see `backend/.env.example` for the full list, including optional settings like the chat assistant and admin IP allowlist):

```env
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/compactive_db"

# Must be at least 32 characters and not a placeholder — the app refuses to
# start otherwise, rather than signing tokens with a key anyone could guess.
# Generate one with:
#   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
JWT_SECRET=paste-a-generated-value-here-at-least-32-chars
JWT_EXPIRES_IN=7d

FRONTEND_URL=http://localhost:3000
ADMIN_FRONTEND_URL=http://admin.localhost:3000

# Seeds the first admin account on boot
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your.email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=no-reply@cpc.kku.ac.th
```

> **Keep `AUTH_COOKIE_SAMESITE=lax`.** The Docker build sets `NEXT_PUBLIC_API_URL=same-origin`, so the portals call the API on their own host and the session cookie is first-party. Pointing the frontend at `http://api.localhost` instead makes the cookie third-party: Brave and Safari block or partition it, and a stale cookie can survive logout so a new login still acts as the previous account.

Create `frontend/.env` (see `frontend/.env.example`):

```env
# For bare `npm run dev` without Nginx, point this at the backend directly.
# (Docker Compose instead uses NEXT_PUBLIC_API_URL=same-origin — see above.)
NEXT_PUBLIC_API_URL=http://localhost:3001
```

#### 3. Set Up Database

```bash
cd backend

# Create the database (run once)
psql -U postgres -h localhost -c "CREATE DATABASE compactive_db;"

# Push Prisma schema to database
npx prisma db push

# Seed the admin account from ADMIN_EMAIL/ADMIN_PASSWORD
npm run prisma:seed

# Optional: seed a demo organizer + student with sample activities/
# registrations/evaluations, so the student portal isn't empty.
# Safe to re-run — only touches its own *.demo@compactive.test accounts.
npm run prisma:seed:demo
```

#### 4. Run the Application

```bash
# Terminal 1 — Backend
cd backend && npm run start:dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Backend: http://localhost:3001 (Swagger at `/api`). Frontend: http://localhost:3000.

---

## Project Structure

```
.
├── backend/                              # NestJS application
│   ├── prisma/
│   │   ├── schema.prisma                 # Database schema & models (source of truth)
│   │   ├── backfills/                    # Idempotent data-repair SQL, run by the migrate step
│   │   ├── seed.ts                       # First-admin bootstrap (npm run prisma:seed)
│   │   └── seed-demo.ts                  # Sample data for local development
│   ├── generated/prisma/                 # Auto-generated Prisma client (not node_modules/.prisma)
│   └── src/
│       ├── modules/
│       │   ├── admin/                    # Admin-only controllers (approvals, users, API keys, site content)
│       │   ├── organizer/                # Organizer-only controllers
│       │   ├── student/                  # Student-only controllers
│       │   └── shared/                   # Domain services the controllers above delegate to:
│       │       ├── auth/                 #   login, registration + OTP, admin auth, organizer requests
│       │       ├── users/                #   profile management
│       │       ├── activities/           #   activity CRUD, approval, public newsfeed
│       │       ├── events/               #   multi-activity events, publishing/visibility rules
│       │       ├── registrations/        #   registration, QR check-in, soft-skill evaluation, 360° mode
│       │       ├── volunteer-services/   #   certificate issuance & public verification
│       │       ├── skill-transcripts/    #   soft-skill PDF transcript issuance & verification
│       │       ├── admin-dashboard/      #   landing content, analytics, organizer-request approval
│       │       ├── chatbot/              #   chat assistant proxy (KKU IntelSphere)
│       │       ├── mail/                 #   SMTP email templates
│       │       └── seed/                 #   seed service wiring
│       ├── prisma/                       # PrismaService — the only way the app touches PrismaClient
│       └── common/                       # Guards, decorators, enums, utils, constants
│
├── frontend/                              # Next.js (App Router) application
│   ├── proxy.ts                           # Admin-subdomain rewrite, decided from the Host header only
│   ├── app/
│   │   ├── auth/                          # Shared student/organizer login + register, organizer apply
│   │   ├── admin/
│   │   │   ├── (public)/                  # Admin login, invite-accept — no guard
│   │   │   └── (dashboard)/               # Guarded admin panel
│   │   ├── events/                        # Public activity/event listing & detail (guests + students)
│   │   ├── organizer/                     # Organizer home, create wizard, manage, dashboards, settings
│   │   ├── student/                       # Student home, events, registrations, profile
│   │   └── verify/                        # Public certificate/skill-transcript verification pages
│   ├── components/
│   │   ├── denim/                         # Shared "Denim Varsity" theme pieces (cards, hero, stat tiles)
│   │   ├── activity/, organizer/, student/, admin/, auth/  # Page-specific building blocks
│   │   └── ui/                            # Generic primitives (Radix-based)
│   └── lib/                               # Single typed API client (api.ts), auth context, pure helpers
│
├── nginx/default.conf                      # Subdomain routing, rate-limit zones, header hardening
└── docker-compose.yml                      # postgres → migrate → backend/frontend → nginx
```

---

## Database Schema

The real schema (`backend/prisma/schema.prisma`) has around 30 models — activity questions/surveys, evaluation approvals, API keys, site content, admin invites, and more. The core relations:

```
User ──< Activity (as organizer) ──< Registration >── Certificate
  │            │                         │
  │            └── belongs to an Event   └── Evaluation ── EvaluationApproval (360° mode)
  └──< SkillTranscript
```

| Model | Key Relations |
|-------|--------------|
| `User` | role: `student` \| `organizer` \| `admin`; organizers have many Activities, students have many Registrations |
| `Event` | optional grouping for one or more Activities (multi-round activities) |
| `Activity` | belongs to an organizer and optionally an Event; has Tags, Conditions, Benefits, SoftSkills, Questions; has many Registrations |
| `Registration` | belongs to an Activity + User; has one Certificate, one Evaluation, optional survey/question answers |
| `Evaluation` | the 12 soft-skill scores recorded for one registration; `status` gates visibility during 360° approval |
| `Certificate` | volunteer certificate, issued when attendance is confirmed |
| `SkillTranscript` | a frozen, independently verifiable snapshot of a student's soft-skill record |
| `ApiKey` | credentials for the external Developer API |

---

## User Roles

| Role | Permissions |
|------|-------------|
| `student` | Browse/register for activities, check in (QR or organizer-marked), view skill scores/rank, issue skill transcripts and volunteer certificates |
| `organizer` | Create/manage own activities and events, confirm registrations, run the auto/360° evaluation workflow, export attendance |
| `admin` | Approve activities and organizer applications, moderate users, manage landing content, view platform analytics, manage developer API keys |

---

## Useful Commands

### Backend (`backend/`)
```bash
npm run start:dev              # dev server with hot reload
npm run build                  # prisma generate + nest build
npm run lint                   # eslint --fix over src/
npm test                       # jest unit tests
npx jest path/to/file.spec.ts  # run a single test file
npm run prisma:generate        # regenerate the Prisma client
npm run prisma:push            # push schema.prisma to the DB without a migration
npm run prisma:seed            # seed the admin user from ADMIN_EMAIL/ADMIN_PASSWORD
npm run prisma:seed:demo       # seed sample organizer/student/activity data
npx prisma studio              # open Prisma's DB GUI
```
<<<<<<< HEAD

### Frontend (`frontend/`)
```bash
npm run dev      # next dev, port 3000
npm run build    # production build
npm run lint     # eslint
npm test         # node --test over lib/*.test.ts (pure logic only)
```

---

For architecture details, security conventions, and the design system this UI is built on, see **`CLAUDE.md`** in the repo root.
=======
>>>>>>> origin/main
