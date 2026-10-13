import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { waitForImages, type LoadableImage } from "./print-ready.ts"

/** รูปปลอมที่ควบคุมได้ว่าโหลดเสร็จเมื่อไร */
function fakeImage(state: "loaded" | "pending" | "error"): LoadableImage & { finish: () => void } {
    let resolve: () => void = () => {}
    const pending = new Promise<void>((r) => (resolve = r))
    return {
        complete: state === "loaded",
        naturalWidth: state === "loaded" ? 100 : 0,
        decode: () => (state === "error" ? Promise.reject(new Error("broken")) : state === "loaded" ? Promise.resolve() : pending),
        finish: () => resolve(),
    }
}

describe("waitForImages (รอรูปในเอกสารก่อนสั่งพิมพ์)", () => {
    test("ไม่มีรูป → เสร็จทันที", async () => {
        assert.equal(await waitForImages([], 1000), "ready")
    })

    test("รูปที่โหลดแล้ว → เสร็จทันที", async () => {
        assert.equal(await waitForImages([fakeImage("loaded")], 1000), "ready")
    })

    test("รอจนรูปที่ยังโหลดอยู่เสร็จก่อน (นี่คือบั๊กเดิม: พิมพ์ก่อนโลโก้มา)", async () => {
        const img = fakeImage("pending")
        let done = false
        const p = waitForImages([fakeImage("loaded"), img], 5000).then((r) => {
            done = true
            return r
        })
        await new Promise((r) => setTimeout(r, 20))
        assert.equal(done, false, "ต้องยังไม่เสร็จขณะรูปยังโหลดไม่เสร็จ")
        img.finish()
        assert.equal(await p, "ready")
    })

    test("รูปเสีย (decode ล้ม) ไม่ทำให้ค้างหรือ throw", async () => {
        assert.equal(await waitForImages([fakeImage("error")], 1000), "ready")
    })

    test("รูปที่ไม่มาเลย → หมดเวลาแล้วไปต่อ ไม่ค้างหน้าพิมพ์ตลอดไป", async () => {
        const started = Date.now()
        assert.equal(await waitForImages([fakeImage("pending")], 60), "timeout")
        assert.ok(Date.now() - started < 1000)
    })
})
