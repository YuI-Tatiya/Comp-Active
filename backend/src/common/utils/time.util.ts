/** ปัดทศนิยม 2 ตำแหน่งก่อนสร้าง Decimal กัน float artifact เช่น 2.9999999 */
export function diffHours(startAt: Date, endAt: Date): number {
  const ms = endAt.getTime() - startAt.getTime();
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
}

/** แปลง Date เป็น "HH:mm" (เวลาท้องถิ่นของ process) — ใช้ derive startTime/endTime แบบเดิมจาก startAt/endAt ใหม่ */
export function formatHHmm(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
