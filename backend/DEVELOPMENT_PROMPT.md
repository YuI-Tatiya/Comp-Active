# Development Prompt: Comp Active Backend (NestJS + TypeScript)

## บริบทของโปรเจค

นี่คือ Backend API สำหรับระบบจัดการกิจกรรม "Comp Active" ของวิทยาลัยการคอมพิวเตอร์  
เขียนด้วย **NestJS + TypeScript** เชื่อมกับ **Frontend (Next.js 16)** ที่อยู่ในโฟลเดอร์ `frontend/`

### เทคโนโลยีที่ใช้
- **Framework**: NestJS 11 (TypeScript)
- **Database**: PostgreSQL + TypeORM (sync mode ใน dev)
- **Authentication**: JWT + Google OAuth 2.0 (Passport.js)
- **Validation**: class-validator + class-transformer
- **API Docs**: Swagger (เข้าถึงที่ `http://localhost:3001/api`)

### 3 บทบาทในระบบ
1. **Student (นักศึกษา)** — ค้นหา/ลงทะเบียน/เช็คอิน/ดาวน์โหลดเกียรติบัตร
2. **Organizer (ผู้จัดกิจกรรม)** — สร้าง/จัดการกิจกรรม, ตรวจสอบรายชื่อ, ออกเกียรติบัตร
3. **Admin (ผู้ดูแลระบบ)** — อนุมัติกิจกรรม, จัดการผู้ใช้, Dashboard สถิติ

### กฎสำคัญ
- Organizer สร้างกิจกรรม → สถานะ `pending_approval` → Admin ต้องอนุมัติก่อนจึงจะแสดงในระบบ
- Login ด้วย Google ต้อง Register ก่อน (เลือก role + กรอกข้อมูล)
- Student ลงทะเบียน → Organizer ยืนยัน → Student เช็คอิน → Organizer ออกเกียรติบัตร

---

## โครงสร้างโปรเจค

```
backend/src/
├── main.ts                    # Entry point + CORS + Swagger
├── app.module.ts              # Root module
├── config/
│   └── database.config.ts     # PostgreSQL TypeORM config
├── common/                    # Shared utilities
│   ├── decorators/            # @Roles(), @CurrentUser()
│   ├── guards/                # JwtAuthGuard, RolesGuard
│   ├── filters/               # HttpExceptionFilter
│   ├── interceptors/          # TransformInterceptor
│   └── enums/                 # UserRole, ActivityStatus, etc.
├── auth/                      # JWT + Google OAuth
├── users/                     # User CRUD + profile
├── activities/                # Activity CRUD + approval
├── registrations/             # Register/cancel/check-in
├── certificates/              # Certificate issuance
└── admin/                     # Dashboard stats
```

## .env Configuration

```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=<your_password>
DB_DATABASE=compactive_db
JWT_SECRET=<your_secret>
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=<from_google_console>
GOOGLE_CLIENT_SECRET=<from_google_console>
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

---

## คำสั่งรัน

```bash
# ติดตั้ง dependencies
cd backend && npm install

# รัน dev server (hot reload)
npm run start:dev

# Build production
npm run build

# รัน production
npm run start:prod
```

---

## Prompt สำหรับ AI ช่วยพัฒนาต่อ

ใช้ prompt ด้านล่างนี้เมื่อต้องการให้ AI ช่วยเขียนโค้ดเชื่อม Frontend กับ Backend:

---

### Prompt: เชื่อม Frontend กับ Backend API

```
คุณเป็น Full-stack Developer ที่เชี่ยวชาญ NestJS + Next.js

## โปรเจค
- Frontend: Next.js 16 (TypeScript, TailwindCSS) อยู่ที่ `frontend/`
- Backend: NestJS 11 (TypeScript, TypeORM/PostgreSQL) อยู่ที่ `backend/`
- Backend API ทำงานบน port 3001, Frontend บน port 3000

## Backend API Endpoints (สำคัญ)

### Auth
- POST /api/auth/register — สมัครสมาชิก { name, email, password, role, studentId?, googleId? }
- POST /api/auth/login — เข้าสู่ระบบ { email, password } → { accessToken, user }
- GET /api/auth/google — เริ่ม Google OAuth
- GET /api/auth/google/callback — Google callback (redirect)
- GET /api/auth/profile — ดูข้อมูลปัจจุบัน [JWT Required]

### Activities
- GET /api/activities — ดูกิจกรรมที่อนุมัติแล้ว (public)
- GET /api/activities/:id — ดูรายละเอียด
- POST /api/activities — สร้างกิจกรรม [Organizer]
- GET /api/activities/my — กิจกรรมของฉัน [Organizer]
- GET /api/activities/pending — รออนุมัติ [Admin]
- PATCH /api/activities/:id/approve — อนุมัติ [Admin]
- PATCH /api/activities/:id/reject — ปฏิเสธ [Admin] { reason }

### Registrations
- POST /api/registrations — ลงทะเบียน { activityId } [Student]
- DELETE /api/registrations/:id — ยกเลิก [Student]
- GET /api/registrations/my — ประวัติ [Student]
- GET /api/registrations/activity/:id — รายชื่อผู้สมัคร [Organizer]
- PATCH /api/registrations/:id/confirm — ยืนยัน [Organizer]
- PATCH /api/registrations/:id/check-in — เช็คอิน [Organizer]

### Certificates
- POST /api/certificates/issue/:registrationId — ออกเกียรติบัตร [Organizer]
- GET /api/certificates/my — เกียรติบัตรของฉัน [Student]

### Admin
- GET /api/admin/dashboard/stats — สถิติ Dashboard [Admin]
- GET /api/users — ดูผู้ใช้ทั้งหมด [Admin]
- PATCH /api/users/:id/role — เปลี่ยน role [Admin]
- DELETE /api/users/:id — ลบผู้ใช้ [Admin]

## Response Format
ทุก response ถูก wrap ด้วย: { success: true, data: {...}, timestamp: "..." }
Error: { success: false, statusCode: 400, message: [...], timestamp: "...", path: "..." }

## Authentication
- ส่ง JWT Token ผ่าน Header: `Authorization: Bearer <token>`
- เก็บ token ใน localStorage หรือ cookie

## สิ่งที่ต้องทำ
1. สร้าง API client ใน frontend สำหรับเรียก backend
2. เชื่อม Login/Register form กับ /api/auth
3. เพิ่มปุ่ม "Login with Google"
4. เชื่อมหน้า Student กับ API กิจกรรม
5. เชื่อมหน้า Organizer กับ API สร้าง/จัดการกิจกรรม
6. สร้างหน้า Admin (dashboard, user management, activity approval)
7. เพิ่ม Auth guard/middleware ใน Next.js (redirect ถ้ายังไม่ login)
```

---

### Prompt: สร้างหน้า Admin Dashboard

```
สร้างหน้า Admin Dashboard สำหรับ Next.js frontend ที่เชื่อมกับ NestJS backend

## หน้าที่ต้องสร้าง
1. `/admin` — Dashboard หลัก (สถิติ, กราฟ)
2. `/admin/users` — จัดการผู้ใช้ (CRUD, เปลี่ยน role)
3. `/admin/activities` — จัดการกิจกรรม (อนุมัติ/ปฏิเสธ)
4. `/admin/audit-logs` — Audit logs

## API ที่ใช้
- GET /api/admin/dashboard/stats → { totalUsers, totalActivities, totalRegistrations, pendingActivities, usersByRole }
- GET /api/users → รายชื่อผู้ใช้ทั้งหมด
- PATCH /api/users/:id/role → เปลี่ยน role
- DELETE /api/users/:id → ลบผู้ใช้
- GET /api/activities/pending → กิจกรรมรออนุมัติ
- PATCH /api/activities/:id/approve → อนุมัติ
- PATCH /api/activities/:id/reject → ปฏิเสธ { reason }

## Design
- ใช้ sidebar navigation คล้ายกับหน้า student/organizer
- สี gradient: from-gray-800 to-gray-900 (สำหรับ sidebar)
- ใช้ TailwindCSS, Lucide icons
- ใส่ card สถิติ, ตารางผู้ใช้, ตารางกิจกรรมรออนุมัติ
```
