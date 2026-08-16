"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Container } from "@/components/layout/container"
import {
    EventCard,
    EventCardBadge,
    EventCardRow,
    formatEventDate,
} from "@/components/ui/event-card"
import { activitiesAPI, Activity } from "@/lib/api"
import { CATEGORIES } from "@/lib/categories"
import { Calendar, MapPin, Users, Loader2, Search } from "lucide-react"

/** หน้ารายการกิจกรรมฝั่งนักศึกษา — การ์ดใช้ <EventCard> ร่วมกับหน้ารายการอื่น */
export default function StudentEventsPage() {
    const [activities, setActivities] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [category, setCategory] = useState("")

    useEffect(() => {
        loadActivities()
    }, [])

    async function loadActivities() {
        try {
            setLoading(true)
            const data = await activitiesAPI.getAll()
            setActivities(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    // Filter activities by search query and selected category
    const filteredActivities = activities.filter(a => {
        const matchesSearch =
            a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (a.category && a.category.toLowerCase().includes(searchQuery.toLowerCase()))
        const matchesCategory = !category || a.category === category
        return matchesSearch && matchesCategory
    })

    return (
        // ไม่ใส่ min-h-screen / SiteHeader / SiteFooter — app/student/layout.tsx จัดการให้แล้ว
        <div className="bg-surface font-sans">
            <Container className="py-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-fg mb-2">กิจกรรมทั้งหมด</h1>
                        <p className="text-fg-muted">เลือกกิจกรรมที่สนใจและลงทะเบียนเข้าร่วมได้ทันที</p>
                    </div>

                    <div className="w-full md:w-auto">
                        <div className="relative md:w-80">
                            <Search className="absolute left-3 top-3.5 h-4 w-4 text-fg-subtle" />
                            <Input
                                type="text"
                                placeholder="ค้นหากิจกรรม..."
                                className="pl-10 h-12 rounded-xl shadow-sm focus-visible:ring-brand-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* ตัวกรองหมวดหมู่ — คลิกเพื่อดูกิจกรรมตามหมวดหมู่ */}
                <div className="flex flex-wrap gap-2 mb-10">
                    <button
                        type="button"
                        onClick={() => setCategory("")}
                        aria-pressed={category === ""}
                        className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${category === ""
                            ? "border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-500/20"
                            : "border-border bg-bg text-fg-muted hover:border-border-strong hover:bg-surface"
                            }`}
                    >
                        ทั้งหมด
                    </button>
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.value}
                            type="button"
                            onClick={() => setCategory(cat.value)}
                            aria-pressed={category === cat.value}
                            className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${category === cat.value
                                ? "border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-500/20"
                                : "border-border bg-bg text-fg-muted hover:border-border-strong hover:bg-surface"
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* จำนวนผลลัพธ์ — ซ่อนตอนโหลดเพื่อไม่ให้เห็นเลข 0 วูบหนึ่ง */}
                {!loading && (
                    <p className="mb-4 text-sm text-fg-muted">
                        พบ <span className="font-semibold text-fg">{filteredActivities.length}</span> กิจกรรม
                    </p>
                )}

                {loading ? (
                    <div className="py-32 flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
                        <p className="text-lg text-fg-muted font-medium animate-pulse">กำลังดึงข้อมูลกิจกรรมล่าสุด...</p>
                    </div>
                ) : filteredActivities.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredActivities.map((ev) => (
                            <EventCard
                                key={ev.id}
                                activity={ev}
                                description={ev.description}
                                badgeLeft={
                                    ev.category ? (
                                        <EventCardBadge variant="light">{ev.category}</EventCardBadge>
                                    ) : undefined
                                }
                                badgeRight={
                                    <EventCardBadge
                                        className={ev.status === "open" || !ev.status ? "bg-success/90" : "bg-fg-subtle/90"}
                                    >
                                        {ev.status === "open" || !ev.status ? "กำลังเปิด" : "ปิดรับสมัคร"}
                                    </EventCardBadge>
                                }
                                actions={
                                    // ต่างจาก /events ตรงนี้: ล็อกอินแล้ว จึงลิงก์เข้าหน้ารายละเอียดของโซน student ได้เลย
                                    <>
                                        <Link href={`/student/events/${ev.id}`} className="flex-1">
                                            <Button variant="outline" className="w-full font-bold rounded-xl h-11">ดูรายละเอียด</Button>
                                        </Link>
                                        <Link href={`/student/events/${ev.id}?register=true`} className="flex-1">
                                            <Button className="w-full shadow-md shadow-brand-500/20 font-bold rounded-xl h-11">ลงทะเบียน</Button>
                                        </Link>
                                    </>
                                }
                            >
                                <EventCardRow icon={Calendar} tone="brand">
                                    {formatEventDate(ev.date)} • {ev.startTime}
                                </EventCardRow>
                                <EventCardRow icon={MapPin} tone="danger">
                                    <span className="truncate">{ev.location}</span>
                                </EventCardRow>
                                <EventCardRow icon={Users} tone="success">
                                    {ev.registeredCount || 0} / {ev.capacity} ผู้เข้าร่วม
                                </EventCardRow>
                            </EventCard>
                        ))}
                    </div>
                ) : (
                    <div className="py-32 text-center bg-bg rounded-3xl border border-border shadow-sm mt-8">
                        <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-6">
                            <Search className="w-10 h-10 text-fg-subtle" />
                        </div>
                        <h3 className="text-xl font-bold text-fg mb-2">ไม่พบกิจกรรมที่ค้นหา</h3>
                        <p className="text-fg-muted">ลองใช้คำค้นหาอื่น เลือกหมวดหมู่อื่น หรือรอกิจกรรมใหม่เปิดรับสมัครเร็วๆ นี้</p>
                        <Button
                            variant="outline"
                            className="mt-6 rounded-full px-8"
                            onClick={() => { setSearchQuery(""); setCategory("") }}
                        >
                            ล้างตัวกรอง
                        </Button>
                    </div>
                )}
            </Container>
        </div>
    )
}
