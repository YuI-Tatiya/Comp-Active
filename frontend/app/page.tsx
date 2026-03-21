"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { activitiesAPI, Activity } from "@/lib/api"
import { Calendar, MapPin, Users, Loader2 } from "lucide-react"

export default function RootPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string>("")

  useEffect(() => {
    loadActivities(category)
  }, [category])

  async function loadActivities(cat: string) {
    try {
      setLoading(true)
      const data = await activitiesAPI.getAll(cat ? { category: cat } : undefined)
      // Show only up to 3 for the recommended section
      setActivities(Array.isArray(data) ? data.slice(0, 3) : [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Helper date formatter
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

  const categoryMap = [
    { label: "เทคโนโลยี", value: "Technology" },
    { label: "วิชาการ", value: "Academic" },
    { label: "การแข่งขัน", value: "Competition" },
    { label: "อาสาสมัคร", value: "Volunteer" },
  ]

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
              <Link href="/" className="text-blue-600 font-bold border-b-2 border-blue-600 pb-1">หน้าหลัก</Link>
              <Link href="/events" className="text-gray-600 font-medium hover:text-blue-600 transition-colors">กิจกรรมทั้งหมด</Link>
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

      {/* Hero Banner Section */}
      <section className="w-full h-[400px] md:h-[550px] relative overflow-hidden bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-banner.png"
          alt="Hero Banner"
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </section>

      {/* Recommended Activities Section */}
      <section className="max-w-7xl mx-auto px-4 py-20 relative -mt-20 z-10">
        <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 p-8 md:p-12 border border-slate-100">
          <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl font-black text-gray-900 mb-2">กิจกรรมแนะนำ</h2>
              <div className="h-1 w-20 bg-blue-600 rounded-full mb-4"></div>
              <p className="text-gray-500 font-medium">กิจกรรมยอดนิยมที่กำลังเปิดรับสมัคร</p>
            </div>
            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategory("")}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${category === "" ? "bg-slate-900 text-white shadow-md shadow-slate-900/20" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                ทั้งหมด
              </button>
              {categoryMap.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${category === cat.value ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
              <p className="text-slate-500 font-medium animate-pulse">กำลังโหลดกิจกรรม...</p>
            </div>
          ) : activities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {activities.map((ev) => (
                <div key={ev.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-slate-100 flex flex-col transition-all duration-300 group hover:-translate-y-1">
                  <div className="h-[220px] bg-slate-100 relative overflow-hidden">
                    <div className="absolute top-4 right-4 z-10">
                      <span className={`text-xs font-bold px-4 py-1.5 rounded-full shadow-md backdrop-blur-md ${ev.status === "open" || !ev.status ? "bg-green-500/90 text-white" : "bg-slate-500/90 text-white"}`}>
                        {ev.status === "open" || !ev.status ? "กำลังเปิด" : "ปิดรับสมัคร"}
                      </span>
                    </div>
                    <div className="absolute top-4 left-4 z-10">
                      <span className="bg-white/95 text-blue-700 text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-sm">
                        {ev.category}
                      </span>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ev.imageUrl ? `http://localhost:3001${ev.imageUrl}` : "/activity-placeholder.jpg"}
                      alt={ev.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop'; }}
                    />
                  </div>
                  <div className="p-6 flex-grow flex flex-col">
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">{ev.name}</h3>
                    <p className="text-slate-500 text-sm mb-6 line-clamp-2">{ev.description || "ไม่ระบุรายละเอียด"}</p>

                    <div className="space-y-2 mb-6 mt-auto">
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

                    <div className="flex gap-3">
                      <Link href={`/auth`} className="flex-1">
                        <Button variant="outline" className="w-full bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-bold rounded-xl h-11">ดูรายละเอียด</Button>
                      </Link>
                      <Link href={`/auth`} className="flex-1">
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 font-bold rounded-xl h-11">ลงทะเบียน</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center bg-slate-50 rounded-[24px] border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Calendar className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-bold text-lg">ไม่พบกิจกรรมในหมวดหมู่นี้</p>
            </div>
          )}
        </div>
      </section>

      {/* Categories Grid (More visual) */}
      <section className="py-24 bg-white relative">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">สำรวจตามความสนใจ</h2>
          <p className="text-slate-500 max-w-2xl mx-auto mb-16 text-lg font-medium">พัฒนาก้าวหน้าอย่างตรงจุดตามเป้าหมายของตัวคุณ เลือกเข้าร่วมกิจกรรมที่ช่วยเติมเต็มศักยภาพ Soft Skills ได้โดยตรง</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {categoryMap.map((cat, i) => {
              const styles = [
                { color: "text-blue-600", bg: "bg-blue-50/50", border: "hover:border-blue-300", shadow: "hover:shadow-blue-500/10" },
                { color: "text-indigo-600", bg: "bg-indigo-50/50", border: "hover:border-indigo-300", shadow: "hover:shadow-indigo-500/10" },
                { color: "text-amber-600", bg: "bg-amber-50/50", border: "hover:border-amber-300", shadow: "hover:shadow-amber-500/10" },
                { color: "text-emerald-600", bg: "bg-emerald-50/50", border: "hover:border-emerald-300", shadow: "hover:shadow-emerald-500/10" }
              ];
              const style = styles[i % styles.length];

              return (
                <div
                  key={cat.value}
                  onClick={() => { setCategory(cat.value); window.scrollTo({ top: 500, behavior: 'smooth' }); }}
                  className={`group bg-white rounded-[24px] p-6 cursor-pointer border border-slate-200 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${style.shadow} flex flex-col items-start justify-between min-h-[160px] relative overflow-hidden`}
                >
                  <div className={`absolute -right-6 -bottom-6 w-32 h-32 rounded-full opacity-20 transition-transform duration-500 group-hover:scale-150 ${style.bg.replace('/50', '')}`}></div>

                  <div className="relative z-10 w-full flex justify-between items-start">
                    <span className={`text-2xl font-black text-slate-800 transition-colors`}>{cat.label}</span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0 ${style.bg.replace('/50', '')} ${style.color}`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </div>
                  </div>

                  <div className="relative z-10 mt-auto">
                    <span className="text-sm font-semibold text-slate-400 group-hover:text-slate-600 transition-colors">สำรวจกิจกรรม</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Ready Section */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-24 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">พร้อมสะสมความสำเร็จหรือยัง?</h2>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">เริ่มสร้างโปรไฟล์ของคุณวันนี้ และบันทึกทุกก้าวของการเติบโต</p>
          <Button size="lg" className="bg-white hover:bg-slate-100 text-slate-900 font-black rounded-xl px-10 h-16 text-lg shadow-2xl shadow-white/10" asChild>
            <Link href="/auth">สมัครสมาชิกเลย</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-300 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16 border-b border-slate-800 pb-16">
            <div className="md:col-span-2 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shrink-0 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-cover fallback-bg" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerText = 'CP'; }} />
                </div>
                <span className="text-2xl font-bold text-white tracking-tight">ระบบจัดการกิจกรรม</span>
              </div>
              <p className="text-slate-400 max-w-sm">แพลตฟอร์มศูนย์กลางสำหรับการเข้าร่วมและจัดการกิจกรรมของนักศึกษา เพื่อส่งเสริมการพัฒนาศักยภาพอย่างรอบด้าน</p>
              <div className="h-16 w-auto relative flex items-center mt-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/computing-logo.png" alt="College of Computing Logo" className="h-full object-contain filter brightness-200 contrast-150 grayscale" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-[10px] font-bold -z-10 text-center">COLLEGE OF<br />COMPUTING<br /><span className="text-[8px] font-normal">KHON KAEN UNIVERSITY</span></div>
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 text-lg">เมนูหลัก</h4>
              <ul className="space-y-4 font-medium">
                <li><Link href="/" className="hover:text-white hover:underline transition-colors">หน้าหลัก</Link></li>
                <li><Link href="/events" className="hover:text-white hover:underline transition-colors">กิจกรรมทั้งหมด</Link></li>
                <li><Link href="/about" className="hover:text-white hover:underline transition-colors">เกี่ยวกับแอปพลิเคชัน</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 text-lg">ติดต่อเรา</h4>
              <ul className="space-y-4 font-medium">
                <li>วิทยาลัยการคอมพิวเตอร์ ขอนแก่น</li>
                <li>อีเมล: info@computing.kku.ac.th</li>
                <li>โทร: 043-000-000</li>
              </ul>
            </div>
          </div>

          <div className="text-center md:text-left flex flex-col md:flex-row justify-between items-center text-sm font-medium text-slate-500">
            <p>&copy; {new Date().getFullYear()} College of Computing, Khon Kaen University. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
