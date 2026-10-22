"use client"

import { useState } from "react"
import { ScanQrCode } from "lucide-react"
import { QrScannerModal } from "@/components/student/qr-scanner-modal"
import { RAISED_ACTION_OVERHANG_PX } from "@/components/layout/bottom-nav"

/**
 * ปุ่มสแกน QR ด่วนกลางแถบเมนูล่าง (พอร์ทัลนักศึกษา จอแคบ) — เปิดตัวสแกนกล้องสดได้ทันทีจากทุกหน้า
 * ไม่ต้องเข้า "กิจกรรมของฉัน" แล้วหาการ์ดของกิจกรรมนั้นก่อน ตัวสแกนรับ QR เช็คอินของกิจกรรมใดก็ได้
 * (ไม่ส่ง activityId) แล้วพาไปหน้าเช็คอินของกิจกรรมนั้น ซึ่งตรวจสิทธิ์ต่อเอง
 *
 * ผู้เรียกไม่ควรแสดงปุ่มนี้บนอุปกรณ์ที่สแกนไม่ได้ (useScanCapable() === false — โน้ตบุ๊ก/เดสก์ท็อป)
 * disabled = ยังไม่รู้ชนิดอุปกรณ์ (ระหว่าง hydrate)
 */
export function QuickScanButton({ disabled = false }: { disabled?: boolean }) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                disabled={disabled}
                aria-label="สแกน QR เพื่อเช็คอิน"
                className="group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-bold text-denim-deep focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-denim"
            >
                {/* ที่ว่างสูงเท่าแคปซูลไอคอนของแท็บอื่น — ป้าย "สแกน QR" จึงตรงแนวกับป้ายแท็บข้างๆ ส่วนวงกลมลอยเหนือขอบบนของแถบ */}
                <span className="h-8 w-14" aria-hidden="true" />
                <span
                    aria-hidden="true"
                    // top ติดลบเท่า RAISED_ACTION_OVERHANG_PX (BottomNavSpacer เผื่อที่ตามค่านี้) — inline style ไม่ใช่คลาส
                    // เพราะ Tailwind ไม่เห็นคลาสที่ประกอบจากตัวแปรตอนรัน
                    style={{ top: -RAISED_ACTION_OVERHANG_PX }}
                    className="absolute left-1/2 grid size-14 -translate-x-1/2 place-items-center rounded-full bg-amber text-denim-deep shadow-[0_4px_0_var(--color-amber-deep),0_12px_22px_-8px_rgb(18_34_61/0.55)] ring-4 ring-white transition-transform group-active:translate-y-0.5 group-disabled:opacity-60"
                >
                    <ScanQrCode className="size-7" strokeWidth={2.2} />
                </span>
                <span className="max-w-full truncate px-1">สแกน QR</span>
            </button>

            <QrScannerModal open={open} onOpenChange={setOpen} />
        </>
    )
}
