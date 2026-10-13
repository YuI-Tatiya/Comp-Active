#!/bin/sh
set -e

# ปรับ schema ย้ายไปอยู่ที่ service `migrate` แยกต่างหากแล้ว (ดู docker-compose.yml)
# อิมเมจนี้จึงไม่มี prisma CLI ติดมาด้วย — ตัด mysql2 และ driver ฐานข้อมูลอื่น
# ที่ไม่ได้ใช้ออกจาก production ไปในตัว
echo "Starting backend..."
exec node dist/src/main
