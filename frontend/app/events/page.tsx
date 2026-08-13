"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { activitiesAPI, Activity, API_BASE_URL } from "@/lib/api"
import { CATEGORIES } from "@/lib/categories"
import { Calendar, MapPin, Users, Loader2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { Container } from "@/components/layout/container"

export default function EventsPage() {
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

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString)
            return new Intl.DateTimeFormat('th-TH', {
                day: 'numeric', month: 'short', year: 'numeric'
            }).format(date)
        } catch {
            return dateString
        }
    }

    return (
        <div className="min-h-screen bg-surface font-sans">
            <SiteHeader />

            {/* Main Content */}
            <Container className="py-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-fg mb-2">กิจกรรมทั้งหมด</h1>
                        <p className="text-fg-muted">ค้นพบกิจกรรมที่คุณสนใจและลงทะเบียนเข้าร่วมได้ทันที (จำเป็นต้องเข้าสู่ระบบ)</p>
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

                {loading ? (
                    <div className="py-32 flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
                        <p className="text-lg text-fg-muted font-medium animate-pulse">กำลังดึงข้อมูลกิจกรรมล่าสุด...</p>
                    </div>
                ) : filteredActivities.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredActivities.map((ev) => (
                            <div key={ev.id} className="bg-bg rounded-2xl overflow-hidden shadow-sm border border-border flex flex-col hover:shadow-xl transition-all duration-300 group hover:-translate-y-1">
                                <div className="h-[200px] bg-surface relative overflow-hidden">
                                    <div className="absolute top-4 right-4 z-10">
                                        <span className={`text-xs font-bold px-4 py-1.5 rounded-full shadow-md backdrop-blur-md text-white ${ev.status === "open" || !ev.status ? "bg-success/90" : "bg-fg-subtle/90"}`}>
                                            {ev.status === "open" || !ev.status ? "กำลังเปิด" : "ปิดรับสมัคร"}
                                        </span>
                                    </div>
                                    {ev.category && (
                                        <div className="absolute top-4 left-4 z-10">
                                            <span className="bg-bg/95 text-brand-700 text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-sm">
                                                {ev.category}
                                            </span>
                                        </div>
                                    )}
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={ev.imageUrl ? `${API_BASE_URL}${ev.imageUrl}` : "/activity-placeholder.jpg"}
                                        alt={ev.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop'; }}
                                    />
                                </div>
                                <div className="p-6 flex-grow flex flex-col">
                                    <h3 className="text-xl font-bold text-fg mb-3 group-hover:text-brand-600 transition-colors line-clamp-2 leading-tight">{ev.name}</h3>
                                    <p className="text-fg-muted text-sm mb-6 line-clamp-2">{ev.description || "ไม่ระบุรายละเอียด"}</p>

                                    <div className="space-y-2 mb-8 mt-auto">
                                        <div className="flex items-center text-sm font-medium text-fg-muted bg-surface px-3 py-2 rounded-lg">
                                            <Calendar className="w-4 h-4 mr-3 text-brand-500" />
                                            {formatDate(ev.date)} • {ev.startTime}
                                        </div>
                                        <div className="flex items-center text-sm font-medium text-fg-muted bg-surface px-3 py-2 rounded-lg">
                                            <MapPin className="w-4 h-4 mr-3 text-danger" />
                                            <span className="truncate">{ev.location}</span>
                                        </div>
                                        <div className="flex items-center text-sm font-medium text-fg-muted bg-surface px-3 py-2 rounded-lg">
                                            <Users className="w-4 h-4 mr-3 text-success" />
                                            {ev.registeredCount || 0} / {ev.capacity} ผู้เข้าร่วม
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mt-auto">
                                        <Link href={`/events/${ev.id}`} className="flex-1">
                                            <Button variant="outline" className="w-full font-bold rounded-xl h-11">ดูรายละเอียด</Button>
                                        </Link>
                                        {/* Both buttons enforce sign in since they're just browsing */}
                                        <Link href={`/auth`} className="flex-1">
                                            <Button className="w-full shadow-md shadow-brand-500/20 font-bold rounded-xl h-11">ลงทะเบียน</Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
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

            <SiteFooter />
        </div>
    )
}
