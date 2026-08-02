# CP Check — Activity Management & Soft Skills Tracking System

CP Check is an enterprise-grade platform built for managing extracurricular activities and systematically tracking student soft skill development. The system supports collaboration between students, organizers, and administrators through a modern UI and a high-performance backend.

---

## Tech Stack

### Backend
| Layer | Technology |
|-------|-----------|
| Framework | NestJS 11 (Node.js) |
| Language | TypeScript |
| Database | PostgreSQL 14+ |
| ORM | Prisma 7 |
| Authentication | Passport.js — JWT + Google OAuth 2.0 |
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

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| Swagger Docs | http://localhost:3001/api |
| PostgreSQL | localhost:**5433** (host access) |

> The backend waits for PostgreSQL to be healthy, then runs `prisma db push` automatically before starting.

**Useful Docker commands:**
```bash
docker compose up --build          # First run (build images + start)
docker compose up                  # Start without rebuilding
docker compose down                # Stop all containers
docker compose down -v             # Stop and delete database volume
docker compose logs -f backend     # Stream backend logs
```

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
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/cpcheck_db"
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your.email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=no-reply@cpc.kku.ac.th
```

#### 3. Set Up Database

```bash
cd backend

# Create the database (run once)
psql -U postgres -h localhost -c "CREATE DATABASE cpcheck_db;"

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
CP_Check/
├── backend/                        # NestJS Application
│   ├── prisma/
│   │   └── schema.prisma           # Database schema & models
│   ├── generated/
│   │   └── prisma/                 # Auto-generated Prisma client
│   └── src/
│       ├── prisma/                 # PrismaService & PrismaModule
│       ├── auth/                   # JWT strategy, login, register, OTP
│       ├── users/                  # User profile management
│       ├── activities/             # Activity CRUD & approval flow
│       ├── registrations/          # Registration, check-in, attendance
│       ├── evaluations/            # Soft skills scoring
│       ├── certificates/           # Certificate issuance
│       ├── admin/                  # Admin dashboard & stats
│       ├── mail/                   # Email notification service
│       └── common/                 # Guards, decorators, enums, filters
└── frontend/                       # Next.js Application
    ├── app/
    │   ├── auth/                   # Login / Register pages
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
