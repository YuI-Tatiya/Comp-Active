"use client"

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react"
import { createPortal } from "react-dom"
import jsQR from "jsqr"
import { useRouter } from "next/navigation"
import { AlertTriangle, Camera, ImageUp, Loader2, X } from "lucide-react"
import { parseCheckinUrl } from "@/lib/checkin-qr"
import { cn } from "@/lib/utils"

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** publicId ของกิจกรรม — ไว้เทียบว่า QR ที่สแกนได้เป็นของกิจกรรมนี้จริงไหม */
    activityId: string
    activityName: string
}

type CameraState =
    | "requesting" // กำลังขอสิทธิ์กล้อง
    | "scanning" // กล้องเปิดแล้ว กำลังสแกนหา QR
    | "denied" // ผู้ใช้ปฏิเสธสิทธิ์กล้อง (หรือเบราว์เซอร์บล็อก)
    | "unsupported" // เบราว์เซอร์นี้ไม่รองรับ getUserMedia เลย
    | "error" // เปิดกล้องไม่สำเร็จด้วยเหตุผลอื่น (ไม่มีกล้อง ฯลฯ)

/** อ่านรูปที่เลือก ถอดรหัส QR code ด้วย jsQR — คืนข้อความที่เข้ารหัสไว้ หรือ null ถ้าอ่านไม่ออก (ทางสำรองเวลากล้องใช้ไม่ได้) */
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
    return jsQR(imageData.data, imageData.width, imageData.height)?.data ?? null
}

const SCAN_INTERVAL_MS = 250
// ยิ่งภาพใหญ่ jsQR ยิ่งกินเวลาต่อเฟรมมาก — ย่อด้านยาวสุดลงมาที่ความละเอียดนี้พอให้ยังอ่าน QR ที่พิมพ์/แสดงจอได้
// ชัดอยู่ แต่ไม่หนักเครื่องจนสแกนหน่วงเวลาสแกนสดด้วยกล้อง
const MAX_SCAN_DIMENSION = 720
// ขึ้นข้อความแล้วซ่อนเองถ้าไม่ตรงกิจกรรม — ไม่ปิดกล้อง ให้ลองสแกนอันที่ถูกต่อได้ทันทีไม่ต้องเปิดใหม่
const MISMATCH_MESSAGE_MS = 2500

/**
 * สแกน QR เช็คอินสดด้วยกล้อง (เหมือนตัวสแกนในแอปอย่าง LINE) แทนการถ่ายรูปแล้วค่อยถอดรหัสทีหลัง —
 * เปิดกล้องผ่าน getUserMedia ตรงๆ แล้ว setInterval อ่านเฟรมปัจจุบันด้วย jsQR ทุก 250ms จนกว่าจะเจอ
 *
 * ถ้าเปิดกล้องไม่ได้ (ปฏิเสธสิทธิ์/ไม่มีกล้อง/เบราว์เซอร์เก่าไม่รองรับ) มีทางสำรองให้เลือกรูปจากเครื่อง
 * มาถอดรหัสแทนเสมอ — "ทุกช่องทาง" ต้องเช็คอินได้จริง ไม่ใช่กล้องพังแล้วตัน
 */
export function QrScannerModal({ open, onOpenChange, activityId, activityName }: Props) {
    const router = useRouter()
    const [mounted, setMounted] = useState(false)
    const [cameraState, setCameraState] = useState<CameraState>("requesting")
    const [mismatchMessage, setMismatchMessage] = useState("")
    const [fallbackError, setFallbackError] = useState("")
    const [decodingFile, setDecodingFile] = useState(false)

    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const mismatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    // scan tick อ่าน props/state ปัจจุบันผ่าน ref เสมอ — setInterval ตั้งครั้งเดียวตอนเปิดกล้อง ไม่อยาก
    // ผูก activityId เป็น dependency แล้วต้อง restart stream ทุกครั้งที่ re-render โดยไม่จำเป็น
    const activityIdRef = useRef(activityId)
    activityIdRef.current = activityId

    useEffect(() => setMounted(true), [])

    const stopCamera = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
        }
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
    }, [])

    const handleDecoded = useCallback(
        (text: string) => {
            const parsed = parseCheckinUrl(text)
            if (!parsed || parsed.id !== activityIdRef.current) {
                setMismatchMessage(
                    parsed
                        ? `QR code นี้เป็นของกิจกรรมอื่น ไม่ตรงกับ "${activityName}" — ลองสแกน QR ที่ถูกต้องอีกครั้ง`
                        : "นี่ไม่ใช่ QR code สำหรับเช็คอินกิจกรรม"
                )
                if (mismatchTimerRef.current) clearTimeout(mismatchTimerRef.current)
                mismatchTimerRef.current = setTimeout(() => setMismatchMessage(""), MISMATCH_MESSAGE_MS)
                return
            }
            stopCamera()
            onOpenChange(false)
            router.push(`/student/checkin/${parsed.id}${parsed.search}`)
        },
        [activityName, onOpenChange, router, stopCamera]
    )

    // เปิด/ปิดกล้องตาม open — คนละ effect กับ mounted ด้านบน เพราะ SSR ไม่มี navigator.mediaDevices
    useEffect(() => {
        if (!open) {
            stopCamera()
            return
        }

        let cancelled = false
        setCameraState("requesting")
        setMismatchMessage("")
        setFallbackError("")

        if (!navigator.mediaDevices?.getUserMedia) {
            setCameraState("unsupported")
            return
        }

        navigator.mediaDevices
            .getUserMedia({ video: { facingMode: { ideal: "environment" } } })
            .then((stream) => {
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop())
                    return
                }
                streamRef.current = stream
                if (videoRef.current) videoRef.current.srcObject = stream
                setCameraState("scanning")

                intervalRef.current = setInterval(() => {
                    const video = videoRef.current
                    if (!video || video.readyState < video.HAVE_CURRENT_DATA || !video.videoWidth) return

                    if (!canvasRef.current) canvasRef.current = document.createElement("canvas")
                    const canvas = canvasRef.current
                    const scale = Math.min(1, MAX_SCAN_DIMENSION / Math.max(video.videoWidth, video.videoHeight))
                    canvas.width = Math.round(video.videoWidth * scale)
                    canvas.height = Math.round(video.videoHeight * scale)
                    const ctx = canvas.getContext("2d", { willReadFrequently: true })
                    if (!ctx) return
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

                    let imageData: ImageData
                    try {
                        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                    } catch {
                        return
                    }
                    const code = jsQR(imageData.data, imageData.width, imageData.height)
                    if (code?.data) handleDecoded(code.data)
                }, SCAN_INTERVAL_MS)
            })
            .catch((err: unknown) => {
                if (cancelled) return
                const name = (err as { name?: string })?.name
                setCameraState(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error")
            })

        return () => {
            cancelled = true
            stopCamera()
        }
        // handleDecoded เปลี่ยน reference ทุกครั้งที่ activityName/router เปลี่ยน (ไม่เคยเกิดขึ้นจริงระหว่าง
        // เปิดโมดัลอยู่) ตั้งใจไม่ใส่เป็น dependency กันกล้อง restart โดยไม่จำเป็น — ใช้ ref อ่านค่าล่าสุดแทน
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, stopCamera])

    useEffect(() => {
        return () => {
            if (mismatchTimerRef.current) clearTimeout(mismatchTimerRef.current)
        }
    }, [])

    async function handleFile(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        e.target.value = ""
        if (!file) return

        setFallbackError("")
        setDecodingFile(true)
        try {
            const text = await decodeQrFromFile(file)
            if (!text) {
                setFallbackError("อ่าน QR code ไม่สำเร็จ ลองถ่ายให้ชัดและอยู่กลางเฟรมอีกครั้ง")
                return
            }
            const parsed = parseCheckinUrl(text)
            if (!parsed) {
                setFallbackError("รูปนี้ไม่ใช่ QR code สำหรับเช็คอินกิจกรรม")
                return
            }
            if (parsed.id !== activityId) {
                setFallbackError(`QR code นี้เป็นของกิจกรรมอื่น ไม่ตรงกับ "${activityName}"`)
                return
            }
            if (!parsed.search) {
                setFallbackError("อ่าน QR code ไม่ครบ (ไม่มีรหัสยืนยัน) ลองถ่ายให้เห็น QR เต็มรูปอีกครั้ง")
                return
            }
            onOpenChange(false)
            router.push(`/student/checkin/${parsed.id}${parsed.search}`)
        } catch (err) {
            setFallbackError((err as Error).message || "เกิดข้อผิดพลาด กรุณาลองใหม่")
        } finally {
            setDecodingFile(false)
        }
    }

    if (!open || !mounted) return null

    const cameraFailed = cameraState === "denied" || cameraState === "unsupported" || cameraState === "error"

    return createPortal(
        <div className="fixed inset-0 z-[60] flex flex-col bg-black" style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
            <div className="flex items-center justify-between px-4 py-3">
                <p className="truncate pr-3 text-sm font-medium text-white/90">{activityName}</p>
                <button
                    type="button"
                    onClick={() => {
                        stopCamera()
                        onOpenChange(false)
                    }}
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim"
                    aria-label="ปิดตัวสแกน"
                >
                    <X className="size-5" aria-hidden="true" />
                </button>
            </div>

            <div className="relative flex flex-1 items-center justify-center overflow-hidden">
                {!cameraFailed && (
                    <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 size-full object-cover" />
                )}

                {cameraState === "scanning" && (
                    <div className="relative aspect-square w-[min(72vw,320px)]">
                        {/* box-shadow แผ่ขอบมืดรอบกรอบ โดยไม่ต้องใช้ clip-path — ตัวกรอบเองใสเห็นกล้องข้างใน */}
                        <div className="absolute inset-0 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
                        <div className="absolute inset-0 overflow-hidden rounded-3xl">
                            <div className="absolute inset-x-0 h-0.5 animate-scan-sweep bg-amber shadow-[0_0_8px_2px_rgba(195,211,234,0.8)]" />
                        </div>
                        {/* มุมกรอบ 4 มุม ให้ดูเป็นตัวสแกนจริงๆ ไม่ใช่กรอบสี่เหลี่ยมเฉยๆ */}
                        {[
                            "left-0 top-0 rounded-tl-2xl border-l-4 border-t-4",
                            "right-0 top-0 rounded-tr-2xl border-r-4 border-t-4",
                            "left-0 bottom-0 rounded-bl-2xl border-l-4 border-b-4",
                            "right-0 bottom-0 rounded-br-2xl border-r-4 border-b-4",
                        ].map((cls) => (
                            <div key={cls} className={cn("absolute size-10 border-amber", cls)} />
                        ))}
                    </div>
                )}

                {cameraState === "requesting" && (
                    <div className="flex flex-col items-center gap-3 text-white">
                        <Loader2 className="size-10 animate-spin" aria-hidden="true" />
                        <p className="text-sm text-white/80">กำลังขอสิทธิ์ใช้กล้อง...</p>
                    </div>
                )}

                {cameraFailed && (
                    <div className="mx-6 flex max-w-xs flex-col items-center gap-3 text-center text-white">
                        <div className="flex size-14 items-center justify-center rounded-full bg-white/10">
                            <Camera className="size-7 text-white/80" aria-hidden="true" />
                        </div>
                        <p className="text-sm text-white/80">
                            {cameraState === "denied"
                                ? "ไม่ได้รับสิทธิ์ใช้กล้อง — กรุณาอนุญาตการใช้กล้องในการตั้งค่าเบราว์เซอร์ แล้วลองใหม่ หรือเลือกรูปจากเครื่องแทนด้านล่าง"
                                : "เปิดกล้องไม่สำเร็จ ลองเลือกรูปภาพ QR code จากเครื่องแทนได้ด้านล่าง"}
                        </p>
                    </div>
                )}
            </div>

            <div className="space-y-3 px-5 pb-6 pt-3 text-center">
                {cameraState === "scanning" && !mismatchMessage && (
                    <p className="text-sm text-white/70">จ่อกล้องไปที่ QR code ที่ผู้จัดแสดงไว้ — ระบบจะเช็คอินให้อัตโนมัติ</p>
                )}
                {mismatchMessage && (
                    <p className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-amber">
                        <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                        {mismatchMessage}
                    </p>
                )}
                {fallbackError && <p className="text-xs text-danger">{fallbackError}</p>}

                <button
                    type="button"
                    disabled={decodingFile}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 disabled:opacity-50"
                >
                    {decodingFile ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ImageUp className="size-4" aria-hidden="true" />}
                    {decodingFile ? "กำลังอ่าน QR..." : "กล้องใช้ไม่ได้? เลือกรูป QR code จากเครื่องแทน"}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
            </div>
        </div>,
        document.body
    )
}
