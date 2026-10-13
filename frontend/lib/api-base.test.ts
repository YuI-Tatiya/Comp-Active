import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveApiBaseUrl, uploadPathFromPreview, buildUploadUrl } from "./api-base.ts"

test("same-origin → path สัมพัทธ์ (สตริงว่าง)", () => {
    assert.equal(resolveApiBaseUrl("same-origin"), "")
    assert.equal(resolveApiBaseUrl("  same-origin "), "")
})

test("ไม่ได้ตั้งค่า → backend ตรงที่ localhost:3001", () => {
    assert.equal(resolveApiBaseUrl(undefined), "http://localhost:3001")
    assert.equal(resolveApiBaseUrl(""), "http://localhost:3001")
})

test("URL เต็มใช้ตามนั้น และตัด / ท้าย", () => {
    assert.equal(resolveApiBaseUrl("http://api.localhost"), "http://api.localhost")
    assert.equal(resolveApiBaseUrl("https://api.compactive.com/"), "https://api.compactive.com")
})

test("preview ที่เป็น path อัปโหลดอยู่แล้ว คืนตามเดิม", () => {
    assert.equal(uploadPathFromPreview("/uploads/activities/a.png"), "/uploads/activities/a.png")
})

test("preview เป็น URL เต็ม (ฉบับร่างเก่าที่เก็บ http://api.localhost/...) ตัดเหลือ path", () => {
    assert.equal(uploadPathFromPreview("http://api.localhost/uploads/activities/a.png"), "/uploads/activities/a.png")
    assert.equal(uploadPathFromPreview("http://app.localhost/uploads/activities/a.png"), "/uploads/activities/a.png")
})

test("preview เป็น URL เต็มของ R2/CDN (ไม่ใช่ /uploads/) → คืนทั้ง URL ตามที่เก็บจริง ไม่ตัดเหลือแค่ pathname", () => {
    assert.equal(
        uploadPathFromPreview("https://cdn.example.com/activities/a.png"),
        "https://cdn.example.com/activities/a.png",
    )
    assert.equal(
        uploadPathFromPreview("http://api.localhost/other/a.png"),
        "http://api.localhost/other/a.png",
    )
})

test("ไฟล์ที่ยังไม่ได้อัปโหลด / ไม่ใช่ไฟล์อัปโหลด → undefined", () => {
    assert.equal(uploadPathFromPreview("blob:http://app.localhost/1234-5678"), undefined)
    assert.equal(uploadPathFromPreview("data:image/png;base64,AAAA"), undefined)
    assert.equal(uploadPathFromPreview("/activity-placeholder.svg"), undefined)
    assert.equal(uploadPathFromPreview(null), undefined)
    assert.equal(uploadPathFromPreview(""), undefined)
})

test("buildUploadUrl: URL เต็มอยู่แล้ว (R2/CDN) ใช้ตามนั้น ไม่ต่อ apiBaseUrl ซ้ำ", () => {
    assert.equal(
        buildUploadUrl("https://cdn.example.com/activities/a.png", "http://localhost:3001"),
        "https://cdn.example.com/activities/a.png",
    )
})

test("buildUploadUrl: path สัมพัทธ์ /uploads/... ต่อ apiBaseUrl ตามเดิม", () => {
    assert.equal(buildUploadUrl("/uploads/activities/a.png", ""), "/uploads/activities/a.png")
    assert.equal(
        buildUploadUrl("/uploads/activities/a.png", "http://localhost:3001"),
        "http://localhost:3001/uploads/activities/a.png",
    )
})

test("buildUploadUrl: ไม่มี path → null", () => {
    assert.equal(buildUploadUrl(null, "http://localhost:3001"), null)
    assert.equal(buildUploadUrl(undefined, "http://localhost:3001"), null)
})
