"use client"

import { EventsBrowser } from "@/components/events/events-browser"

// ค่าคงที่ระดับโมดูล — EventsBrowser ใช้เป็น dependency ของ useMemo ถ้าสร้างใหม่ทุก render การ์ดจะถูกประกอบใหม่ทุกครั้ง
const HREFS = {
    event: (id: string) => `/student/events/${id}`,
    activity: (id: string) => `/student/activities/${id}`,
}

/** หน้ารายการกิจกรรมฝั่งนักศึกษา — หน้าตา/ตัวกรองอยู่ใน EventsBrowser (ใช้ร่วมกับ /events) */
export default function StudentEventsPage() {
    return (
        // ไม่ใส่ min-h-screen / SiteHeader / SiteFooter — app/student/layout.tsx จัดการให้แล้ว
        <div className="bg-surface font-sans">
            <EventsBrowser
                prompt="~/comp-active/student $ ls events/"
                subtitle="เลือกงานที่สนใจ กดเข้าไปดูรายละเอียดเพื่อลงทะเบียนเข้าร่วม"
                hrefs={HREFS}
                appBarOnMobile
            />
        </div>
    )
}
