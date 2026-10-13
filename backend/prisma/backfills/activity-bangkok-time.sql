-- ทำให้ฟิลด์รุ่นเก่า date / start_time / end_time ของกิจกรรมจาก wizard ตรงกับเวลาจริง (start_at / end_at) ตามเวลาไทย
--
-- ที่มา: เดิม backend derive ค่าพวกนี้ด้วยเขตเวลาของ process — container (Docker) เป็น UTC จึงบันทึก 09:30 เป็น "02:30"
-- และ date เก็บวันที่ฝั่ง UTC (กิจกรรมที่เริ่มก่อน 07:00 ได้วันก่อนหน้า) โค้ดแก้แล้ว (common/utils/time.util.ts)
-- ไฟล์นี้ซ่อมแถวที่บันทึกไว้แล้ว
--
-- ปลอดภัยต่อการรันซ้ำ: คำนวณใหม่จาก start_at / end_at (ค่าจริง) ทุกครั้ง และแตะเฉพาะแถวที่ยังไม่ตรง — แถวที่สร้างตอน
-- backend รันบนเครื่องที่ตั้งเวลาไทยอยู่แล้วจะถูกต้องอยู่แล้วและไม่ถูกแตะ กิจกรรมรุ่นเก่า (start_at เป็น null) ไม่เกี่ยว
-- เพราะ date/start_time/end_time ของแถวนั้นคือค่าที่ผู้จัดกรอกเองเป็นเวลาไทยอยู่แล้ว
--
-- start_at / end_at เป็น timestamp ไม่มีเขตเวลาที่เก็บค่า UTC (แบบที่ Prisma เขียน) จึงต้องตีความเป็น UTC ก่อน
-- (AT TIME ZONE 'UTC') แล้วค่อยแปลงเป็นเวลาไทย (AT TIME ZONE 'Asia/Bangkok')
UPDATE activities AS a
SET
  date = b.bkk_date,
  start_time = b.bkk_start,
  end_time = b.bkk_end
FROM (
  SELECT
    id,
    ((start_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok')::date AS bkk_date,
    to_char((start_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok', 'HH24:MI') AS bkk_start,
    to_char((end_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok', 'HH24:MI') AS bkk_end
  FROM activities
  WHERE start_at IS NOT NULL AND end_at IS NOT NULL
) AS b
WHERE a.id = b.id
  AND (a.date IS DISTINCT FROM b.bkk_date
    OR a.start_time IS DISTINCT FROM b.bkk_start
    OR a.end_time IS DISTINCT FROM b.bkk_end);
