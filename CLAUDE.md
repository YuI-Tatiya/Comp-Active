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

Shared login path for both Students and Organizers (`/auth/login`).

- **Student Features:** Register for activities, request volunteer certificates, gain points across 5 soft skills (teamwork, leadership, communication, problem solving, adaptability), and evaluate activities.
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

Feature modules live under `backend/src/modules/` (auth, users, activities, registrations, volunteer-services, admin-dashboard, developer-portal, mail, seed), each with `*.module.ts`, `*.controller.ts`, `*.service.ts`, and `*.repository.ts`, wired together in `app.module.ts`.

Prisma is accessed only through PrismaService (`backend/src/prisma/prisma.service.ts`), which wraps PrismaClient with the `@prisma/adapter-pg` driver adapter and exposes one getter per model (`.user`, `.activity`, `.registration`, `.certificate`, `.evaluation`, etc.) plus `$transaction`. Don't instantiate PrismaClient directly in feature code.

The generated Prisma client lives at `backend/generated/prisma` (not the default `node_modules/.prisma`) — re-run `prisma generate` after schema changes, and import client types from there (`../../generated/prisma/client`).

#### Auth & Guards

- **Internal Users:** JWT via Passport (`JwtAuthGuard` in `common/guards`), plus role checks via `RolesGuard` (`@Roles(...UserRole[])`). Guard order is `@UseGuards(JwtAuthGuard, RolesGuard)`. Get user via `@CurrentUser()`.
- **External Developers:** Protected by `ApiKeyGuard` and throttled by `RateLimiterMiddleware`.

#### Global Plumbing (`main.ts`)

CORS restricted to domain origins, global `ValidationPipe` (`whitelist: true`, `transform: true`, `forbidNonWhitelisted: true`), global `HttpExceptionFilter`, and global `TransformInterceptor` wrapping responses as `{ success, data, timestamp }` (errors as `{ success: false, statusCode, message, timestamp, path }`).

Swagger docs are auto-generated from decorators and served at `/api` (`ApiTags`/`ApiOperation`/`ApiBearerAuth`).

Static/uploaded files (activity images) are served from `backend/public` via `ServeStaticModule`; file uploads use multer (`diskStorage` + `FileInterceptor`).

Enums (`UserRole`, `ActivityStatus`, `ApprovalStatus`, `RegistrationStatus`, `AttendanceStatus`, `SoftSkillType`) are defined in `schema.prisma` and mirrored in `common/enums/`.

### Frontend — Next.js App Router

All backend calls go through `frontend/lib/api.ts`, a single typed client keyed off `NEXT_PUBLIC_API_URL` (routed through Nginx Gateway).

Auth state is a React context in `frontend/lib/auth-context.tsx` (`AuthProvider`/`useAuth`), backed by JWT in `localStorage` and hydrated via `authAPI.getProfile()`.

Routes organized under `app/`:

- `app/admin/*` — Admin subdomain portal (separate login)
- `app/student/*` & `app/organizer/*` — Student/Organizer portal
- `app/auth/*` — Shared authentication routes for Student and Organizer
- `app/events/*` — Public landing and activity showcases

Shared UI in `components/ui/` (Radix + Tailwind + CVA) and auth UI in `components/auth/`.

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
docker compose up --build      # Postgres:5432, Backend:3001, Frontend:3000, Nginx Gateway:80/443
```

**Nginx Container:** Handles SSL termination, routes subdomains (`admin.`, `app.`, `api.`) to corresponding backend/frontend routes, and enforces rate limits on public developer APIs.

## Environment Configuration

### Backend `.env`

Requires `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL`, and SMTP parameters (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`). Seeding additionally requires `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

### Frontend `.env`

Requires `NEXT_PUBLIC_API_URL` pointing to the Nginx Gateway domain or backend endpoint.

## Developer Guidelines & Strict Rules

- **Prisma Access:** Access Prisma ONLY through PrismaService (`src/prisma/prisma.service.ts`). Never instantiate PrismaClient directly in feature modules.
- **DTO & Validation:** Every request body/query parameter must have a dedicated DTO with class-validator decorators. Global `ValidationPipe` enforces `whitelist: true` and `forbidNonWhitelisted: true`.
- **Response Standardization:** All controller responses are automatically wrapped by `TransformInterceptor` as `{ success, data, timestamp }`. Errors are standardized via `HttpExceptionFilter`.
- **Developer API Security:** External endpoints under `api.compactive.com` MUST be protected by `ApiKeyGuard` and throttled via `RateLimiterMiddleware`. Public endpoints must filter out internal/confidential user data.
- **Role & Guard Application:** Enforce route security using `@UseGuards(JwtAuthGuard, RolesGuard)` alongside `@Roles(...)`. Endpoints exposed on `admin.compactive.com` MUST strictly verify `UserRole.ADMIN`.