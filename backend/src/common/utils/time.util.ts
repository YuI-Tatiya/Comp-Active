/** ปัดทศนิยม 2 ตำแหน่งก่อนสร้าง Decimal กัน float artifact เช่น 2.9999999 */
export function diffHours(startAt: Date, endAt: Date): number {
  const ms = endAt.getTime() - startAt.getTime();
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
}

/**
 * เขตเวลาของระบบ — ผู้ใช้ทั้งหมดอยู่ไทย และทุกค่าที่ผู้ใช้กรอก/เห็น (วันที่ เวลา) หมายถึงเวลาไทย
 * ห้ามใช้ getHours()/getDate()/toLocale*() ที่ไม่ระบุ timeZone ฝั่งเซิร์ฟเวอร์: ค่าที่ได้ขึ้นกับเขตเวลาของ
 * process — เครื่อง dev เป็นเวลาไทย แต่ container (Docker) เป็น UTC ผลจึงเพี้ยน 7 ชม. เฉพาะตอน deploy
 */
export const APP_TIME_ZONE = "Asia/Bangkok";

/** UTC+7 ตายตัว — ไทยไม่มี daylight saving ใช้ประกอบสตริงวัน-เวลาท้องถิ่นให้เป็นเวลาที่แน่นอน */
export const APP_UTC_OFFSET = "+07:00";

const PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** ส่วนประกอบวัน-เวลาตามเวลาไทย (ไม่ขึ้นกับเขตเวลาของ process) */
export function bangkokParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: string;
  minute: string;
} {
  const p = Object.fromEntries(
    PARTS.formatToParts(date).map((x) => [x.type, x.value]),
  );
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: p.hour,
    minute: p.minute,
  };
}

/** แปลง Date เป็น "HH:mm" ตามเวลาไทย — ใช้ derive startTime/endTime แบบเดิมจาก startAt/endAt ใหม่ */
export function formatHHmm(date: Date): string {
  const { hour, minute } = bangkokParts(date);
  return `${hour}:${minute}`;
}

/**
 * วันตามปฏิทินไทยของเวลาหนึ่ง ในรูป Date ที่เที่ยงคืน UTC ของวันนั้น — สำหรับเขียนลงคอลัมน์ @db.Date
 * Prisma เก็บ @db.Date จากวันที่ฝั่ง UTC ของ Date ที่ส่งไป ถ้าส่ง startAt ตรงๆ กิจกรรมที่เริ่มก่อน 07:00
 * ตามเวลาไทย (ยังเป็นเมื่อวานใน UTC) จะถูกบันทึกเป็นวันก่อนหน้า
 */
export function bangkokDateOnly(date: Date): Date {
  const { year, month, day } = bangkokParts(date);
  return new Date(Date.UTC(year, month - 1, day));
}
