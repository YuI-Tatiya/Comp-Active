"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { activitiesAPI, isUnlimitedCapacity, Activity, API_BASE_URL } from "@/lib/api"
import { formatActivitySchedule } from "@/lib/activity-view"
import { ActivityPreviewHero } from "@/components/activity/activity-preview-hero"
import {
    ActivityAboutPanel,
    ActivityRegistrationPanel,
    ActivityRewardsPanel,
} from "@/components/activity/activity-info-panels"

/**
 * มุมมอง "ดูอย่างเดียว" ของกิจกรรมเดี่ยวสำหรับผู้จัด — ใช้ตอนกดดูกิจกรรมที่ไม่ใช่ของตัวเอง
 * (จากฟีดกิจกรรมทั้งหมดในหน้าแรก, หรือจากรายการกิจกรรมย่อยของงานอื่น) ต่างจาก
 * /organizer/activities/:id ที่เป็นหน้าจัดการเต็มรูปแบบและล็อกไว้เฉพาะเจ้าของ — หน้านี้อยู่ใน
 * layout ของผู้จัดเอง (AppHeader/RoleGuard ยังคุมอยู่) ไม่มีปุ่มจัดการหรือลงทะเบียนใด ๆ
 *
 * เดิมหน้านี้เขียน JSX ของตัวเอง (Tabs รายละเอียด/เงื่อนไข/สิทธิประโยชน์) แยกจากหน้าลงทะเบียนฝั่ง
 * นักศึกษาโดยสิ้นเชิง — เปลี่ยนมาใช้การ์ดหัวเรื่อง+แผงชุดเดียวกับหน้านักศึกษา/หน้า organizer อื่นๆ
 * ตามคอมเมนต์เดิมของหน้านี้เองที่บอกว่าตั้งใจให้ "ดูอย่างเดียว" ของอีกฝั่งหนึ่ง ไม่ใช่ดีไซน์แยกต่างหาก
 * (ไม่มีแผง "เงื่อนไข"/"สิทธิประโยชน์" อีกต่อไป เพราะ wizard สร้างงานปัจจุบันไม่เคยเก็บสองฟิลด์นี้แล้ว —
 * เหมือนกับที่ตัดออกจาก activity-info-panels.tsx ไปแล้วก่อนหน้านี้)
 */
export default function OrganizerActivityViewPage() {
    const params = useParams()
    const router = useRouter()
    const [activity, setActivity] = useState<Activity | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        if (params.id) {
            fetchActivity(Number(params.id))
        }
    }, [params.id])

    const fetchActivity = async (id: number) => {
        try {
            setLoading(true)
            const data = await activitiesAPI.getById(id)
            setActivity(data)
        } catch (err: unknown) {
            const e = err as Error
            setError(e.message || "โหลดข้อมูลกิจกรรมไม่สำเร็จ")
        } finally {
            setLoading(false)
        }
    }

    const handleShare = () => {
        if (!activity) return
        const publicUrl = `${window.location.origin}/events/activities/${activity.id}`
        navigator.clipboard.writeText(publicUrl)
        alert("คัดลอกลิงก์สำหรับแชร์ให้บุคคลทั่วไปเรียบร้อยแล้ว!")
    }

    if (loading) {
        return (
            <div className="bg-surface">
                <Container className="flex flex-col items-center justify-center py-32">
                    <Loader2 className="mx-auto mb-4 size-8 animate-spin text-brand-600" aria-hidden="true" />
                    <p className="text-fg-muted">กำลังโหลดรายละเอียดกิจกรรม...</p>
                </Container>
            </div>
        )
    }

    if (error || !activity) {
        return (
            <div className="bg-surface">
                <Container className="flex flex-col items-center justify-center gap-4 py-32">
                    <p className="font-medium text-danger">{error || "ไม่พบกิจกรรม"}</p>
                    <Button variant="outline" onClick={() => router.push("/organizer")}>
                        กลับไปหน้าแรก
                    </Button>
                </Container>
            </div>
        )
    }

    const capacity = activity.capacity ?? null
    const registeredCount = activity.registeredCount ?? 0
    const unlimited = isUnlimitedCapacity(capacity)

    return (
        <div className="bg-surface pb-12">
            <Container className="space-y-8 py-8">
                <div>
                    <Link href="/organizer" className="inline-flex items-center text-fg-muted hover:text-fg transition-colors">
                        <ArrowLeft className="mr-2 size-4" aria-hidden="true" /> กลับ
                    </Link>
                </div>

                <ActivityPreviewHero
                    imageUrl={activity.imageUrl ? `${API_BASE_URL}${activity.imageUrl}` : "/mascot.svg"}
                    title={activity.name}
                    categories={activity.categories ?? []}
                    organizerName={activity.organizer?.name}
                    statusLabel={activity.status === "open" || !activity.status ? "เปิดรับสมัคร" : "ปิดรับสมัคร"}
                    statusOpen={activity.status === "open" || !activity.status}
                    isProject={false}
                    sessions={[]}
                    activeId={null}
                    onSelectActivity={() => {}}
                    schedule={formatActivitySchedule(activity)}
                    location={activity.location}
                    registeredCount={registeredCount}
                    capacity={capacity}
                    unlimited={unlimited}
                    onShare={handleShare}
                />

                {/* 2 คอลัมน์เหมือนหน้าลงทะเบียนนักศึกษา — เดิมเรียง 1 คอลัมน์ยาวดิ่งลงมา ทำให้ต้องเลื่อนดูมากเกินจำเป็น */}
                <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
                    <div className="min-w-0 space-y-8">
                        <ActivityAboutPanel activity={activity} hideMeta />
                        <ActivityRegistrationPanel activity={activity} />
                    </div>
                    <div>
                        <ActivityRewardsPanel activity={activity} />
                    </div>
                </div>
            </Container>
        </div>
    )
}
