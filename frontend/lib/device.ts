// ตรวจชนิดอุปกรณ์ฝั่ง browser — แยกเป็นฟังก์ชันล้วนเพื่อทดสอบด้วย node --test ได้

export interface DeviceSignals {
    userAgent: string
    /** navigator.maxTouchPoints — ใช้แยก iPad ที่ปลอมตัวเป็น Mac */
    maxTouchPoints: number
}

export const SCAN_MOBILE_ONLY_MESSAGE =
    "การสแกน QR เพื่อเช็คอินใช้ได้เฉพาะบนโทรศัพท์มือถือหรือ iPad เท่านั้น กรุณาเปิดหน้านี้ด้วยอุปกรณ์ดังกล่าว"

/**
 * true = โทรศัพท์มือถือหรือแท็บเล็ต (iPhone, iPad, Android) — false = notebook / MacBook / คอมพิวเตอร์ตั้งโต๊ะ
 *
 * iPadOS 13+ ส่ง User-Agent เป็น "Macintosh" เหมือน MacBook (โหมดเว็บเดสก์ท็อป) จึงแยกด้วยจอสัมผัส:
 * Mac จริงไม่มีจอสัมผัส (maxTouchPoints = 0) ส่วน iPad มี 5
 *
 * หมายเหตุ: นี่คือการกันที่หน้าเว็บ ใช้ User-Agent ซึ่งผู้ใช้ตั้งปลอมได้ (เช่น โหมดจำลองมือถือใน DevTools)
 * ตั้งใจให้เป็นข้อจำกัดด้านการใช้งาน ไม่ใช่การรักษาความปลอดภัย
 */
export function isScanCapableDevice({ userAgent, maxTouchPoints }: DeviceSignals): boolean {
    if (/iPhone|iPod|iPad|Android/i.test(userAgent)) return true
    if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return true
    return false
}

export const IN_APP_BROWSER_MESSAGE =
    "ลิงก์นี้เปิดอยู่ในเบราว์เซอร์ของแอป ซึ่งไม่มีการเข้าสู่ระบบของคุณติดมาด้วย (คนละที่เก็บข้อมูลกับเบราว์เซอร์หลักของเครื่อง) กรุณากดเมนู ··· หรือไอคอนแชร์ที่แถบด้านล่าง/บนแล้วเลือก \"เปิดในเบราว์เซอร์\" ก่อนสแกน QR อีกครั้ง"

/**
 * true = กำลังเปิดอยู่ในเบราว์เซอร์ฝังในแอป (LINE, Facebook, Instagram, Messenger, WeChat) — เบราว์เซอร์พวกนี้
 * แยกที่เก็บคุกกี้ออกจาก Safari/Chrome ปกติของเครื่องเป็นคนละก้อนกัน ต่อให้ล็อกอินไว้แล้วในเบราว์เซอร์หลัก
 * เปิดลิงก์จากแอปพวกนี้ก็ไม่มี session ติดมาด้วย — เช็คอินด้วยตัวเอง (ต้องรู้ว่าใครเช็คอิน) จึงทำไม่ได้จนกว่า
 * จะกดเปิดในเบราว์เซอร์จริงก่อน (เจอจริง: สแกน QR เช็คอินผ่าน LINE แล้วไม่มีอะไรเกิดขึ้น เพราะเงียบๆ ได้ 401)
 */
export function isInAppBrowser(userAgent: string): boolean {
    return /\bLine\/|FBAN|FBAV|Instagram|MicroMessenger/i.test(userAgent)
}
