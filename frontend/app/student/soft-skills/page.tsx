"use client"

import { useState, useEffect } from "react"
import { evaluationsAPI, SkillsData } from "@/lib/api"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts'
import {
  Trophy,
  Target,
  Zap,
  Users,
  MessageSquare,
  Lightbulb,
  RefreshCcw,
  Award,
  ChevronRight,
  Sparkles
} from "lucide-react"
import Link from "next/link"

export default function SoftSkillsPage() {
  const [data, setData] = useState<SkillsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    fetchSkills()
  }, [])

  async function fetchSkills() {
    try {
      const res = await evaluationsAPI.getMySkills()
      setData(res)
    } catch (err) {
      console.error("Failed to fetch skills:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 font-medium animate-pulse">กำลังประมวลผลทักษะของคุณ...</p>
        </div>
      </div>
    )
  }

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center bg-white p-8 rounded-2xl shadow-sm max-w-md">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">ไม่พบข้อมูลทักษะ</h2>
        <p className="text-gray-600 mb-6">เริ่มเข้าร่วมกิจกรรมเพื่อสะสมทักษะและคะแนนของคุณได้เลย!</p>
        <Link href="/student/events" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
          ดูเวิร์กชอปที่น่าสนใจ
        </Link>
      </div>
    </div>
  )

  const chartData = [
    { subject: 'การทำงานเป็นทีม', A: data.average.teamwork, fullMark: 10 },
    { subject: 'ภาวะผู้นำ', A: data.average.leadership, fullMark: 10 },
    { subject: 'การสื่อสาร', A: data.average.communication, fullMark: 10 },
    { subject: 'การแก้ปัญหา', A: data.average.problemSolving, fullMark: 10 },
    { subject: 'การปรับตัว', A: data.average.adaptability, fullMark: 10 },
  ]

  // Progress to next level
  const prevLevelPoints = (data.level - 1) * 500
  const currentLevelPoints = data.points - prevLevelPoints
  const pointsNeededForNext = 500
  const progressPercent = Math.min(100, (currentLevelPoints / pointsNeededForNext) * 100)

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Premium Header */}
      <div className="bg-[#0f172a] text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-600/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-1/4 h-full bg-purple-600/10 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2"></div>

        <div className="max-w-7xl mx-auto px-6 pb-28 pt-16 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
                <Sparkles className="w-3 h-3" /> Soft Skills Matrix
              </div>
              <h1 className="text-4xl md:text-5xl font-black mb-3">พัฒนาทักษะชีวิต <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">แบบมือโปร</span></h1>
              <p className="text-gray-400 max-w-lg text-lg">ติดตามและวิเคราะห์ทักษะนอกห้องเรียนของคุณด้วยระบบ AI Matrix และ Gamification ที่ทันสมัยที่สุด</p>
            </div>

            <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-blue-500/20">
                🚀
              </div>
              <div>
                <div className="text-sm text-gray-400 font-medium">ระดับปัจจุบัน</div>
                <div className="text-2xl font-bold">Level {data.level}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-16 space-y-8 relative z-20">
        {/* Level & Points Card */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 p-8 flex flex-col md:flex-row items-center gap-10">
            <div className="relative w-40 h-40 flex-shrink-0 group">
              <div className="absolute inset-0 bg-blue-50 rounded-full flex items-center justify-center border-4 border-white shadow-inner">
                <div className="text-center">
                  <span className="block text-4xl font-black text-blue-600">Lv.{data.level}</span>
                  <span className="text-[10px] font-bold text-blue-400 uppercase">Explorer</span>
                </div>
              </div>
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="74"
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="10"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="74"
                  fill="transparent"
                  stroke="url(#blue-gradient)"
                  strokeWidth="12"
                  strokeDasharray={2 * Math.PI * 74}
                  strokeDashoffset={2 * Math.PI * 74 * (1 - progressPercent / 100)}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="blue-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="flex-1 w-full text-center md:text-left">
              <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-4 gap-2">
                <div>
                  <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">XP Points Earnings</h3>
                  <div className="text-4xl font-black text-slate-900 tracking-tight">{data.points.toLocaleString()} <span className="text-lg font-medium text-slate-300">PTS</span></div>
                </div>
                <div className="text-sm font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                  {currentLevelPoints} / 500 XP
                </div>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000 shadow-sm"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl font-bold">
                  <Trophy className="w-4 h-4" /> เก่งมาก! คุณอยู่ในอันดับ Top 15%
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 p-8 flex flex-col justify-center items-center text-center group border border-transparent hover:border-blue-100 transition-all">
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-500">
              <Trophy className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-slate-500 font-bold text-sm uppercase tracking-wider mb-2">สะสมจากการเข้าร่วม</h3>
            <div className="text-5xl font-black text-slate-900 mb-1">{data.count} <span className="text-lg font-bold text-slate-300">กิจกรรม</span></div>
            <div className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-200 cursor-pointer hover:bg-blue-700 transition-colors">
              ประวัติการประเมิน
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Radar Chart Section */}
          <div className="bg-white rounded-[2rem] shadow-lg shadow-slate-200/50 p-8 h-[500px] flex flex-col border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <Target className="w-5 h-5 text-indigo-600" />
                </div>
                Soft Skills Matrix
              </h3>
              <div className="flex gap-1">
                {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 bg-slate-200 rounded-full"></div>)}
              </div>
            </div>

            <div className="flex-1 w-full -ml-4">
              {isClient && (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                    <PolarGrid stroke="#f1f5f9" strokeWidth={2} />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: '#64748b', fontSize: 13, fontWeight: 700 }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 10]}
                      tick={false}
                      axisLine={false}
                    />
                    <Radar
                      name="ทักษะของคุณ"
                      dataKey="A"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      fill="#6366f1"
                      fillOpacity={0.15}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '20px',
                        border: 'none',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                        padding: '12px 16px',
                        fontWeight: 'bold'
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Badges Section */}
          <div className="bg-white rounded-[2rem] shadow-lg shadow-slate-200/50 p-8 flex flex-col border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Award className="w-5 h-5 text-amber-600" />
              </div>
              ความสำเร็จและเหรียญรางวัล
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              {data.badges.map((badge, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-3xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-md hover:border-blue-100 transition-all group overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500/5 rounded-full translate-x-1/2 -translate-y-1/2"></div>
                  <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-500 z-10 font-noto">
                    {badge.icon}
                  </div>
                  <div className="z-10">
                    <h4 className="font-bold text-slate-900 text-sm leading-tight">{badge.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider">{badge.description}</p>
                  </div>
                </div>
              ))}
              {data.badges.length < 4 && Array(4 - data.badges.length).fill(0).map((_, i) => (
                <div key={`empty-${i}`} className="flex items-center gap-4 p-4 rounded-3xl bg-slate-50/50 border border-dashed border-slate-200 opacity-40">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-2xl grayscale">
                    🔒
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-300 text-sm">Locked</h4>
                    <p className="text-[10px] text-slate-300 font-bold uppercase mt-1">Participate more</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-5">
              {[
                { label: 'การทำงานเป็นทีม', val: data.average.teamwork, icon: <Users className="w-4 h-4 text-blue-500" />, color: "bg-blue-500" },
                { label: 'ภาวะผู้นำ', val: data.average.leadership, icon: <Zap className="w-4 h-4 text-amber-500" />, color: "bg-amber-500" },
                { label: 'การสื่อสาร', val: data.average.communication, icon: <MessageSquare className="w-4 h-4 text-emerald-500" />, color: "bg-emerald-500" },
                { label: 'การแก้ปัญหา', val: data.average.problemSolving, icon: <Lightbulb className="w-4 h-4 text-purple-500" />, color: "bg-purple-500" },
                { label: 'การปรับตัว', val: data.average.adaptability, icon: <RefreshCcw className="w-4 h-4 text-pink-500" />, color: "bg-pink-500" },
              ].map((item, i) => (
                <div key={i} className="group">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-3 text-sm font-bold text-slate-700 transition-colors group-hover:text-slate-900">
                      <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all border border-slate-100">
                        {item.icon}
                      </div>
                      {item.label}
                    </div>
                    <span className="text-sm font-black text-slate-900">{item.val} <span className="text-slate-300 font-medium">/ 10</span></span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all duration-1000`} style={{ width: `${item.val * 10}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">บันทึกประวัติทักษะรายกิจกรรม</h3>
              <p className="text-sm text-slate-400 font-medium mt-1">รายละเอียดคะแนนประเมินที่ได้รับจากการเข้าร่วมกิจกรรมจริง</p>
            </div>
            <div className="bg-slate-50 p-2 rounded-2xl border border-slate-100">
              <Link href="/student/my-registrations" className="text-sm font-bold text-blue-600 hover:text-blue-700 px-4 py-2 flex items-center gap-2">
                ดูประวัติทั้งหมด <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-xs font-black uppercase tracking-[0.15em]">
                  <th className="px-8 py-5">Activity Details</th>
                  <th className="px-4 py-5 text-center">TMW</th>
                  <th className="px-4 py-5 text-center">LDR</th>
                  <th className="px-4 py-5 text-center">COM</th>
                  <th className="px-4 py-5 text-center">PRB</th>
                  <th className="px-4 py-5 text-center">ADP</th>
                  <th className="px-8 py-5 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium overflow-hidden">
                {data.history.map((h) => (
                  <tr key={h.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{h.activityName}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Verified Evaluation</div>
                    </td>
                    <td className="px-4 py-6 text-center"><ScoreBadge score={h.scores.teamwork} /></td>
                    <td className="px-4 py-6 text-center"><ScoreBadge score={h.scores.leadership} /></td>
                    <td className="px-4 py-6 text-center"><ScoreBadge score={h.scores.communication} /></td>
                    <td className="px-4 py-6 text-center"><ScoreBadge score={h.scores.problemSolving} /></td>
                    <td className="px-4 py-6 text-center"><ScoreBadge score={h.scores.adaptability} /></td>
                    <td className="px-8 py-6 text-right text-sm text-slate-500 font-mono italic">
                      {new Date(h.date).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 8
    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
    : score >= 5
      ? "bg-blue-50 text-blue-600 border-blue-100"
      : "bg-slate-50 text-slate-500 border-slate-100"

  return (
    <div className={`w-10 h-10 mx-auto rounded-xl border flex items-center justify-center text-sm font-black shadow-sm ${color} transition-all hover:scale-110 hover:shadow-md cursor-default`}>
      {score}
    </div>
  )
}
