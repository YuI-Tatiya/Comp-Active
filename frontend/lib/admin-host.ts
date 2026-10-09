/**
 * ใช้ร่วมกันระหว่าง proxy.ts (ตัดสินใจ rewrite ไปโซนแอดมิน, ฝั่ง server) และ MascotWidget
 * (ไม่โชว์ตัวในโซนแอดมิน, ฝั่ง client) ให้ค่าเริ่มต้น/รูปแบบการแยก host "ตรงกัน" ไม่ใช่สองที่ที่เผลอไม่ตรงกันได้
 *
 * เหตุผลที่ต้องมีสองตัวแปร (ไม่ใช่ตัวเดียว): Next.js inline เฉพาะ process.env.NEXT_PUBLIC_* เข้า
 * client bundle ตอน build เท่านั้น — process.env.ADMIN_HOSTS ตัวเดิมจะเป็น undefined เสมอถ้าโค้ด
 * ฝั่ง client พยายามอ่าน จึงต้องมี PUBLIC_ADMIN_HOSTS มิเรอร์ไว้อีกตัวสำหรับ MascotWidget โดยเฉพาะ
 * (ค่าเริ่มต้นเหมือนกันอยู่แล้วตราบใดที่ deploy ไม่ได้ตั้งทับแค่ตัวใดตัวหนึ่ง — ถ้าจะเปลี่ยนโดเมนแอดมิน
 * ต้องตั้ง ADMIN_HOSTS กับ NEXT_PUBLIC_ADMIN_HOSTS ให้ตรงกันทั้งคู่)
 *
 * ตั้งทับได้ด้วย ADMIN_HOSTS/NEXT_PUBLIC_ADMIN_HOSTS (คั่นด้วยจุลภาค) — เทียบแบบตรงตัว ไม่ใช่
 * startsWith('admin.') เพราะโดเมนอย่าง admin.evil.com ก็ผ่าน startsWith ได้เหมือนกัน
 */
const DEFAULT_ADMIN_HOSTS = 'admin.localhost,admin.compactive.com';

function parseHosts(value: string | undefined): string[] {
  return (value ?? DEFAULT_ADMIN_HOSTS)
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

/** ใช้ฝั่ง server เท่านั้น (proxy.ts) */
export const ADMIN_HOSTS = parseHosts(process.env.ADMIN_HOSTS);

/** มิเรอร์สำหรับโค้ดฝั่ง client อ่าน — ดูหมายเหตุด้านบนว่าทำไมแยกจาก ADMIN_HOSTS */
export const PUBLIC_ADMIN_HOSTS = parseHosts(process.env.NEXT_PUBLIC_ADMIN_HOSTS);

/** ตัด port ออกและเอาค่าแรกถ้ามีหลายค่าคั่นจุลภาค (บาง header ส่งมาแบบนั้น) แล้ว lowercase */
export function hostnameOf(value: string | null | undefined): string {
  return (value ?? '').split(',')[0].trim().toLowerCase().split(':')[0];
}

export function isAdminHostname(hostname: string, hosts: string[]): boolean {
  return hosts.includes(hostname);
}
