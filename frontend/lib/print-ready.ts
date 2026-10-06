/**
 * รอให้รูปในเอกสารโหลดและถอดรหัสเสร็จก่อนเรียก window.print() — ไม่ import อะไร ทดสอบด้วย node --test ได้
 * บั๊กเดิม: หน้าพิมพ์รอแค่ฟอนต์ หน้าต่างพิมพ์จึงเปิดก่อนโลโก้โหลด PDF ที่บันทึกออกมาไม่มีโลโก้
 */

/** ส่วนของ HTMLImageElement ที่ใช้ (แยกเป็น interface เพื่อทดสอบด้วยรูปปลอมได้) */
export interface LoadableImage {
    complete: boolean
    naturalWidth: number
    decode: () => Promise<void>
}

/**
 * คืน "ready" เมื่อทุกรูปพร้อม (รูปเสียนับว่าพร้อม — ไม่ให้รูปเดียวทำให้พิมพ์ไม่ได้)
 * หรือ "timeout" เมื่อเกินเวลาที่กำหนด เพื่อไม่ให้หน้าพิมพ์ค้างตลอดไปถ้ารูปไม่มาเลย
 */
export function waitForImages(images: LoadableImage[], timeoutMs: number): Promise<"ready" | "timeout"> {
    const pending = images
        .filter((img) => !(img.complete && img.naturalWidth > 0))
        .map((img) => img.decode().catch(() => undefined))

    if (pending.length === 0) return Promise.resolve("ready")

    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<"timeout">((resolve) => {
        timer = setTimeout(() => resolve("timeout"), timeoutMs)
    })
    const ready = Promise.all(pending).then(() => "ready" as const)

    return Promise.race([ready, timeout]).finally(() => clearTimeout(timer))
}
