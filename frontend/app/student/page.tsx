"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Calendar, Users, Award, TrendingUp, ArrowRight, Zap, Target, Sparkles, BookOpen } from "lucide-react"
import Link from "next/link"
import { activitiesAPI, evaluationsAPI } from "@/lib/api"

interface SkillBadge {
  name: string;
  icon: string;
}

interface MySkills {
  level: number;
  points: number;
  badges: SkillBadge[];
  count: number;
  average: Record<string, number>;
}

interface Activity {
  id: number;
  name: string;
  category: string;
  imageUrl: string | null;
  registeredCount?: number;
  capacity: number;
}

export default function StudentPage() {
  const [platformStats, setPlatformStats] = useState({ totalActivities: 0, totalParticipants: 0 })
  const [mySkills, setMySkills] = useState<MySkills | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [pStats, skills, acts] = await Promise.all([
        activitiesAPI.getPlatformStats().catch(() => ({ totalActivities: 0, totalParticipants: 0 })),
        evaluationsAPI.getMySkills().catch(() => null),
        activitiesAPI.getAll().catch(() => [])
      ])
      setPlatformStats(pStats)
      setMySkills(skills as MySkills)
      setActivities((Array.isArray(acts) ? acts.slice(0, 3) : []) as Activity[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium animate-pulse">กำลังเตรียมพื้นฐานความสำเร็จของคุณ...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-transparent to-transparent opacity-70"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-400/5 rounded-full blur-[120px]"></div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-blue-600 text-sm font-bold animate-in fade-in slide-in-from-bottom-4">
                <Sparkles className="w-4 h-4" />
                Next-Gen Extra-Curricular Platform
              </div>

              <h1 className="text-5xl lg:text-7xl font-black text-gray-900 leading-[1.1] tracking-tight">
                ปลดล็อกศักยภาพ <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                  สู่ความสำเร็จ
                </span>
              </h1>

              <p className="text-xl text-gray-500 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                ค้นพบกิจกรรมที่คัดสรรมาเพื่อพัฒนาทักษะ Soft Skills และสะสมประสบการณ์ที่มากกว่าแค่ในห้องเรียน
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                <Button size="lg" className="h-14 px-8 bg-blue-600 hover:bg-blue-700 rounded-2xl text-lg font-bold shadow-xl shadow-blue-200 transition-all hover:-translate-y-1" asChild>
                  <Link href="/student/events">สำรวจกิจกรรม <ArrowRight className="ml-2 w-5 h-5" /></Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 border-gray-200 bg-white hover:bg-gray-50 rounded-2xl text-lg font-bold text-gray-700 transition-all" asChild>
                  <Link href="/student/my-registrations">กิจกรรมของฉัน</Link>
                </Button>
              </div>

              <div className="flex items-center justify-center lg:justify-start gap-8 pt-8">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="user" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-blue-600 flex items-center justify-center text-[10px] text-white font-bold">
                    +{platformStats.totalParticipants > 1000 ? (platformStats.totalParticipants / 1000).toFixed(1) + 'k' : platformStats.totalParticipants}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  <span className="text-gray-900 font-bold">{platformStats.totalParticipants.toLocaleString()}</span> นักศึกษาเข้าร่วมแล้ว
                </div>
              </div>
            </div>

            <div className="relative animate-in zoom-in duration-700">
              {mySkills ? (
                /* Logged In View: My Stats */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="border-none shadow-2xl shadow-blue-500/10 rounded-[32px] overflow-hidden bg-gradient-to-br from-white to-blue-50/30 p-8">
                    <div className="text-blue-600 bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                      <Award className="w-6 h-6" />
                    </div>
                    <div className="text-4xl font-black text-gray-900 mb-1">LV. {mySkills.level}</div>
                    <div className="text-sm text-gray-500 font-bold uppercase tracking-wider">Your Mastery Level</div>
                    <div className="mt-6">
                      <div className="flex justify-between text-xs font-bold mb-2">
                        <span className="text-blue-600">Progress to Next Level</span>
                        <span>{Math.round((mySkills.points % 500) / 5)}%</span>
                      </div>
                      <Progress value={(mySkills.points % 500) / 5} className="h-2 bg-blue-100" />
                    </div>
                  </Card>

                  <Card className="border-none shadow-2xl shadow-purple-500/10 rounded-[32px] overflow-hidden bg-gradient-to-br from-white to-purple-50/30 p-8">
                    <div className="text-purple-600 bg-purple-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div className="text-4xl font-black text-gray-900 mb-1">{mySkills.points.toLocaleString()}</div>
                    <div className="text-sm text-gray-500 font-bold uppercase tracking-wider">Skill Points Earned</div>
                    <div className="mt-8 flex gap-2">
                      {mySkills.badges.slice(0, 3).map((badge, i) => (
                        <div key={i} className="text-2xl bg-white w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border border-purple-100" title={badge.name}>
                          {badge.icon}
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="sm:col-span-2 border-none shadow-2xl shadow-green-500/10 rounded-[32px] overflow-hidden bg-white p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Soft Skills Overview</h3>
                        <p className="text-sm text-gray-500">ค่าเฉลี่ยทักษะจากการประเมิน {mySkills.count} กิจกรรม</p>
                      </div>
                      <Link href="/student/soft-skills">
                        <Button variant="ghost" className="text-green-600 font-bold hover:bg-green-50 rounded-xl">ดูรายละเอียด <ArrowRight className="ml-1 w-4 h-4" /></Button>
                      </Link>
                    </div>

                    <div className="space-y-5">
                      {Object.entries(mySkills.average).map(([key, val]) => (
                        <div key={key}>
                          <div className="flex justify-between text-xs font-bold mb-1.5 capitalize">
                            <span>{key}</span>
                            <span>{val}/10</span>
                          </div>
                          <Progress value={val * 10} className="h-1.5 bg-gray-50 [&>div]:bg-green-500" />
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              ) : (
                /* Public View: Platform Stats */
                <div className="relative group">
                  <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[40px] opacity-10 blur-2xl group-hover:opacity-20 transition-opacity"></div>
                  <div className="bg-white rounded-[40px] shadow-2xl p-10 relative border border-gray-100">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <div className="w-14 h-14 bg-blue-50 rounded-[22px] flex items-center justify-center text-blue-600 mb-4">
                          <Calendar className="w-7 h-7" />
                        </div>
                        <div className="text-4xl font-black text-gray-900">{platformStats.totalActivities}+</div>
                        <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Active Events</div>
                      </div>
                      <div className="space-y-2">
                        <div className="w-14 h-14 bg-indigo-50 rounded-[22px] flex items-center justify-center text-indigo-600 mb-4">
                          <Users className="w-7 h-7" />
                        </div>
                        <div className="text-4xl font-black text-gray-900">{platformStats.totalParticipants > 1000 ? (platformStats.totalParticipants / 1000).toFixed(1) + 'k' : platformStats.totalParticipants}</div>
                        <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Active Users</div>
                      </div>
                      <div className="space-y-2">
                        <div className="w-14 h-14 bg-purple-50 rounded-[22px] flex items-center justify-center text-purple-600 mb-4">
                          <Target className="w-7 h-7" />
                        </div>
                        <div className="text-4xl font-black text-gray-900">100%</div>
                        <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Goal Oriented</div>
                      </div>
                      <div className="space-y-2">
                        <div className="w-14 h-14 bg-green-50 rounded-[22px] flex items-center justify-center text-green-600 mb-4">
                          <TrendingUp className="w-7 h-7" />
                        </div>
                        <div className="text-4xl font-black text-gray-900">24/7</div>
                        <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Skill Growth</div>
                      </div>
                    </div>

                    <div className="mt-12 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-blue-600">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">พร้อมสะสมทักษะหรือยัง?</p>
                          <p className="text-xs text-gray-500">ลงทะเบียนเพื่อบันทึกประวัติการพัฒนา</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions / Featured Section */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl font-black text-gray-900 mb-2 font-heading">กิจกรรมแนะนำสำหรับคุณ</h2>
              <p className="text-gray-500 underline decoration-blue-200 underline-offset-4">กิจกรรมยอดนิยมที่มีผู้เข้าร่วมสูงสุดสัปดาห์นี้</p>
            </div>
            <Link href="/student/events">
              <Button variant="ghost" className="font-bold text-blue-600 hover:bg-blue-50">ดูทั้งหมด <ArrowRight className="ml-2 w-4 h-4" /></Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {activities.length > 0 ? (
              activities.map((ev, i) => (
                <Card key={i} className="group border-none shadow-sm hover:shadow-2xl transition-all duration-500 rounded-[32px] overflow-hidden bg-white">
                  <div className="aspect-[4/3] relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ev.imageUrl ? `http://localhost:3001${ev.imageUrl}` : "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&auto=format&fit=crop"}
                      alt={ev.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-white/90 backdrop-blur text-blue-600 border-none font-bold uppercase text-[10px] py-1 px-3 rounded-full">{ev.category}</Badge>
                    </div>
                  </div>
                  <CardContent className="p-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 group-hover:text-blue-600 transition-colors truncate">{ev.name}</h3>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                        <Users className="w-4 h-4" /> {ev.registeredCount || 0} Joined
                      </div>
                      <Link href={`/student/events/${ev.id}`}>
                        <Button variant="outline" className="rounded-xl border-gray-100 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">Details</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-3 py-20 text-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
                <p className="text-gray-400 font-bold text-lg">ขณะนี้ยังไม่มีกิจกรรมที่เปิดรับสมัคร</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
