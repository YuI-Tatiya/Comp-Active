# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Comp Active is an activity management and soft-skills tracking platform for a college computing department. Three roles — **student**, **organizer**, **admin** — collaborate through a NestJS API (`backend/`) and a Next.js App Router frontend (`frontend/`).

Core domain flow:
- Organizers create activities → status starts as `pending_approval` → Admin approves/rejects (`ApprovalStatus`).
- Students browse approved activities and register (`Registration`, status `pending → confirmed`, cancellable).
- Organizers confirm registrations, check students in (`AttendanceStatus`), and issue `Certificate`s.
- Organizers evaluate students post-activity across 5 soft skills (teamwork, leadership, communication, problem solving, adaptability) via `Evaluation`.
- Non-organizer users can submit an `OrganizerRequest` to be promoted to organizer, which Admin approves/rejects.

## Commands

### Backend (`backend/`)
```bash
npm install                    # install deps
npm run start:dev              # dev server with hot reload (port 3001, from PORT env)
npm run build                  # prisma generate + nest build
npm run start:prod             # run built dist/main
npm run lint                   # eslint --fix over src/apps/libs/test
npm run format                 # prettier --write

npm run test                   # jest unit tests (all *.spec.ts under src/)
npx jest src/auth/auth.service.spec.ts   # run a single test file
npx jest -t "test name"        # run tests matching a name
npm run test:cov               # coverage
npm run test:e2e               # jest e2e (test/jest-e2e.json)

npm run prisma:generate        # regenerate Prisma client into backend/generated/prisma
npm run prisma:push            # push schema.prisma to DB without a migration (used in dev/Docker)
npm run prisma:migrate         # prisma migrate dev
npm run prisma:seed            # seed an admin user from ADMIN_EMAIL/ADMIN_PASSWORD in .env
```

### Frontend (`frontend/`)
```bash
npm install
npm run dev      # next dev, port 3000
npm run build
npm run start
npm run lint
```

### Docker (runs both + Postgres)
```bash
docker compose up --build      # Postgres:5433(host)->5432, backend:3001, frontend:3000
```
The backend container waits for Postgres's healthcheck, then `entrypoint.sh` runs `prisma db push` before starting — there is no migration history in Docker dev, schema is pushed directly.

## Architecture

### Backend — NestJS + Prisma
- Feature modules live under `backend/src/<feature>/` (`auth`, `users`, `activities`, `registrations`, `certificates`, `evaluations`, `admin`, `organizer-requests`, `mail`, `seed`), each with `*.module.ts` / `*.controller.ts` / `*.service.ts`, wired together in `app.module.ts`.
- **Prisma is accessed only through `PrismaService`** (`backend/src/prisma/prisma.service.ts`), which wraps `PrismaClient` with the `@prisma/adapter-pg` driver adapter and exposes one getter per model (`.user`, `.activity`, `.registration`, etc.) plus `$transaction`. Don't instantiate `PrismaClient` directly in feature code.
- The generated Prisma client lives at `backend/generated/prisma` (not the default `node_modules/.prisma`) — re-run `prisma generate` after schema changes, and import client types from there (`../../generated/prisma/client`) as `prisma.service.ts` and `seed.ts` do.
- `schema.prisma` has no `@relation` cascade surprises to worry about beyond what's declared: most child tables (`ActivityTag/Condition/Benefit/SoftSkill`, `Registration`, `Certificate`, `Evaluation`) cascade-delete with their parent.
- Auth/authorization: JWT via Passport (`JwtAuthGuard` in `common/guards`), plus a role check via `RolesGuard` reading metadata set by the `@Roles(...UserRole[])` decorator (`common/decorators/roles.decorator.ts`). Guard order in controllers is `@UseGuards(JwtAuthGuard, RolesGuard)`. Get the authenticated user in a handler with `@CurrentUser()` / `@CurrentUser('field')`.
- All controller routes are declared with an explicit `api/` prefix in `@Controller('api/...')` (there's no global `setGlobalPrefix`), so route prefixes must be added per-controller, matching the existing pattern.
- Global request/response plumbing is set up in `main.ts`: CORS restricted to `FRONTEND_URL`, a global `ValidationPipe` (whitelist + transform + forbidNonWhitelisted — DTOs must declare every accepted field with class-validator decorators or requests get rejected), a global `HttpExceptionFilter`, and a global `TransformInterceptor` that wraps every response as `{ success, data, timestamp }` (errors as `{ success: false, statusCode, message, timestamp, path }`).
- Swagger docs are auto-generated from controller/DTO decorators and served at `/api` (`ApiTags`/`ApiOperation`/`ApiBearerAuth` are used throughout — keep new endpoints annotated consistently).
- Static/uploaded files (activity images) are served from `backend/public` via `ServeStaticModule` at the root path; `activities.controller.ts` uses `multer`'s `diskStorage` + `FileInterceptor` for uploads.
- Enums (`UserRole`, `ActivityStatus`, `ApprovalStatus`, `RegistrationStatus`, `AttendanceStatus`, `RequestStatus`) are defined both in `schema.prisma` (DB-level) and mirrored in `common/enums/` (TS-level) — keep them in sync when adding values.

### Frontend — Next.js App Router
- All backend calls go through `frontend/lib/api.ts`, a single typed client keyed off `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001`). Add new endpoints there rather than calling `fetch` directly from components/pages.
- Auth state is a React context in `frontend/lib/auth-context.tsx` (`AuthProvider`/`useAuth`), backed by a JWT stored in `localStorage` and hydrated on load via `authAPI.getProfile()`.
- Routes are organized by role under `app/`: `app/student/*`, `app/organizer/*`, `app/admin/*`, plus shared `app/auth/*` (with role-specific subpaths `auth/student`, `auth/organizer`, `auth/admin`) and public `app/events/*`.
- Shared UI in `components/ui/` (Radix + `class-variance-authority` + `tailwind-merge`, i.e. shadcn-style primitives) and auth-related UI in `components/auth/`.

## Environment configuration

Backend `.env` (see `backend/.env.example`) requires at minimum `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL`, and SMTP settings (`SMTP_HOST/PORT/SECURE/USER/PASS/FROM`) for Nodemailer-based email (OTP verification, notifications — see `mail/mail.service.ts`). Seeding an admin additionally requires `ADMIN_EMAIL`/`ADMIN_PASSWORD`.

Frontend needs `NEXT_PUBLIC_API_URL` pointing at the backend.
