"use client"

import { useRef, useState, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import jsQR from "jsqr"
import { Button } from "@/components/ui/button"
import { QrCode, Loader2 } from "lucide-react"

interface Props {
    activityId: number
    activityName: string
}

/** อ่านรูปที่เพิ่งถ่าย ถอดรหัส QR code ด้วย jsQR — คืนข้อความที่เข้ารหัสไว้ หรือ null ถ้าอ่านไม่ออก */
async function decodeQrFromFile(file: File): Promise<string | null> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error("อ่านไฟล์รูปไม่สำเร็จ"))
        reader.readAsDataURL(file)
    })

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new window.Image()
        el.onload = () => resolve(el)
        el.onerror = () => reject(new Error("เปิดรูปภาพไม่สำเร็จ"))
        el.src = dataUrl
    })

    const canvas = document.createElement("canvas")
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.drawImage(img, 0, 0)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height)
    return code?.data ?? null
}

/** QR ของผู้จัดเข้ารหัสเป็น URL รูปแบบ /student/checkin/:activityId (ดู activity-participant-manager.tsx) */
function extractActivityId(text: string): number | null {
    const match = text.match(/\/student\/checkin\/(\d+)/)
    if (!match) return null
    const id = Number(match[1])
    return Number.isFinite(id) ? id : null
}

/** ปุ่มถ่ายรูป QR code ที่ผู้จัดแสดงหน้างานเพื่อเช็คอิน — ถอดรหัสในเครื่อง แล้วพาไปหน้าเช็คอินจริงที่มีอยู่แล้ว */
export function QrCheckInButton({ activityId, activityName }: Props) {
    const router = useRouter()
    const inputRef = useRef<HTMLInputElement>(null)
    const [decoding, setDecoding] = useState(false)
    const [error, setError] = useState("")

    async function handleFile(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        e.target.value = ""
        if (!file) return

        setError("")
        setDecoding(true)
        try {
            const text = await decodeQrFromFile(file)
            if (!text) {
                setError("อ่าน QR code ไม่สำเร็จ ลองถ่ายให้ชัดและอยู่กลางเฟรมอีกครั้ง")
                return
            }
            const scannedActivityId = extractActivityId(text)
            if (!scannedActivityId) {
                setError("รูปนี้ไม่ใช่ QR code สำหรับเช็คอินกิจกรรม")
                return
            }
            if (scannedActivityId !== activityId) {
                setError(`QR code นี้เป็นของกิจกรรมอื่น ไม่ตรงกับ "${activityName}"`)
                return
            }
            router.push(`/student/checkin/${scannedActivityId}`)
        } catch (err) {
            setError((err as Error).message || "เกิดข้อผิดพลาด กรุณาลองใหม่")
        } finally {
            setDecoding(false)
        }
    }

    return (
        <div className="flex flex-col items-start gap-1.5">
            <Button
                type="button"
                size="sm"
                className="rounded-xl font-bold shadow-sm"
                disabled={decoding}
                onClick={() => inputRef.current?.click()}
            >
                {decoding ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                    <QrCode className="size-4" aria-hidden="true" />
                )}
                {decoding ? "กำลังอ่าน QR..." : "ถ่ายรูป QR เพื่อเช็คอิน"}
            </Button>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFile}
            />
            {error && <p className="max-w-xs text-xs text-danger">{error}</p>}
        </div>
    )
}
