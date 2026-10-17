"use client"

import { useState } from "react"
import { ScanQrCode, Smartphone } from "lucide-react"
import { SCAN_MOBILE_ONLY_MESSAGE } from "@/lib/device"
import { useScanCapable } from "@/lib/use-scan-capable"
import { QrScannerModal } from "@/components/student/qr-scanner-modal"

interface Props {
    /** publicId ของกิจกรรม — ไม่ใช่เลข id ภายใน */
    activityId: string
    activityName: string
}

/**
 * ปุ่มเปิดตัวสแกน QR code สดเพื่อเช็คอิน (ดู qr-scanner-modal.tsx สำหรับตัวกล้อง+ตรรกะสแกนจริง) —
 * เดิมเป็นปุ่ม "ถ่ายรูป" ที่เปิดกล้องถ่ายแค่ภาพเดียวแล้วค่อยถอดรหัสทีหลัง (ไม่ใช่สแกนสด ต่างจากตัวสแกน
 * ในแอปอย่าง LINE ที่เห็นผลทันทีที่จ่อกล้อง) เปลี่ยนมาเปิดกล้องสแกนสดแทนตามที่ขอ
 */
export function QrCheckInButton({ activityId, activityName }: Props) {
    const [open, setOpen] = useState(false)
    // สแกนได้เฉพาะมือถือ/iPad — notebook, MacBook และคอมพิวเตอร์ตั้งโต๊ะใช้ไม่ได้ (ดู lib/device.ts)
    const capable = useScanCapable()

    if (capable === false) {
        return (
            <div className="flex max-w-xs items-start gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-fg-muted">
                <Smartphone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{SCAN_MOBILE_ONLY_MESSAGE}</span>
            </div>
        )
    }

    return (
        <>
            <button
                type="button"
                disabled={capable === null}
                onClick={() => setOpen(true)}
                className="group inline-flex min-h-11 items-center gap-2.5 rounded-full bg-denim-deep px-5 text-sm font-bold text-white shadow-md transition-transform active:scale-95 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-denim"
            >
                <span className="relative flex size-6 shrink-0 items-center justify-center">
                    {/* ฮาโลเต้นๆ รอบไอคอน — บอกว่ากดได้/กำลังพร้อมใช้งาน ไม่ใช่ปุ่มทื่อๆ */}
                    <span className="absolute inset-0 animate-ping rounded-full bg-amber/50 group-disabled:hidden" />
                    <ScanQrCode className="relative size-5 text-amber" aria-hidden="true" />
                </span>
                สแกน QR เพื่อเช็คอิน
            </button>

            <QrScannerModal open={open} onOpenChange={setOpen} activityId={activityId} activityName={activityName} />
        </>
    )
}
