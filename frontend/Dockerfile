# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ── Stage 2: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# มิเรอร์ของ ADMIN_HOSTS (ดู lib/admin-host.ts) สำหรับ MascotWidget ฝั่ง client เช็คว่าอยู่โซนแอดมินไหม
# ต้องเป็น build arg เหมือน NEXT_PUBLIC_API_URL ด้านบน ไม่ใช่แค่ environment ตอน runtime เพราะ
# NEXT_PUBLIC_* ถูก inline เข้า client bundle ตอน build เท่านั้น — ตั้งทับได้แต่ default ตรงกับ
# ADMIN_HOSTS ของ backend/docker-compose.yml อยู่แล้ว
ARG NEXT_PUBLIC_ADMIN_HOSTS=admin.localhost,admin.compactive.com
ENV NEXT_PUBLIC_ADMIN_HOSTS=${NEXT_PUBLIC_ADMIN_HOSTS}

RUN npm run build

# ── Stage 3: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
