# CP Check: ระบบจัดการกิจกรรมและติดตาม Soft Skills

CP Check คือแพลตฟอร์มระดับองค์กรที่ออกแบบมาเพื่อบริหารจัดการกิจกรรมนอกหลักสูตร และวิเคราะห์การพัฒนา Soft Skills ของนักศึกษาอย่างเป็นระบบ ระบบรองรับการทำงานร่วมกันระหว่างนักศึกษา ผู้จัดกิจกรรม และผู้ดูแลระบบผ่าน UI ที่ทันสมัยและ Backend ที่มีประสิทธิภาพสูง

---

## สถาปัตยกรรมระบบ

โปรเจกต์นี้ใช้สถาปัตยกรรมแบบ Decoupled Architecture เพื่อให้ง่ายต่อการดูแลรักษาและรองรับการขยายระบบในอนาคต

### Backend (Core API)
- **Framework:** NestJS (Node.js)
- **ภาษา:** TypeScript
- **ฐานข้อมูล:** PostgreSQL ร่วมกับ TypeORM
- **ความปลอดภัย:** Passport.js (JWT และ Google OAuth 2.0), เข้ารหัสด้วย Bcrypt
- **เอกสาร API:** รองรับ Swagger / OpenAPI แบบ Built-in

### Frontend (User Interface)
- **Framework:** Next.js 16 (App Router)
- **Library:** React 19
- **Styling:** Tailwind CSS 4 พร้อม Lucide Icons
- **UI Components:** Radix UI ที่ปรับแต่งสำหรับความสวยงามระดับ Premium
- **กราฟ:** Recharts สำหรับการแสดงผลข้อมูล

---

## โมดูลหลักของระบบ

### 1. ระบบยืนยันตัวตน (Authentication)
รองรับทั้งการเข้าสู่ระบบด้วยอีเมล/รหัสผ่าน และ Google OAuth 2.0 บทบาทผู้ใช้งานถูกควบคุมอย่างเข้มงวดผ่าน JWT Guards

### 2. การจัดการวงจรชีวิตกิจกรรม
- **ผู้จัดกิจกรรม:** สร้าง แก้ไข และบริหารกิจกรรม พร้อมกำหนดจำนวนที่รับ เงื่อนไข และ Tag สิทธิประโยชน์
- **ขั้นตอนการอนุมัติ:** กิจกรรมใหม่ต้องผ่านการอนุมัติจาก Admin ก่อนเผยแพร่ (รอดำเนินการ → อนุมัติ / ปฏิเสธ)
- **การยกเลิก:** รองรับคำขอยกเลิกกิจกรรมพร้อมการตรวจสอบจาก Admin

### 3. การลงทะเบียนและเข้าร่วมกิจกรรมของนักศึกษา
- **ค้นหา:** ระบบค้นหาและกรองกิจกรรมตามหมวดหมู่
- **ลงทะเบียน:** ติดตามจำนวนที่นั่งแบบ Real-time และจัดการสถานะการลงทะเบียนอัตโนมัติ
- **เกียรติบัตร:** ออกเกียรติบัตรอัตโนมัติเมื่อนักศึกษาเข้าร่วมกิจกรรมครบถ้วน

### 4. ระบบประเมิน Soft Skills
ฟีเจอร์หลักของแพลตฟอร์ม ผู้จัดกิจกรรมประเมินทักษะนักศึกษาหลังจบกิจกรรมใน 5 ด้าน ได้แก่ การทำงานเป็นทีม ภาวะผู้นำ การสื่อสาร การแก้ปัญหา และการปรับตัว
- **คะแนนสะสม:** นักศึกษาได้รับ XP และ Level จากการเข้าร่วมและผลการประเมิน
- **Skill Matrix:** แสดงผลพัฒนาการของทักษะด้วยกราฟ Radar แบบ Real-time

---

## เอกสาร API (เวอร์ชัน 1)

Backend เปิดให้บริการ RESTful API แบ่งตาม Controller หลักดังนี้

| โมดูล | Endpoint Prefix | คำอธิบาย |
|:---|:---|:---|
| **Auth** | `/api/auth` | เข้าสู่ระบบ สมัครสมาชิก Google OAuth จัดการโปรไฟล์ |
| **Activities** | `/api/activities` | CRUD กิจกรรม สถิติ และค้นหา |
| **Registrations** | `/api/registrations` | ลงทะเบียนกิจกรรม ติดตามสถานะ |
| **Evaluations** | `/api/evaluations` | ให้คะแนน Soft Skills วิเคราะห์พัฒนาการ |
| **Admin** | `/api/admin` | บริหารระบบโดยรวม ตรวจสอบข้อมูล |
| **Certificates** | `/api/certificates` | ออกและดึงข้อมูลเกียรติบัตร |

> [!NOTE]
> สำหรับเอกสาร API แบบ Interactive ให้รัน Backend ในโหมด Development แล้วเปิด `http://localhost:3001/api`

---

## เริ่มต้นใช้งาน

### ความต้องการของระบบ
- Node.js เวอร์ชัน 18.x ขึ้นไป
- PostgreSQL เวอร์ชัน 14.x ขึ้นไป
- npm หรือ yarn

### 1. ตั้งค่าสภาพแวดล้อม
สร้างไฟล์ `.env` ในโฟลเดอร์ `backend` ตามตัวอย่างด้านล่าง

```env
PORT=3001
DATABASE_URL=postgres://user:password@localhost:5432/cpcheck
JWT_SECRET=your_secure_random_string
GOOGLE_CLIENT_ID=your_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_secret
```

### 2. ติดตั้ง Dependencies
```bash
# ติดตั้ง Backend
cd backend
npm install

# ติดตั้ง Frontend
cd ../frontend
npm install
```

### 3. รันระบบ
```bash
# Terminal 1: Backend
cd backend
npm run start:dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

ระบบจะพร้อมใช้งานที่
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001`

---

## โครงสร้างโปรเจกต์

```text
.
├── backend/                  # NestJS Application
│   ├── src/
│   │   ├── activities/       # ตรรกะกิจกรรมและสถิติ
│   │   ├── evaluations/      # ระบบประเมิน Soft Skills
│   │   ├── auth/             # ระบบความปลอดภัยและ JWT
│   │   ├── registrations/    # การลงทะเบียนกิจกรรม
│   │   ├── admin/            # เครื่องมือดูแลระบบ
│   │   └── certificates/     # ระบบเกียรติบัตร
│   └── test/                 # E2E และ Unit Tests
├── frontend/                 # Next.js Application
│   ├── app/                  # หน้าเพจและ Layouts (App Router)
│   ├── components/           # UI Components ที่ใช้ซ้ำได้
│   └── lib/                  # API Client และ Auth Context
└── database_schema.sql       # Script สร้างฐานข้อมูล
```

---

## ตรรกะการคำนวณ Soft Skills

คะแนน Soft Skills คำนวณจากค่าเฉลี่ยถ่วงน้ำหนักจากกิจกรรมที่เข้าร่วม

- **คะแนนพื้นฐาน:** ค่าเฉลี่ยของคะแนนที่ผู้ประเมินให้ (1–10 คะแนน)
- **คะแนนประสบการณ์ (XP):** คำนวณจาก `(คะแนนรวม × ตัวคูณ) + คะแนนพื้นฐานจากการเข้าร่วม`
- **การเลื่อนระดับ:** ใช้อัลกอริทึมแบบ Non-linear เพื่อให้การเลื่อน Level ยากขึ้นตามลำดับ

---

© 2026 CP Check Project. สงวนลิขสิทธิ์
