#!/bin/sh
set -e

# ปรับ schema ฐานข้อมูลให้ตรงกับ prisma/schema.prisma แล้วจบการทำงาน
# รันในอิมเมจ migrator ที่มี prisma CLI — ไม่ได้อยู่ในอิมเมจ production

# `db push` จะปฏิเสธการเปลี่ยนแปลงที่ทำให้ข้อมูลหาย (ลบคอลัมน์/ตาราง) เว้นแต่จะสั่ง
# --accept-data-loss ของเดิมใส่ flag นี้ไว้ตายตัว แปลว่าถ้าใครแก้ schema ผิด
# ข้อมูลจริงหายเงียบ ๆ ตอน container สตาร์ท โดยไม่มีใครกดยืนยันสักครั้ง
#
# ตอนนี้ต้องตั้งใจเปิดเองด้วย PRISMA_ACCEPT_DATA_LOSS=true เท่านั้น
# ถ้าไม่เปิดแล้วมีการเปลี่ยนแปลงแบบทำลายข้อมูล ขั้นนี้จะล้ม backend จะไม่สตาร์ท
# และคุณจะเห็น error ชัดเจนแทนที่จะรู้ตัวตอนข้อมูลหายไปแล้ว
if [ "$PRISMA_ACCEPT_DATA_LOSS" = "true" ]; then
  echo "[migrate] PRISMA_ACCEPT_DATA_LOSS=true — ยอมให้เปลี่ยน schema แบบที่ข้อมูลอาจหาย"
  npx prisma db push --accept-data-loss
else
  echo "[migrate] โหมดปลอดภัย: จะไม่ยอมให้เปลี่ยน schema แบบที่ทำให้ข้อมูลหาย"
  echo "[migrate] ถ้าจำเป็นต้องทำจริง ให้ตั้ง PRISMA_ACCEPT_DATA_LOSS=true"
  npx prisma db push
fi

echo "[migrate] เรียบร้อย"
