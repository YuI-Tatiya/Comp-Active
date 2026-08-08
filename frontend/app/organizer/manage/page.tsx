"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { activitiesAPI, Activity, API_BASE_URL } from "@/lib/api"

// Using Activity from @/lib/api

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: "เปิดรับสมัคร", color: "bg-green-100 text-green-700" },
  closed: { label: "ปิดรับสมัคร", color: "bg-red-100 text-red-700" },
  draft: { label: "ฉบับร่าง", color: "bg-gray-100 text-gray-700" },
  completed: { label: "เสร็จสิ้น", color: "bg-purple-100 text-purple-700" },
}

export default function OrganizerManagePage() {
  const [events, setEvents] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    loadEvents()
  }, [])

  async function loadEvents() {
    try {
      setLoading(true)
      const data = await activitiesAPI.getMy()
      setEvents(Array.isArray(data) ? data : [])
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  const filteredEvents = events.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">จัดการกิจกรรมทั้งหมด</h1>
              <p className="text-gray-600">จัดการ สร้าง และดูข้อมูลกิจกรรมของคุณ</p>
            </div>
            <Link href="/organizer/create" className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2">
              สร้างกิจกรรมใหม่
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-700">กิจกรรมทั้งหมด</p>
              <p className="text-2xl font-bold text-blue-900">{events.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm text-green-700">อนุมัติแล้ว</p>
              <p className="text-2xl font-bold text-green-900">{events.filter(e => e.approvalStatus === "approved").length}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <p className="text-sm text-orange-700">รออนุมัติ</p>
              <p className="text-2xl font-bold text-orange-900">{events.filter(e => e.approvalStatus === "pending_approval").length}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <p className="text-sm text-red-700">ยกเลิกแล้ว</p>
              <p className="text-2xl font-bold text-red-900">{events.filter(e => e.approvalStatus === "rejected").length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="ค้นหากิจกรรม..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <svg className="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <p className="text-gray-600 mb-4">พบ <span className="font-semibold">{filteredEvents.length}</span> กิจกรรม</p>

        {filteredEvents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">

            <h3 className="text-xl font-bold text-gray-800 mb-2">ยังไม่มีกิจกรรม</h3>
            <p className="text-gray-600 mb-6">คุณยังไม่ได้สร้างกิจกรรมใดๆ</p>
            <Link href="/organizer/create" className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">
              สร้างกิจกรรมใหม่
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => {
              const st = statusConfig[event.status] || statusConfig.open
              const progress = event.capacity > 0 ? Math.round(((event.registeredCount ?? 0) / event.capacity) * 100) : 0

              return (
                <div key={event.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                  <div className="h-48 relative overflow-hidden bg-gray-200">
                    {event.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={`${API_BASE_URL}${event.imageUrl}`} alt={event.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-600"></div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className={`${st.color} text-xs px-3 py-1.5 rounded-full font-medium`}>{st.label}</span>
                    </div>
                    <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold shadow-sm ${event.approvalStatus === "approved" ? "bg-green-500 text-white" :
                          event.approvalStatus === "rejected" ? "bg-gray-500 text-white" :
                            "bg-orange-500 text-white"
                        }`}>
                        {event.approvalStatus === "approved" ? "อนุมัติแล้ว" :
                          event.approvalStatus === "rejected" ? "ยกเลิกแล้ว" :
                            "รออนุมัติ"}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2 min-h-[3.5rem]">{event.name}</h3>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2 font-medium"><span>{event.date}</span></div>
                      <div className="flex items-center gap-2 font-medium"><span>{event.startTime} - {event.endTime}</span></div>
                      <div className="flex items-center gap-2 font-medium"><span className="line-clamp-1">{event.location}</span></div>
                    </div>

                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">ผู้ลงทะเบียน</span>
                        <span className="font-semibold">{event.registeredCount ?? 0}/{event.capacity} ({progress}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/organizer/manage/${event.id}/edit`} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 font-medium text-center justify-center flex items-center">แก้ไข</Link>
                      <Link href={`/organizer/events/${event.id}`} className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 font-medium text-center justify-center flex items-center">ดูรายละเอียด</Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div >
        )}
      </div >
    </div >
  )
}
