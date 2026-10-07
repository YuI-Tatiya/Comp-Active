import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { classifyApiError, MESSAGES } from "./api-error.ts"

describe("classifyApiError (แปล error ของ API ให้ผู้ใช้เข้าใจ + บอกว่าต้องตรวจ session ใหม่ไหม)", () => {
    test("401 ข้อความมาตรฐานของ Nest → ข้อความไทยเรื่องเซสชัน และต้องตรวจ session ใหม่", () => {
        assert.deepEqual(classifyApiError(401, "Unauthorized"), { message: MESSAGES.SESSION_EXPIRED, sessionCheck: true })
    })

    test("403 จาก RolesGuard (Forbidden resource) → ข้อความไทยเรื่องสิทธิ์ของบัญชี และต้องตรวจ session ใหม่ (อาจสลับบัญชีในแท็บอื่น)", () => {
        assert.deepEqual(classifyApiError(403, "Forbidden resource"), { message: MESSAGES.WRONG_ACCOUNT, sessionCheck: true })
    })

    test("401 ที่ backend เขียนข้อความเอง (เช่น รหัสผ่านผิดตอนล็อกอิน) → คงข้อความเดิม และไม่ตรวจ session (กันวนเด้งหน้า login)", () => {
        assert.deepEqual(classifyApiError(401, "อีเมลหรือรหัสผ่านไม่ถูกต้อง"), {
            message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
            sessionCheck: false,
        })
    })

    test("403 ที่ backend เขียนข้อความเอง (เช่น ตรวจความเป็นเจ้าของ) → คงข้อความเดิม ไม่ตรวจ session", () => {
        assert.deepEqual(classifyApiError(403, "คุณไม่มีสิทธิ์ยกเลิกกิจกรรมนี้"), {
            message: "คุณไม่มีสิทธิ์ยกเลิกกิจกรรมนี้",
            sessionCheck: false,
        })
    })

    test("สถานะอื่นคงข้อความของ backend และไม่ตรวจ session", () => {
        assert.deepEqual(classifyApiError(400, "ลงทะเบียนกิจกรรมนี้ไปแล้ว"), { message: "ลงทะเบียนกิจกรรมนี้ไปแล้ว", sessionCheck: false })
        assert.deepEqual(classifyApiError(500, "Internal server error"), { message: "Internal server error", sessionCheck: false })
    })

    test("ไม่มีข้อความจาก backend → ข้อความกลางภาษาไทย", () => {
        assert.deepEqual(classifyApiError(500, ""), { message: MESSAGES.GENERIC, sessionCheck: false })
        assert.deepEqual(classifyApiError(401, ""), { message: MESSAGES.SESSION_EXPIRED, sessionCheck: true })
    })
})
