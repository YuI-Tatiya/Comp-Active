# ── Stage 1: Build ──────────────────────────────────────────────────────────
# ขั้นนี้ติดตั้ง devDependencies ครบ (รวม prisma CLI) เพราะต้องใช้ prisma generate
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma.config.ts ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Migrator ───────────────────────────────────────────────────────
# อิมเมจแยกสำหรับ "ปรับ schema ฐานข้อมูล" โดยเฉพาะ รันครั้งเดียวแล้วจบ
# ไม่ใช่ long-running service — docker-compose รอให้ขั้นนี้สำเร็จก่อนค่อยสตาร์ท backend
#
# แยกออกมาเพราะ prisma CLI ลาก driver ของทุกฐานข้อมูลมาด้วย (mysql2, postgres,
# better-sqlite3) ทั้งที่โปรเจกต์นี้ใช้แค่ PostgreSQL — ไม่มีเหตุผลให้ไฟล์พวกนั้น
# ไปนอนอยู่ในอิมเมจที่เปิดรับทราฟฟิกจากอินเทอร์เน็ตจริง
FROM builder AS migrator
WORKDIR /app
COPY migrate.sh ./
RUN chmod +x migrate.sh
ENTRYPOINT ["./migrate.sh"]

# ── Stage 3: Production ─────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./

# --legacy-peer-deps จำเป็นจริง ๆ ไม่ใช่ใส่ตามใจ:
# @prisma/client ประกาศ prisma (CLI) เป็น optional peerDependency ("prisma": "*")
# npm รุ่นใหม่จึงติดตั้ง peer ให้อัตโนมัติ ทำให้ prisma CLI + mysql2 หลุดเข้ามาใน
# อิมเมจ production แม้จะสั่ง --omit=dev แล้วก็ตาม
# flag นี้ปิดการติดตั้ง peer อัตโนมัติ → 306 packages เหลือ 172
RUN npm ci --omit=dev --legacy-peer-deps

# runtime ใช้ client ที่คอมไพล์แล้วใน dist/generated เท่านั้น (ตรวจสอบแล้วว่าบูตได้
# โดยไม่ต้องมี /app/generated หรือ /app/prisma) จึงไม่ก๊อป schema กับ prisma.config.ts
# เข้ามา — ขั้น migrator เป็นคนถือของพวกนั้นแทน
COPY --from=builder /app/dist ./dist
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["./entrypoint.sh"]
