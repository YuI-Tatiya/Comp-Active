"use client"

import { useState, type ChangeEvent, type SyntheticEvent } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./dialog"
import { Button } from "./button"
import { Input } from "./input"
import { X } from "lucide-react"

export const IMAGE_CROP_ASPECT = 16 / 9
const MAX_SIZE_MB = 5
const OUTPUT_WIDTH = 1280

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
    const maxX = naturalWidth - sw
    const maxY = naturalHeight - sh
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
}

export function ImageCropUpload({
    label,
    helperText = "แนะนำอัตราส่วน 16:9 (เช่น 1280×720) ไฟล์ไม่เกิน 5MB",
    preview,
    onChange,
    onClear,
    aspect = IMAGE_CROP_ASPECT,
}: ImageCropUploadProps) {
    const [rawUrl, setRawUrl] = useState<string | null>(null)
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })
    const [posX, setPosX] = useState(50)
    const [posY, setPosY] = useState(50)
    const [error, setError] = useState("")

    function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        e.target.value = ""
        if (!file) return
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            setError(`ไฟล์ต้องมีขนาดไม่เกิน ${MAX_SIZE_MB}MB`)
            return
        }
        setError("")
        setPosX(50)
        setPosY(50)
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
            <Input type="file" accept="image/jpeg,image/png,image/gif" onChange={handleFileChange} />
            <p className="text-xs text-fg-subtle">{helperText}</p>
            {error && <p className="text-xs text-danger">{error}</p>}

            {preview && (
                <div className="relative mt-2 w-full max-w-sm overflow-hidden rounded-lg border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt={label} className="aspect-video w-full object-cover" />
                    {onClear && (
                        <button
                            type="button"
                            onClick={onClear}
                            aria-label="ลบรูปภาพ"
                            className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                        >
                            <X className="size-3.5" />
                        </button>
                    )}
                </div>
            )}

            <Dialog open={!!rawUrl} onOpenChange={(open) => !open && setRawUrl(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>ปรับตำแหน่งรูปภาพ ({label})</DialogTitle>
                    </DialogHeader>

                    {rawUrl && (
                        <div className="space-y-4">
                            <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-surface">
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
                        <Button type="button" variant="outline" onClick={() => setRawUrl(null)}>ยกเลิก</Button>
                        <Button type="button" onClick={handleConfirm}>ยืนยันการครอป</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
