import { registerAs } from "@nestjs/config";

/**
 * Cloudflare R2 (S3-compatible) สำหรับไฟล์ที่ผู้ใช้อัปโหลด (รูปกิจกรรม, เอกสารแนบ)
 *
 * ตั้งใจให้ "ไม่ตั้งค่า = ปิดใช้งาน" ไม่ใช่ fail closed แบบ JWT_SECRET — เพราะนี่คือ
 * ทางเลือกของ storage backend ไม่ใช่ความลับที่พลาดแล้วเปิดช่องโหว่ความปลอดภัย
 * dev ที่รัน `npm run start:dev` เปล่า ๆ ไม่ตั้งค่า R2 เลยก็ยังอัปโหลดไฟล์ได้ตามปกติ
 * (StorageService ตกกลับไปเขียนลงดิสก์ที่ backend/public/uploads เหมือนเดิม)
 * ต่อเมื่อ deploy จริงที่ไม่มีดิสก์ถาวร (เช่น Railway) ถึงต้องตั้งค่าชุดนี้ให้ครบ
 */
export default registerAs("storage", () => {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  const publicUrl = process.env.R2_PUBLIC_URL?.trim().replace(/\/+$/, "");

  const configured = Boolean(
    accountId && accessKeyId && secretAccessKey && bucket && publicUrl,
  );

  return {
    configured,
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicUrl,
    // R2 คุยโปรโตคอล S3 ผ่าน endpoint ของบัญชีตัวเอง ไม่ใช่ของ AWS
    endpoint: accountId
      ? `https://${accountId}.r2.cloudflarestorage.com`
      : undefined,
  };
});
