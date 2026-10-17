"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { referenceCode } from "@/components/denim/denim-ui"
import { ActivityRegistrationView } from "@/components/activity/activity-registration-view"
import { activitiesAPI, Activity } from "@/lib/api"
import { eventImagePathFor } from "@/lib/event-image"

/**
 * มุมมอง "ดูอย่างเดียว" ของกิจกรรมเดี่ยวสำหรับผู้จัด — ใช้ตอนกดดูกิจกรรมที่ไม่ใช่ของตัวเอง
 * (จากฟีดกิจกรรมทั้งหมดในหน้าแรก, หรือจากรายการกิจกรรมย่อยของงานอื่น) ต่างจาก
 * /organizer/activities/:id ที่เป็นหน้าจัดการเต็มรูปแบบและล็อกไว้เฉพาะเจ้าของ — หน้านี้อยู่ใน
 * layout ของผู้จัดเอง (AppHeader/RoleGuard ยังคุมอยู่) ไม่มีปุ่มจัดการหรือลงทะเบียนใด ๆ
 *
 * ใช้ ActivityRegistrationView ชุดเดียวกับหน้ากิจกรรมฝั่งนักศึกษาในโหมด preview — ตั้งใจให้เป็น "ดูอย่างเดียว"
 * ของอีกฝั่งหนึ่ง ไม่ใช่ดีไซน์แยกต่างหาก (เดิมเคยเขียน JSX ของตัวเองแล้วเพี้ยนออกจากหน้านักศึกษา)
 */
export default function OrganizerActivityViewPage() {
    const params = useParams()
    const router = useRouter()
    const [activity, setActivity] = useState<Activity | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        if (params.id) {
            fetchActivity(String(params.id))
        }
    }, [params.id])

    const fetchActivity = async (publicId: string) => {
        try {
            setLoading(true)
            const data = await activitiesAPI.getById(publicId)
            setActivity(data)
        } catch (err: unknown) {
            const e = err as Error
            setError(e.message || "โหลดข้อมูลกิจกรรมไม่สำเร็จ")
        } finally {
            setLoading(false)
        }
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

    return (
        <ActivityRegistrationView
            mode="preview"
            title={activity.name}
            imagePath={eventImagePathFor(activity)}
            code={referenceCode("ACT", activity.id)}
            organizerName={activity.organizer?.name}
            activities={[activity]}
            activeId={activity.id}
            onSelectActivity={() => {}}
            shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/events/activities/${activity.publicId}`}
            onShareCopied={() => alert("คัดลอกลิงก์สำหรับแชร์ให้บุคคลทั่วไปเรียบร้อยแล้ว!")}
            backHref="/organizer"
        />
    )
}
