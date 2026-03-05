"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { registrationsAPI } from '@/lib/api'

interface Registration {
  id: number
  status: string
  attendance: string
  registeredAt: string
  evaluation?: unknown
  activity: {
    id: number
    name: string
    date: string
    startTime: string
    endTime: string
    location: string
    category: string
    imageUrl?: string
  }
}

export default function MyRegistrationsPage() {
  const router = useRouter()
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming')
  const [message, setMessage] = useState("")

  useEffect(() => {
    loadRegistrations()
  }, [])

  async function loadRegistrations() {
    try {
      setLoading(true)
      const data = await registrationsAPI.getMy()
      setRegistrations(Array.isArray(data) ? data : [])
    } catch {
      setRegistrations([])
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel(id: number) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะยกเลิกการลงทะเบียน?')) return
    try {
      await registrationsAPI.cancel(id)
      setMessage("ยกเลิกสำเร็จ")
      loadRegistrations()
    } catch (err: unknown) {
      const e = err as Error;
      setMessage(e.message || "ยกเลิกไม่สำเร็จ")
    }
  }

  const filteredRegs = registrations.filter(r => {
    if (activeTab === 'upcoming') return r.status !== 'cancelled' && !r.evaluation
    return r.status === 'cancelled' || r.evaluation
  })

  const upcomingCount = registrations.filter(r => r.status !== 'cancelled' && !r.evaluation).length
  const historyCount = registrations.filter(r => r.status === 'cancelled' || r.evaluation).length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">กำลังโหลดกิจกรรมของคุณ...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1 font-heading">กิจกรรมของฉัน</h1>
              <p className="text-gray-500">ติดตามสถานะการเข้าร่วมและการประเมินผลของคุณ</p>
            </div>
            <button
              onClick={() => router.push('/student/events')}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
            >
              <span>+</span> ค้นหากิจกรรมเพิ่ม
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${message.includes("สำเร็จ") ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
            }`}>
            <span className="text-lg">{message.includes("สำเร็จ") ? "✅" : "❌"}</span>
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-gray-100 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-6 py-2.5 rounded-xl font-semibold transition-all ${activeTab === 'upcoming' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            กิจกรรมเร็วๆ นี้ ({upcomingCount})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2.5 rounded-xl font-semibold transition-all ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            ประวัติและผลการประเมิน ({historyCount})
          </button>
        </div>

        {/* Registration List */}
        <div className="grid grid-cols-1 gap-6">
          {filteredRegs.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center">
              <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl text-gray-300">📋</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">ไม่มีรายการกิจกรรม</h3>
              <p className="text-gray-500 mb-8 max-w-sm mx-auto">คุณยังไม่มีกิจกรรมในหมวดนี้ เริ่มสำรวจกิจกรรมใหม่ๆ ได้เลย!</p>
              <button
                onClick={() => router.push('/student/events')}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-all"
              >
                ไปหน้ากิจกรรม
              </button>
            </div>
          ) : (
            filteredRegs.map((reg) => (
              <div key={reg.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all p-2 pr-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Event Thumbnail */}
                  <div className="w-full md:w-48 h-48 md:h-auto rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 relative">
                    {reg.activity?.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`http://localhost:3001${reg.activity.imageUrl}`}
                        alt={reg.activity.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                        {reg.activity?.category?.[0] || '?'}
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="bg-white/90 backdrop-blur shadow-sm text-blue-700 text-[10px] px-2 py-1 rounded-lg font-bold uppercase tracking-wider">
                        {reg.activity.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 py-4">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className={`text-[11px] px-3 py-1 rounded-full font-bold uppercase tracking-tight shadow-sm border ${reg.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100' :
                        reg.status === 'confirmed' ? 'bg-green-50 text-green-600 border-green-100' :
                          'bg-yellow-50 text-yellow-600 border-yellow-100'
                        }`}>
                        {reg.status === 'cancelled' ? 'ยกเลิกแล้ว' : reg.status === 'confirmed' ? 'ยืนยันแล้ว' : 'รอดำเนินการ'}
                      </span>

                      {reg.status === 'confirmed' && (
                        <span className={`text-[11px] px-3 py-1 rounded-full font-bold uppercase tracking-tight shadow-sm border ${reg.attendance === 'attended' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-gray-50 text-gray-500 border-gray-100'
                          }`}>
                          {reg.attendance === 'attended' ? '✓ เข้าร่วมแล้ว' : 'ยังไม่เข้างาน'}
                        </span>
                      )}

                      {!!reg.evaluation && (
                        <span className="text-[11px] px-3 py-1 rounded-full font-bold uppercase tracking-tight bg-purple-50 text-purple-600 border border-purple-100 shadow-sm flex items-center gap-1">
                          ✨ ประเมินแล้ว
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-4 font-heading">{reg.activity.name}</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-12 mb-6">
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">📅</div>
                        <span className="font-medium">{reg.activity.date}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">📍</div>
                        <span className="font-medium truncate max-w-[150px]">{reg.activity.location}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">⏰</div>
                        <span className="font-medium">{reg.activity.startTime} - {reg.activity.endTime}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-xs opacity-50">#</div>
                        <span className="text-[11px]">ID: {reg.id} • {new Date(reg.registeredAt).toLocaleDateString('th-TH')}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-2">
                      {reg.status !== 'cancelled' && reg.status !== 'confirmed' && (
                        <button
                          onClick={() => handleCancel(reg.id)}
                          className="px-6 py-2 border border-red-200 text-red-500 rounded-xl hover:bg-red-50 font-bold text-xs transition-all"
                        >
                          ยกเลิกกิจกรรม
                        </button>
                      )}

                      <button
                        onClick={() => router.push(`/student/events/${reg.activity.id}`)}
                        className="px-6 py-2 bg-gray-900 text-white rounded-xl hover:bg-black font-bold text-xs transition-all"
                      >
                        ดูรายละเอียดกิจกรรม
                      </button>

                      {!!reg.evaluation && (
                        <button
                          onClick={() => router.push('/student/soft-skills')}
                          className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-purple-200 font-bold text-xs transition-all flex items-center gap-2"
                        >
                          ดูผลประเมิน Soft Skills ✨
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
