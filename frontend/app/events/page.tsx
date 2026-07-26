"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { activitiesAPI, Activity, API_BASE_URL } from "@/lib/api"
import { Calendar, MapPin, Users, Loader2, Search, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function EventsPage() {
    const [activities, setActivities] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")

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

    // Filter activities by search query
    const filteredActivities = activities.filter(a =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.category && a.category.toLowerCase().includes(searchQuery.toLowerCase()))
    )

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
        <div className="min-h-screen bg-[#F8FAFC] font-sans">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        {/* Logo area */}
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shrink-0 overflow-hidden shadow-md">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/logo.png" alt="Logo" className="w-full h-full object-cover fallback-bg" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerText = 'CP'; }} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700 leading-tight">ระบบจัดการกิจกรรม</span>
                                <span className="text-sm text-gray-500 font-medium leading-tight">วิทยาลัยการคอมพิวเตอร์</span>
                            </div>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-8">
                            <Link href="/" className="text-gray-600 font-medium hover:text-blue-600 transition-colors">หน้าหลัก</Link>
                            <Link href="/events" className="text-blue-600 font-bold border-b-2 border-blue-600 pb-1">กิจกรรมทั้งหมด</Link>
                            <Link href="/about" className="text-gray-600 font-medium hover:text-blue-600 transition-colors">เกี่ยวกับเรา</Link>

                            <div className="bg-blue-50 text-blue-700 px-5 py-1.5 rounded-full text-xs font-bold ring-1 ring-blue-200 uppercase tracking-widest">
                                ทั่วไป
                            </div>

                            <Link href="/auth">
                                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-8 shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 font-bold">
                                    เข้าสู่ระบบ
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 mb-2">กิจกรรมทั้งหมด</h1>
                        <p className="text-slate-500">ค้นพบกิจกรรมที่คุณสนใจและลงทะเบียนเข้าร่วมได้ทันที (จำเป็นต้องเข้าสู่ระบบ)</p>
                    </div>

                    <div className="w-full md:w-auto flex gap-3">
                        <div className="relative flex-grow md:w-80">
                            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                            <Input
                                type="text"
                                placeholder="ค้นหากิจกรรม..."
                                className="pl-10 h-12 rounded-xl bg-white border-slate-200 shadow-sm focus-visible:ring-indigo-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" className="h-12 w-12 p-0 rounded-xl bg-white shadow-sm border-slate-200 shrink-0 text-slate-600">
                            <Filter className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="py-32 flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                        <p className="text-lg text-slate-500 font-medium animate-pulse">กำลังดึงข้อมูลกิจกรรมล่าสุด...</p>
                    </div>
                ) : filteredActivities.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredActivities.map((ev) => (
                            <div key={ev.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 flex flex-col hover:shadow-xl transition-all duration-300 group hover:-translate-y-1">
                                <div className="h-[200px] bg-slate-100 relative overflow-hidden">
                                    <div className="absolute top-4 right-4 z-10">
                                        <span className={`text-xs font-bold px-4 py-1.5 rounded-full shadow-md backdrop-blur-md ${ev.status === "open" || !ev.status ? "bg-green-500/90 text-white" : "bg-slate-500/90 text-white"}`}>
                                            {ev.status === "open" || !ev.status ? "กำลังเปิด" : "ปิดรับสมัคร"}
                                        </span>
                                    </div>
                                    {ev.category && (
                                        <div className="absolute top-4 left-4 z-10">
                                            <span className="bg-white/95 text-blue-700 text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-sm">
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
                                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">{ev.name}</h3>
                                    <p className="text-slate-500 text-sm mb-6 line-clamp-2">{ev.description || "ไม่ระบุรายละเอียด"}</p>

                                    <div className="space-y-2 mb-8 mt-auto">
                                        <div className="flex items-center text-sm font-medium text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
                                            <Calendar className="w-4 h-4 mr-3 text-blue-500" />
                                            {formatDate(ev.date)} • {ev.startTime}
                                        </div>
                                        <div className="flex items-center text-sm font-medium text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
                                            <MapPin className="w-4 h-4 mr-3 text-rose-500" />
                                            <span className="truncate">{ev.location}</span>
                                        </div>
                                        <div className="flex items-center text-sm font-medium text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
                                            <Users className="w-4 h-4 mr-3 text-emerald-500" />
                                            {ev.registeredCount || 0} / {ev.capacity} ผู้เข้าร่วม
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mt-auto">
                                        <Link href={`/events/${ev.id}`} className="flex-1">
                                            <Button variant="outline" className="w-full bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-bold rounded-xl h-11">ดูรายละเอียด</Button>
                                        </Link>
                                        {/* Both buttons enforce sign in since they're just browsing */}
                                        <Link href={`/auth`} className="flex-1">
                                            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 font-bold rounded-xl h-11">ลงทะเบียน</Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-32 text-center bg-white rounded-3xl border border-slate-200 shadow-sm mt-8">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Search className="w-10 h-10 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">ไม่พบกิจกรรมที่ค้นหา</h3>
                        <p className="text-slate-500">ลองใช้คำค้นหาอื่น หรือรอกิจกรรมใหม่เปิดรับสมัครเร็วๆ นี้</p>
                        <Button variant="outline" className="mt-6 rounded-full px-8" onClick={() => setSearchQuery("")}>
                            ล้างการค้นหา
                        </Button>
                    </div>
                )}
            </div>

            {/* Simplified Footer for inner pages */}
            <footer className="bg-white border-t border-slate-200 py-10 mt-20">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-slate-500 font-medium">© {new Date().getFullYear()} College of Computing, Khon Kaen University.</p>
                </div>
            </footer>
        </div>
    )
}
