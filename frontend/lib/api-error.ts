/**
 * แปล error ของ API เป็นข้อความที่ผู้ใช้เข้าใจ และบอกว่าควรตรวจ session ใหม่หรือไม่
 * ไม่ import อะไร — ทดสอบด้วย node --test ได้
 *
 * ทำไมต้องตรวจ session ใหม่: cookie ล็อกอินใช้ร่วมกันทั้งเบราว์เซอร์ ถ้าแท็บหนึ่งล็อกอินบัญชีอื่น
 * (หรือ session หมดอายุ) แท็บที่เปิดค้างไว้ยังเชื่อว่าเป็นบัญชีเดิม แล้วไปเจอ 401/403 ตอนกดปุ่ม
 */

export const MESSAGES = {
    SESSION_EXPIRED: "เซสชันหมดอายุหรือยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่",
    WRONG_ACCOUNT:
        "บัญชีที่เข้าสู่ระบบอยู่ไม่มีสิทธิ์ทำรายการนี้ (อาจมีการเข้าสู่ระบบด้วยบัญชีอื่นในแท็บอื่น) กรุณาตรวจสอบบัญชีแล้วลองใหม่",
    GENERIC: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
} as const

/** ข้อความมาตรฐานของ NestJS เมื่อ guard ปฏิเสธ — ถ้าเป็นข้อความอื่น แปลว่า backend เขียนข้อความเฉพาะไว้เอง */
const NEST_UNAUTHORIZED = "Unauthorized"
const NEST_FORBIDDEN = "Forbidden resource"

/** error ที่มากับรหัสสถานะ HTTP — ให้หน้าเว็บแยก "เซสชันหมด" ออกจาก "ไม่มีข้อมูล" ได้ */
export class ApiError extends Error {
    readonly status: number

    constructor(message: string, status: number) {
        super(message)
        this.name = "ApiError"
        this.status = status
    }
}

/** ชื่อ event ที่ fetchAPI ส่งเมื่อควรตรวจ session ใหม่ — AuthProvider เป็นผู้ฟัง */
export const SESSION_CHECK_EVENT = "compactive:session-check"

export function classifyApiError(status: number, rawMessage: string): { message: string; sessionCheck: boolean } {
    const raw = rawMessage.trim()

    if (status === 401 && (raw === "" || raw === NEST_UNAUTHORIZED)) {
        return { message: MESSAGES.SESSION_EXPIRED, sessionCheck: true }
    }
    if (status === 403 && raw === NEST_FORBIDDEN) {
        return { message: MESSAGES.WRONG_ACCOUNT, sessionCheck: true }
    }
    // ข้อความที่ backend เขียนเอง (เช่น "อีเมลหรือรหัสผ่านไม่ถูกต้อง", ตรวจความเป็นเจ้าของ) มีความหมายเฉพาะ — คงไว้
    return { message: raw || MESSAGES.GENERIC, sessionCheck: false }
}
