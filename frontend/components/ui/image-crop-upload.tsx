"use client"

import { useRef, useState, type SyntheticEvent } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./dialog"
import { Button } from "./button"
import { Dropzone } from "./dropzone"
import { RefreshCw, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

export const IMAGE_CROP_ASPECT = 16 / 9
const MAX_SIZE_MB = 5
const OUTPUT_WIDTH = 1280
const ACCEPT = "image/jpeg,image/png,image/gif"

const PREVIEW_BUTTON =
    "inline-flex min-h-9 items-center gap-1.5 rounded-lg border-[1.5px] border-denim-field bg-white px-3 text-xs font-semibold text-denim-deep transition-colors hover:border-denim-dash hover:bg-denim-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-denim"

/**
 * คำนวณ source rect แบบเดียวกับ CSS object-fit:cover + object-position: X% Y%
 * — ใช้ทั้งฝั่ง preview (CSS) และฝั่ง canvas (ตอน export) เพื่อให้สิ่งที่เห็นตรงกับไฟล์จริง 100%
 */
export function computeCoverSourceRect(
    naturalWidth: number,
    naturalHeight: number,
    aspect: number,
    posXPercent: number,
    posYPercent: number,
): { sx: number; sy: number; sw: number; sh: number } {
    const imageAspect = naturalWidth / naturalHeight
    let sw: number
    let sh: number
    if (imageAspect > aspect) {
        sh = naturalHeight
        sw = sh * aspect
    } else {
        sw = naturalWidth
        sh = sw / aspect
    }
    const maxX = Math.max(0, naturalWidth - sw)
    const maxY = Math.max(0, naturalHeight - sh)
    return {
        sx: maxX * (posXPercent / 100),
        sy: maxY * (posYPercent / 100),
        sw,
        sh,
    }
}

interface ImageCropUploadProps {
    label: string
    helperText?: string
    preview: string | null
    onChange: (file: File, preview: string) => void
    onClear?: () => void
    aspect?: number
    /** ขนาดกล่องลากวาง เช่น min-h-[220px] สำหรับรูปปกงานที่กินเต็มความกว้างการ์ด */
    dropzoneClassName?: string
}

export function ImageCropUpload({
    label,
    helperText = `16:9 · แนะนำ ${OUTPUT_WIDTH}×${Math.round(OUTPUT_WIDTH / IMAGE_CROP_ASPECT)} · JPG/PNG/GIF ไม่เกิน ${MAX_SIZE_MB}MB`,
    preview,
    onChange,
    onClear,
    aspect = IMAGE_CROP_ASPECT,
    dropzoneClassName,
}: ImageCropUploadProps) {
    const replaceInputRef = useRef<HTMLInputElement>(null)
    const [rawUrl, setRawUrl] = useState<string | null>(null)
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })
    const [posX, setPosX] = useState(50)
    const [posY, setPosY] = useState(50)
    const [error, setError] = useState("")

    function processFile(file: File) {
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            setError(`ไฟล์ต้องมีขนาดไม่เกิน ${MAX_SIZE_MB}MB`)
            return
        }
        setError("")
        setPosX(50)
        setPosY(50)
        if (rawUrl) URL.revokeObjectURL(rawUrl)
        setRawUrl(URL.createObjectURL(file))
    }

    function handleImageLoad(e: SyntheticEvent<HTMLImageElement>) {
        setNaturalSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })
    }

    function handleConfirm() {
        if (!rawUrl || naturalSize.width === 0) return
        const { sx, sy, sw, sh } = computeCoverSourceRect(naturalSize.width, naturalSize.height, aspect, posX, posY)

        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement("canvas")
            canvas.width = OUTPUT_WIDTH
            canvas.height = Math.round(OUTPUT_WIDTH / aspect)
            const ctx = canvas.getContext("2d")
            if (!ctx) return
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
            canvas.toBlob(
                (blob) => {
                    if (!blob) return
                    const file = new File([blob], "cropped.jpg", { type: "image/jpeg" })
                    onChange(file, canvas.toDataURL("image/jpeg", 0.9))
                    if (rawUrl) URL.revokeObjectURL(rawUrl)
                    setRawUrl(null)
                },
                "image/jpeg",
                0.9,
            )
        }
        img.src = rawUrl
    }

    return (
        <div className="space-y-2">
            {/* มีรูปแล้ว → แสดงรูปแทนกล่องลากวาง พร้อมปุ่มเปลี่ยน/ลบ (เดิมกล่องลากวางค้างอยู่เหนือรูปตลอด) */}
            {preview ? (
                <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-denim-line bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt={label} className="w-full object-cover" style={{ aspectRatio: aspect }} />
                    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-denim-line px-3 py-2.5">
                        <button type="button" onClick={() => replaceInputRef.current?.click()} className={PREVIEW_BUTTON}>
                            <RefreshCw className="size-3.5" aria-hidden="true" />
                            เปลี่ยนรูป
                        </button>
                        {onClear && (
                            <button type="button" onClick={onClear} className={cn(PREVIEW_BUTTON, "text-danger-fg hover:border-danger/50 hover:bg-danger-bg")}>
                                <Trash2 className="size-3.5" aria-hidden="true" />
                                ลบรูป
                            </button>
                        )}
                    </div>
                    <input
                        ref={replaceInputRef}
                        type="file"
                        accept={ACCEPT}
                        tabIndex={-1}
                        aria-hidden="true"
                        className="sr-only"
                        onChange={(e) => {
                            const file = e.target.files?.[0]
                            e.target.value = ""
                            if (file) processFile(file)
                        }}
                    />
                </div>
            ) : (
                <Dropzone accept={ACCEPT} onFileSelected={processFile} hint={helperText} className={dropzoneClassName} />
            )}
            {error && <p className="text-xs text-danger">{error}</p>}

            <Dialog
                open={!!rawUrl}
                onOpenChange={(open) => {
                    if (!open) {
                        if (rawUrl) URL.revokeObjectURL(rawUrl)
                        setRawUrl(null)
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>ปรับตำแหน่งรูปภาพ ({label})</DialogTitle>
                    </DialogHeader>

                    {rawUrl && (
                        <div className="space-y-4">
                            <div className="relative w-full overflow-hidden rounded-lg border border-border bg-surface" style={{ aspectRatio: aspect }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={rawUrl}
                                    alt="ต้นฉบับ"
                                    onLoad={handleImageLoad}
                                    className="size-full object-cover"
                                    style={{ objectPosition: `${posX}% ${posY}%` }}
                                />
                            </div>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-fg-muted">เลื่อนแนวนอน</label>
                                    <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={posX}
                                        onChange={(e) => setPosX(Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-fg-muted">เลื่อนแนวตั้ง</label>
                                    <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={posY}
                                        onChange={(e) => setPosY(Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                if (rawUrl) URL.revokeObjectURL(rawUrl)
                                setRawUrl(null)
                            }}
                        >
                            ยกเลิก
                        </Button>
                        <Button type="button" onClick={handleConfirm}>ยืนยันการครอป</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
