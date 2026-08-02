"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { activitiesAPI, Activity, API_BASE_URL } from '@/lib/api'

// ===== CATEGORIES =====
const categories = [
  { id: "all", label: "ทั้งหมด", color: "bg-blue-600" },
  { id: "Technology", label: "เทคโนโลยี", color: "bg-purple-600" },
  { id: "Academic", label: "วิชาการ", color: "bg-green-600" },
  { id: "Sports", label: "กีฬา", color: "bg-orange-600" },
  { id: "Art & Culture", label: "ศิลปะ", color: "bg-pink-600" },
  { id: "Volunteer", label: "อาสาสมัคร", color: "bg-yellow-600" },
  { id: "Competition", label: "การแข่งขัน", color: "bg-indigo-600" },
]

// ===== MAIN COMPONENT =====
export default function EventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  useEffect(() => {
    loadActivities()
  }, [])

  async function loadActivities() {
    try {
      setLoading(true)
      const data = await activitiesAPI.getAll()
      setEvents(Array.isArray(data) ? data as Activity[] : [])
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  // Filter
  const filteredEvents = events.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchCategory = selectedCategory === "all" || e.category === selectedCategory
    return matchSearch && matchCategory
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">กำลังโหลดกิจกรรม...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">ค้นหากิจกรรม</h1>
          <p className="text-gray-600">สำรวจกิจกรรมที่น่าสนใจและเปิดรับสมัครตามความสนใจของคุณ</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search & Filter Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="ค้นหากิจกรรม..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg className="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex gap-2 border border-gray-300 rounded-lg p-1">
              <button onClick={() => setViewMode("grid")} className={`p-2 rounded ${viewMode === "grid" ? "bg-gray-200" : "hover:bg-gray-100"}`}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button onClick={() => setViewMode("list")} className={`p-2 rounded ${viewMode === "list" ? "bg-gray-200" : "hover:bg-gray-100"}`}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === cat.id ? `${cat.color} text-white` : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-600">พบ <span className="font-semibold">{filteredEvents.length} กิจกรรม</span></p>
        </div>

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border-dashed border-2 border-gray-200">
            <h3 className="text-xl font-bold text-gray-800 mb-2 mt-4">ยังไม่มีกิจกรรม</h3>
            <p className="text-gray-600">ยังไม่มีกิจกรรมที่เปิดรับสมัครในขณะนี้</p>
          </div>
        ) : (
          <div className={viewMode === "grid" ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
            {filteredEvents.map((event) => (
              <div key={event.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="h-48 bg-gray-200 relative overflow-hidden">
                  {event.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`${API_BASE_URL}${event.imageUrl}`} alt={event.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600"></div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="bg-green-500 text-white text-xs px-3 py-1.5 rounded-full font-medium">
                      {event.status === 'open' ? 'เปิดรับสมัคร' : event.status}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full font-medium">
                      {event.category}
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2 min-h-[3.5rem]">{event.name}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{event.description}</p>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 sm:items-center">
                      <span className="font-bold whitespace-nowrap w-16">วันที่:</span>
                      <span className="font-medium text-gray-900">{event.date}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 sm:items-center">
                      <span className="font-bold whitespace-nowrap w-16">เวลา:</span>
                      <span className="font-medium text-gray-900">{event.startTime} - {event.endTime}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 sm:items-start">
                      <span className="font-bold whitespace-nowrap w-16 mt-0.5">สถานที่:</span>
                      <span className="font-medium text-gray-900 line-clamp-2">{event.location}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 sm:items-center mt-3 pt-3 border-t border-gray-50">
                      <span className="font-bold whitespace-nowrap w-16">ที่นั่ง:</span>
                      <div className="flex-1 flex flex-col gap-1.5 w-full">
                        <div className="flex justify-between text-xs font-medium">
                          <span>{event.registeredCount ?? 0}/{event.capacity} คน</span>
                          <span>{Math.round(((event.registeredCount ?? 0) / (event.capacity || 1)) * 100)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.round(((event.registeredCount ?? 0) / (event.capacity || 1)) * 100))}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {event.tags && event.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {event.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md font-medium">
                          {tag.tagName}
                        </span>
                      ))}
                      {event.tags.length > 3 && (
                        <span className="text-xs text-gray-400 font-medium">+{event.tags.length - 3}</span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link
                      href={`/student/events/${event.id}`}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 font-medium text-center"
                    >
                      ดูรายละเอียด
                    </Link>
                    <button
                      onClick={() => router.push(`/student/events/${event.id}?register=true`)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-medium"
                    >
                      ลงทะเบียนเข้าร่วม
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
