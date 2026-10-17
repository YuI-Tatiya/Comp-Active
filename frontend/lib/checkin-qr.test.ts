import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { parseCheckinUrl } from "./checkin-qr.ts"

describe("parseCheckinUrl", () => {
    test("แกะ publicId และ querystring (รวม token) ออกจากลิงก์เต็ม", () => {
        assert.deepEqual(
            parseCheckinUrl("https://app.comp-active.com/student/checkin/abc-123?token=xyz789"),
            { id: "abc-123", search: "?token=xyz789" }
        )
    })

    test("ไม่มี querystring เลย — search เป็นสตริงว่าง", () => {
        assert.deepEqual(parseCheckinUrl("https://app.comp-active.com/student/checkin/abc-123"), {
            id: "abc-123",
            search: "",
        })
    })

    test("ข้อความไม่ตรงรูปแบบ URL เช็คอินเลย — คืน null", () => {
        assert.equal(parseCheckinUrl("https://example.com/not-a-checkin-link"), null)
        assert.equal(parseCheckinUrl("ข้อความธรรมดาที่ไม่ใช่ URL"), null)
    })

    test("ขึ้นบรรทัดใหม่/มีช่องว่างต่อท้าย querystring ไม่หลุดเข้ามาปน", () => {
        assert.deepEqual(parseCheckinUrl("https://app.comp-active.com/student/checkin/abc-123?token=xyz\nบรรทัดถัดไป"), {
            id: "abc-123",
            search: "?token=xyz",
        })
    })
})
