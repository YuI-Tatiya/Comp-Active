/**
 * Escape ค่าที่มาจากผู้ใช้ก่อนยัดลง HTML ของอีเมล (A05: Injection)
 * ชื่อกิจกรรม/ชื่อคน/เหตุผล ล้วนเป็นข้อความที่ผู้ใช้พิมพ์เองได้ ถ้าไม่ escape
 * ผู้โจมตีใส่ <a href="..."> หรือ <img src=x onerror=...> เข้าไปในอีเมลที่
 * ระบบส่งออกในนามของเราได้ทันที (phishing ที่ดูน่าเชื่อถือเพราะมาจากโดเมนจริง)
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * ตัด CR/LF ออกจากค่าที่จะไปอยู่ใน header ของอีเมล (Subject, To)
 * กัน header injection — ใส่ "\r\nBcc: victim@..." ต่อท้ายชื่อกิจกรรมแล้วส่งอีเมล
 * ไปหาใครก็ได้ผ่านระบบเรา (ตรงกับกลุ่มช่องโหว่ CRLF ของ nodemailer เอง)
 */
export function sanitizeHeaderValue(value: unknown): string {
  return String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim();
}
