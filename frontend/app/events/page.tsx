"use client"

import { EventsBrowser } from "@/components/events/events-browser"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"

// ค่าคงที่ระดับโมดูล — EventsBrowser ใช้เป็น dependency ของ useMemo
const HREFS = {
    event: (id: string) => `/events/${id}`,
    activity: (id: string) => `/events/activities/${id}`,
}

/** หน้ารายการกิจกรรมสาธารณะ — หน้าตาเดียวกับ /student/events (EventsBrowser) ต่างแค่ข้อความสำหรับผู้ที่ยังไม่ได้เข้าสู่ระบบ */
export default function EventsPage() {
    return (
        <div className="flex min-h-screen flex-col bg-surface font-sans">
            <SiteHeader />
            <main className="flex-1">
                <EventsBrowser
                    prompt="~/comp-active $ ls events/"
                    subtitle="สำรวจกิจกรรมของวิทยาลัยการคอมพิวเตอร์ได้โดยไม่ต้องเข้าสู่ระบบ หากต้องการลงทะเบียนเข้าร่วมและสะสมคะแนน Soft Skills กรุณาเข้าสู่ระบบด้วยบัญชีนักศึกษา"
                    hrefs={HREFS}
                />
            </main>
            <SiteFooter />
        </div>
    )
}
