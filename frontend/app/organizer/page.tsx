"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Calendar, Users, Clock, Plus, LayoutDashboard,
  BarChart3, CheckCircle2, ArrowRight,
  Target, Zap, Settings, XCircle
} from "lucide-react"
import Link from "next/link"
import { activitiesAPI } from "@/lib/api"

interface OrganizerStats {
  totalActivities: number;
  activeActivities: number;
  totalRegistrations: number;
  pendingApprovals: number;
}

interface Activity {
  id: number;
  name: string;
  category: string;
  imageUrl: string | null;
  date: string;
  registeredCount?: number;
  capacity: number;
  approvalStatus: string;
  status: string;
}

export default function OrganizerPage() {
  const [stats, setStats] = useState<OrganizerStats>({
    totalActivities: 0,
    activeActivities: 0,
    totalRegistrations: 0,
    pendingApprovals: 0
  })
  const [recentActivities, setRecentActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [statsData, activities] = await Promise.all([
        activitiesAPI.getOrganizerStats().catch(() => ({
          totalActivities: 0,
          activeActivities: 0,
          totalRegistrations: 0,
          pendingApprovals: 0
        })),
        activitiesAPI.getMy().catch(() => [])
      ])
      setStats(statsData as OrganizerStats)
      setRecentActivities((Array.isArray(activities) ? activities.slice(0, 3) : []) as Activity[])
    } catch (err) {
      console.error("Failed to load organizer data:", err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: "กิจกรรมทั้งหมด",
      value: stats.totalActivities,
      icon: <Calendar className="w-6 h-6" />,
      color: "blue",
      description: "กิจกรรมที่คุณสร้างสร้างขึ้น"
    },
    {
      title: "ผู้ลงทะเบียนรวม",
      value: stats.totalRegistrations.toLocaleString(),
      icon: <Users className="w-6 h-6" />,
      color: "green",
      description: "นักศึกษาที่ร่วมกิจกรรม"
    },
    {
      title: "รอการอนุมัติ",
      value: stats.pendingApprovals,
      icon: <Clock className="w-6 h-6" />,
      color: "orange",
      description: "กิจกรรมที่รอ Admin ตรวจสอบ"
    },
    {
      title: "กิจกรรมที่ออนไลน์",
      value: stats.activeActivities,
      icon: <CheckCircle2 className="w-6 h-6" />,
      color: "indigo",
      description: "ได้รับการอนุมัติและเปิดรับ"
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFE]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium font-heading tracking-wide">กำลังเตรียมข้อมูลจัดการของคุณ...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDFCFE] pb-20">
      {/* Upper Hero Section */}
      <section className="relative pt-16 pb-24 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,_rgba(79,70,229,0.05)_0%,_transparent_50%)]"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,_rgba(59,130,246,0.05)_0%,_transparent_50%)]"></div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em]">
                Organizer Command Center
              </div>
              <h1 className="text-4xl lg:text-5xl font-black text-gray-900 leading-tight tracking-tight">
                ยกระดับการจัดการ <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">
                  กิจกรรมอย่างมืออาชีพ
                </span>
              </h1>
              <p className="text-lg text-gray-500 leading-relaxed font-medium">
                ติดตามประสิทธิภาพ วิเคราะห์สถิติ และบริหารจัดการผู้เข้าร่วมแบบ Real-time ในที่เดียว
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 rounded-2xl text-lg font-bold shadow-xl shadow-indigo-200 transition-all hover:-translate-y-1" asChild>
                <Link href="/organizer/create"><Plus className="mr-2 w-5 h-5" /> สร้างกิจกรรมใหม่</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 border-gray-200 bg-white hover:bg-gray-50 rounded-2xl text-lg font-bold text-gray-700 transition-all" asChild>
                <Link href="/organizer/manage"><LayoutDashboard className="mr-2 w-5 h-5" /> จัดการกิจกรรม</Link>
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {statCards.map((stat, i) => (
              <Card key={i} className="group border-none shadow-sm hover:shadow-xl transition-all duration-500 rounded-[32px] overflow-hidden bg-white p-8">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-500 bg-${stat.color}-50 text-${stat.color}-600`}>
                  {stat.icon}
                </div>
                <div className="space-y-1">
                  <div className="text-4xl font-black text-gray-900 tracking-tight">{stat.value}</div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{stat.title}</h3>
                </div>
                <p className="mt-4 text-xs text-gray-500 font-medium leading-relaxed">{stat.description}</p>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Recent Activities Feed */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between px-4">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">กิจกรรมล่าสุดของคุณ</h2>
                <Link href="/organizer/manage" className="text-sm font-bold text-indigo-600 hover:underline">ดูทั้งหมด →</Link>
              </div>

              {recentActivities.length === 0 ? (
                <Card className="border-dashed border-2 bg-gray-50/50 rounded-[32px] p-20 text-center">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Zap className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-900 font-bold text-lg">ยังไม่มีกิจกรรมที่สร้าง</p>
                  <p className="text-sm text-gray-500 mb-8 mt-2">เริ่มสร้างกิจกรรมแรกเพื่อรับสมัครนักศึกษาได้ทันที</p>
                  <Button className="bg-indigo-600 rounded-xl px-8 font-bold" asChild>
                    <Link href="/organizer/create">สร้างกิจกรรมแรก</Link>
                  </Button>
                </Card>
              ) : (
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <Card key={activity.id} className="border-none shadow-sm hover:shadow-md transition-all rounded-[24px] overflow-hidden bg-white p-2 pr-6">
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-2xl bg-gray-100 overflow-hidden flex-shrink-0">
                          {activity.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`http://localhost:3001${activity.imageUrl}`}
                              alt={activity.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-indigo-500 flex items-center justify-center text-white text-xl font-bold">
                              {activity.name[0]}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="text-[9px] font-black uppercase tracking-wider py-0.5 px-2 bg-indigo-50 text-indigo-600 border-none">
                              {activity.category}
                            </Badge>
                            <span className="text-[10px] text-gray-400 font-bold">{activity.date}</span>
                          </div>
                          <h4 className="font-bold text-gray-900 truncate">{activity.name}</h4>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                              <Users className="w-3.5 h-3.5 text-indigo-400" />
                              {activity.registeredCount || 0}/{activity.capacity}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                              {(() => {
                                const appr = activity.approvalStatus
                                const stat = activity.status
                                if (appr === 'pending_cancel') return <><XCircle className="w-3.5 h-3.5 text-red-400" /> รอยืนยันยกเลิก</>
                                if (appr === 'rejected') return <><XCircle className="w-3.5 h-3.5 text-red-500" /> ถูกปฏิเสธ</>
                                if (appr === 'approved' && stat === 'completed') return <><CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /> เสร็จสิ้น</>
                                if (appr === 'approved' && stat === 'closed') return <><CheckCircle2 className="w-3.5 h-3.5 text-gray-400" /> ปิดรับสมัคร</>
                                if (appr === 'approved') return <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> อนุมัติแล้ว</>
                                return <><Clock className="w-3.5 h-3.5 text-orange-400" /> รอการอนุมัติ</>
                              })()}
                            </div>
                          </div>
                        </div>
                        <Link href={`/organizer/events/${activity.id}`}>
                          <Button variant="ghost" className="w-10 h-10 rounded-xl p-0 hover:bg-indigo-50 text-indigo-600">
                            <ArrowRight className="w-5 h-5" />
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions / Tips */}
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight px-4">Insights & Tools</h2>

              <Card className="border-none shadow-xl shadow-indigo-500/5 rounded-[32px] bg-indigo-900 text-white p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full -mr-16 -mt-16 blur-xl"></div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                    <Target className="w-6 h-6 text-indigo-200" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">เพิ่มการมองเห็น</h3>
                  <p className="text-indigo-200 text-sm leading-relaxed mb-6">
                    กิจกรรมที่มีภาพประกอบสวยงามและรายละเอียดชัดเจน มีโอกาสถูกคลิกดูมากกว่า 2.5 เท่า
                  </p>
                  <Button variant="outline" className="w-full border-white/20 bg-white/10 hover:bg-white text-white hover:text-indigo-900 font-bold rounded-xl border-none">
                    อ่านคำแนะนำ
                  </Button>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card className="border-none shadow-sm rounded-[24px] bg-white p-6 hover:shadow-md transition-shadow cursor-not-allowed opacity-60">
                  <Settings className="w-6 h-6 text-gray-400 mb-4" />
                  <h4 className="font-bold text-gray-900 text-sm">การตั้งค่า</h4>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">Settings</p>
                </Card>
                <Card className="border-none shadow-sm rounded-[24px] bg-white p-6 hover:shadow-md transition-shadow cursor-not-allowed opacity-60">
                  <BarChart3 className="w-6 h-6 text-gray-400 mb-4" />
                  <h4 className="font-bold text-gray-900 text-sm">รีพอร์ต</h4>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">Reports</p>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
