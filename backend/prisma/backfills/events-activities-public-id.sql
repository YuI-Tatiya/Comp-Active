-- เติม public_id ให้แถว events/activities เก่าที่สร้างก่อนฟีเจอร์นี้ (ยังเป็น NULL อยู่)
-- Prisma @default(uuid()) generate ค่าฝั่ง client เท่านั้น ไม่ backfill แถวเก่าให้ตอน db push —
-- แถวใหม่หลังจากนี้ได้ค่าอัตโนมัติจาก Prisma Client เอง ไม่ต้องรันสคริปต์นี้ซ้ำสำหรับแถวเหล่านั้น
-- gen_random_uuid() เป็นฟังก์ชันในตัวของ Postgres (core ตั้งแต่ v13) ไม่ต้องติดตั้ง extension เพิ่ม
--
-- Idempotent: WHERE public_id IS NULL กันไม่ให้ทับค่าที่มีอยู่แล้ว ปลอดภัยที่จะรันซ้ำทุกครั้งที่ container สตาร์ท
UPDATE events SET public_id = gen_random_uuid() WHERE public_id IS NULL;
UPDATE activities SET public_id = gen_random_uuid() WHERE public_id IS NULL;
