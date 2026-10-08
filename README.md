# Comp Active — Activity Management & Soft Skills Tracking System

Comp Active is an enterprise-grade platform built for managing extracurricular activities and systematically tracking student soft skill development. The system supports collaboration between students, organizers, and administrators through a modern UI and a high-performance backend.

---

## Tech Stack

### Backend
| Layer | Technology |
|-------|-----------|
| Framework | NestJS 11 (Node.js) |
| Language | TypeScript |
| Database | PostgreSQL 14+ |
| ORM | Prisma 7 |
| Authentication | Passport.js — JWT |
| Password Hashing | bcryptjs |
| Email | Nodemailer (SMTP) |
| API Docs | Swagger / OpenAPI (built-in) |

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router) |
| UI Library | React |
| Styling | Tailwind CSS + Lucide Icons |
| Components | Radix UI |
| Charts | Recharts |

---

## System Modules

### 1. Authentication
- Email/password login with JWT
- OTP verification via email
- Role-based access control (Student / Organizer / Admin)

### 2. Activity Lifecycle Management
- **Organizers** create, edit, and manage activities
- **Approval flow:** new activities require Admin approval before going public (`pending_approval` → `approved` / `rejected`)
- **Cancellation:** organizers can request cancellation; Admin reviews before confirming

### 3. Student Registration & Participation
- Search and filter activities by category, status, and keyword
- Real-time seat tracking with automatic status management
- Check-in system for attendance marking
- Certificate issuance upon activity completion

### 4. Soft Skills Evaluation
Organizers evaluate students across 5 dimensions after each activity:

| Skill | Scale |
|-------|-------|
| Teamwork | 1 – 10 |
| Leadership | 1 – 10 |
| Communication | 1 – 10 |
| Problem Solving | 1 – 10 |
| Adaptability | 1 – 10 |

- Students earn **XP points** and **level up** based on accumulated scores
- Radar chart visualization of skill development history
- Badges awarded for reaching milestones

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

`docker compose up` starts a container called **`compactive_migrate`** that does one job and then stops: it updates the database tables so they match `prisma/schema.prisma`.

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

The tool that edits database tables (the Prisma CLI) ships with drivers for MySQL and SQLite as well as PostgreSQL — including `mysql2`, which currently has a high-severity advisory. We only use PostgreSQL, so none of that is needed once the app is running.

When the backend did the schema update itself, all of those files had to live inside the server that faces the internet. Splitting the job out means the production image carries only what it needs to serve requests: **306 packages down to 172**.

Same idea as the stage crew: the screwdrivers and hammers used to build the set do not stay on stage during the performance.

---

### Option B — Local Development (without Docker)

**Prerequisites:** Node.js 18+, PostgreSQL 14+, npm

#### 1. Install Dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

#### 2. Configure Environment

Create `backend/.env`:

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

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your.email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=no-reply@cpc.kku.ac.th
```

> **Keep `AUTH_COOKIE_SAMESITE=lax`.** The Docker build sets `NEXT_PUBLIC_API_URL=same-origin`, so the portals call the API on their own host and the session cookie is first-party. Pointing the frontend at `http://api.localhost` instead makes the cookie third-party: Brave and Safari block or partition it, and a stale cookie can survive logout so a new login still acts as the previous account.

> See `backend/.env.example` for the full list of optional settings and what each one does.

#### 3. Set Up Database

```bash
cd backend

# Create the database (run once)
psql -U postgres -h localhost -c "CREATE DATABASE compactive_db;"

# Push Prisma schema to database
npx prisma db push
```

#### 4. Run the Application

```bash
# Terminal 1 — Backend
cd backend && npm run start:dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

---

## Project Structure

```
Comp_Active/
├── backend/                        # NestJS Application
│   ├── prisma/
│   │   └── schema.prisma           # Database schema & models
│   ├── generated/
│   │   └── prisma/                 # Auto-generated Prisma client
│   └── src/
│       ├── prisma/                 # PrismaService & PrismaModule
│       ├── auth/                   # JWT strategy, login, register, admin invite accept
│       ├── admin-invites/          # Admin-invites-a-new-admin flow
│       ├── organizer-requests/     # Organizer application + approval flow
│       ├── users/                  # User profile management
│       ├── activities/             # Activity CRUD & approval flow
│       ├── registrations/          # Registration, check-in, attendance
│       ├── evaluations/            # Soft skills scoring
│       ├── certificates/           # Certificate issuance
│       ├── admin/                  # Admin dashboard & stats
│       ├── mail/                   # Email notification service
│       ├── seed/                   # First-admin bootstrap on app start
│       └── common/                 # Guards, decorators, enums, utils, constants
└── frontend/                       # Next.js Application
    ├── proxy.ts                    # Admin-subdomain rewrite/isolation
    ├── app/
    │   ├── auth/                   # Student/organizer login + register
    │   ├── admin/
    │   │   ├── (public)/           # Admin login, invite-accept — no guard
    │   │   └── (dashboard)/        # Guarded admin panel
    │   ├── events/                 # Public activity listing
    │   ├── organizer/              # Organizer dashboard
    │   └── student/                # Student dashboard & profile
    ├── components/                 # Reusable UI components
    └── lib/                        # API client & auth context
```

---

## Database Schema

```
User ──< Activity ──< Registration >── Certificate
                           │
                           └── Evaluation
```

| Model | Key Relations |
|-------|--------------|
| `User` | has many Activities (as organizer), has many Registrations |
| `Activity` | has Tags, Conditions, Benefits, SoftSkills; has many Registrations |
| `Registration` | belongs to Activity + User; has one Certificate, one Evaluation |
| `Certificate` | issued when attendance is confirmed |
| `Evaluation` | soft skill scores recorded per registration |

---

## User Roles

| Role | Permissions |
|------|-------------|
| `student` | Browse activities, register, view own certificates & skill stats |
| `organizer` | Create/manage own activities, confirm registrations, evaluate students |
| `admin` | Approve/reject activities, manage all users, view platform statistics |

---

## Useful Commands

```bash
# Generate Prisma client after schema changes
npx prisma generate

# Push schema changes to database (dev)
npx prisma db push

# Reset database and re-push schema
npx prisma db push --force-reset

# Open Prisma Studio (GUI)
npx prisma studio
```
