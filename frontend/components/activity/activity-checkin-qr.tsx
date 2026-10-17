"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Loader2, Lock, QrCode, Unlock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { activitiesAPI, type CheckInSessionResult } from "@/lib/api"

interface Props {
    /** publicId ของกิจกรรม — ไม่ใช่เลข id ภายใน (เดาเลขถัดไปแล้วเปิดกิจกรรมคนอื่นไม่ได้) */
    activityId: string
    /** กิจกรรมจบไปแล้ว — ปิดปุ่ม "เปิดการเช็คอิน" ไว้ก่อนเลย กัน error จาก backend มาโผล่ทีหลัง (backend ก็เช็คซ้ำอีกชั้น) */
    completed: boolean
}

/** นาที:วินาที ที่เหลือก่อน QR หมดอายุ — ปัดขึ้นเป็นวินาทีเต็ม ไม่ให้ขึ้นค้างที่ 0:00 ก่อนรีเฟรชจริง */
function formatCountdown(msLeft: number): string {
    const totalSec = Math.max(0, Math.ceil(msLeft / 1000))
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    return `${m}:${s.toString().padStart(2, "0")}`
}

/**
 * QR เช็คอินที่หมุนรหัสใหม่ทุก 5 นาที พร้อมสวิตช์ "เปิดการเช็คอิน" / "ปิดการเช็คอิน" แยกปุ่มกันตรงๆ ตามที่ตกลงกันไว้
 * — ปิดเป็นค่าเริ่มต้นเสมอ (fail closed) นักศึกษาเช็คอินเองไม่ได้จนกว่าผู้จัดจะกดเปิด
 *
 * token หมุนรหัสคำนวณที่ backend เท่านั้น (checkin-token.util.ts) ฝั่งนี้แค่ขอ token ปัจจุบันมาแสดง แล้วตั้งเวลา
 * รีเฟรชตาม expiresAt ที่ backend บอกมาตรงๆ — ไม่คำนวณรอบเวลาซ้ำเองฝั่ง client กัน clock เบราว์เซอร์คลาดเคลื่อน
 * แล้วไปขอ token ใหม่ก่อน/หลังที่ backend คิดว่าหมดอายุ
 */
export function ActivityCheckinQr({ activityId, completed }: Props) {
    const [session, setSession] = useState<CheckInSessionResult | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState("")
    const [toggling, setToggling] = useState(false)
    const [toggleError, setToggleError] = useState("")
    const [msLeft, setMsLeft] = useState(0)
    const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const load = useCallback(async () => {
        setLoadError("")
        try {
            setSession(await activitiesAPI.getCheckInSession(activityId))
        } catch (err) {
            setLoadError((err as Error).message || "โหลดข้อมูล QR ไม่สำเร็จ")
        }
    }, [activityId])

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        load().finally(() => {
            if (!cancelled) setLoading(false)
        })
        return () => {
            cancelled = true
        }
    }, [load])

    // รีเฟรช token ใหม่พอดีตอนที่ backend บอกว่าหมดอายุ (+กันชน 1 วิ) — เฉพาะตอนเปิดใช้งานอยู่เท่านั้น
    useEffect(() => {
        if (refreshTimer.current) clearTimeout(refreshTimer.current)
        if (!session?.enabled) return
        const ms = new Date(session.expiresAt).getTime() - Date.now()
        refreshTimer.current = setTimeout(load, Math.max(1000, ms + 1000))
        return () => {
            if (refreshTimer.current) clearTimeout(refreshTimer.current)
        }
    }, [session, load])

    // นับถอยหลังที่แสดงบนจอ — แค่ UI อัปเดตทุกวินาที ไม่เกี่ยวกับ timer รีเฟรช token จริงด้านบน
    useEffect(() => {
        if (!session?.enabled) {
            setMsLeft(0)
            return
        }
        const tick = () => setMsLeft(new Date(session.expiresAt).getTime() - Date.now())
        tick()
        const id = setInterval(tick, 1000)
        return () => clearInterval(id)
    }, [session])

    async function toggle(enabled: boolean) {
        if (toggling || session?.enabled === enabled) return
        setToggling(true)
        setToggleError("")
        try {
            setSession(await activitiesAPI.setSelfCheckIn(activityId, enabled))
        } catch (err) {
            setToggleError((err as Error).message || "บันทึกไม่สำเร็จ")
        } finally {
            setToggling(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 p-6 text-sm text-fg-muted">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" /> กำลังโหลด...
            </div>
        )
    }

    if (!session) {
        return (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
                <p className="text-sm text-danger">{loadError}</p>
                <Button type="button" variant="outline" size="sm" onClick={load}>ลองใหม่</Button>
            </div>
        )
    }

    const checkInUrl =
        typeof window !== "undefined"
            ? `${window.location.origin}/student/checkin/${activityId}?token=${encodeURIComponent(session.token)}`
            : ""

    return (
        <div className="flex flex-col items-center gap-4 p-6 text-center">
            <div className="flex items-center gap-2">
                <h3 className="font-semibold text-fg">QR Code สำหรับเช็คอิน</h3>
                <Badge variant={session.enabled ? "success" : "neutral"}>
                    {session.enabled ? "เปิดอยู่" : "ปิดอยู่"}
                </Badge>
            </div>

            {session.enabled && checkInUrl ? (
                <>
                    <div className="rounded-xl border border-border bg-white p-4">
                        <QRCodeSVG value={checkInUrl} size={168} />
                    </div>
                    <p className="text-xs text-fg-subtle">
                        รหัสจะเปลี่ยนอัตโนมัติในอีก{" "}
                        <span className="font-medium tabular-nums text-fg">{formatCountdown(msLeft)}</span> นาที —
                        ไม่ต้องกดอะไรเพิ่ม
                    </p>
                </>
            ) : (
                <div className="flex size-[168px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface p-4 text-fg-subtle">
                    <QrCode className="size-8" aria-hidden="true" />
                    <p className="text-xs">ยังไม่เปิดให้เช็คอิน</p>
                </div>
            )}

            <div className="flex w-full gap-2">
                <Button
                    type="button"
                    className="flex-1 gap-1.5"
                    variant={session.enabled ? "outline" : "default"}
                    disabled={toggling || session.enabled || completed}
                    onClick={() => toggle(true)}
                    title={completed ? "กิจกรรมนี้จบไปแล้ว เปิดการเช็คอินไม่ได้" : undefined}
                >
                    {toggling && !session.enabled ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                        <Unlock className="size-4" aria-hidden="true" />
                    )}
                    เปิดการเช็คอิน
                </Button>
                <Button
                    type="button"
                    className="flex-1 gap-1.5"
                    variant={session.enabled ? "destructive" : "outline"}
                    disabled={toggling || !session.enabled}
                    onClick={() => toggle(false)}
                >
                    {toggling && session.enabled ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                        <Lock className="size-4" aria-hidden="true" />
                    )}
                    ปิดการเช็คอิน
                </Button>
            </div>

            {toggleError && <p className="text-xs text-danger">{toggleError}</p>}
            {completed && !session.enabled && (
                <p className="text-xs text-fg-subtle">กิจกรรมนี้จบไปแล้ว จึงเปิดการเช็คอินใหม่ไม่ได้</p>
            )}

            <p className="text-xs text-fg-subtle">
                ให้ผู้เข้าร่วมสแกนด้วยมือถือของตัวเอง (ต้องเข้าสู่ระบบนักศึกษาไว้ก่อน) เพื่อเช็คอินได้ทันที
            </p>
        </div>
    )
}
