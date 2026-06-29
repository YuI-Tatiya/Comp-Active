"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { activitiesAPI, Activity } from '@/lib/api'

// ===== TYPES =====
interface Event {
  id: number
  title: string
  description: string
  date: string
  time: string
  location: string
  seats: string
  category: string
  status: string
  tags: string[]
  image: string
}

// Local types removed, using Activity from @/lib/api

interface Category {
  id: string
  label: string
  color: string
}

const categories: Category[] = [
  { id: "all", label: "ทั้งหมด", color: "bg-blue-600" },
  { id: "tech", label: "เทคโนโลยี", color: "bg-purple-600" },
  { id: "academic", label: "วิชาการ", color: "bg-green-600" },
  { id: "sport", label: "กีฬา", color: "bg-orange-600" },
  { id: "art", label: "ศิลปะ", color: "bg-pink-600" },
  { id: "volunteer", label: "อาสาสมัคร", color: "bg-yellow-600" },
  { id: "social", label: "กิจกรรมสังคม", color: "bg-indigo-600" }
]

// ===== MAIN COMPONENT =====
export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSort] = useState("latest")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [eventsData, setEventsData] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const data: Activity[] = await activitiesAPI.getAll()

      const formattedEvents: Event[] = data.map(item => ({
        id: item.id,
        title: item.name,
        description: item.description,
        date: item.date,
        time: `${item.startTime}-${item.endTime}`,
        location: item.location,
        seats: item.registrations ? `เหลือที่นั่ง: ${item.capacity - item.registrations.length}/${item.capacity} ที่` : `ความจุ: ${item.capacity} ที่`,
        category: item.category,
        status: item.approvalStatus === 'approved' ? (item.status === 'open' ? 'เปิดรับสมัคร' : 'ปิดรับสมัคร') : 'รออนุมัติ',
        tags: item.tags ? item.tags.map(t => t.tagName) : [],
        image: item.imageUrl ? `http://localhost:3001${item.imageUrl}` : "/images/event-placeholder.jpg"
      }))

      setEventsData(formattedEvents)
    } catch (error) {
      console.error("Failed to fetch events:", error)
    } finally {
      setLoading(false)
    }
  }

  // Filter & Sort logic
  const filteredEvents = eventsData
    .filter(event => (selectedCategory === "all" || event.category === selectedCategory))
    .filter(event => (event.title.toLowerCase().includes(searchQuery.toLowerCase()) || event.description.toLowerCase().includes(searchQuery.toLowerCase())))
    .sort((a, b) => {
      if (sortBy === 'latest') return b.id - a.id
      if (sortBy === 'date') return new Date(a.date).getTime() - new Date(b.date).getTime()
      return 0
    })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            ค้นหากิจกรรม
          </h1>
          <p className="text-gray-600">
            สำรวจกิจกรรมที่น่าสนใจและเปิดรับสมัครตามความสนใจของคุณ
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search & Filter Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          {/* Search Bar */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="ค้นหากิจกรรม ตามชื่อ คีย์เวิร์ด หรือหัวข้อ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg className="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSort(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="latest">ล่าสุด</option>
              <option value="popular">ยอดนิยม</option>
              <option value="date">วันที่จัด</option>
            </select>

            {/* View Mode Toggles */}
            <div className="flex gap-2 border border-gray-300 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded ${viewMode === "grid" ? "bg-gray-200" : "hover:bg-gray-100"}`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded ${viewMode === "list" ? "bg-gray-200" : "hover:bg-gray-100"}`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === cat.id
                  ? `${cat.color} text-white`
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-600">
            พบ <span className="font-semibold">{filteredEvents.length} กิจกรรม</span>
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          /* Events Grid/List */
          <div className={viewMode === "grid" ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} viewMode={viewMode} />
              ))
            ) : (
              <div className="col-span-full text-center py-12 bg-white rounded-lg shadow-sm">
                <p className="text-gray-500">ไม่พบกิจกรรมที่ตรงกับการค้นหา</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ===== EVENT CARD COMPONENT =====
function EventCard({ event, viewMode }: { event: Event; viewMode: "grid" | "list" }) {
  if (viewMode === "list") {
    return (
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 flex gap-6">
        {/* Image */}
        <div className="w-48 h-32 bg-gray-200 rounded-lg flex-shrink-0 relative overflow-hidden">
          {event.image && event.image !== "/images/event-placeholder.jpg" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600"></div>
          )}
          <div className="absolute top-2 left-2">
            <span className={`text-white text-xs px-3 py-1 rounded-full font-medium ${event.status === 'เปิดรับสมัคร' ? 'bg-green-500' : 'bg-gray-500'}`}>
              {event.status}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="mb-2">
            <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
              {event.category}
            </span>
          </div>

          <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-1">
            {event.title}
          </h3>

          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {event.description}
          </p>

          <div className="space-y-1 text-sm text-gray-600 mb-3">
            <div className="flex items-center gap-2">
              <span>📅</span>
              <span>{event.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>⏰</span>
              <span>{event.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📍</span>
              <span>{event.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>👥</span>
              <span>{event.seats}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {event.tags.map((tag, index) => (
                <span key={index} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <Link
                href={`/organizer/events/${event.id}`}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                ดูรายละเอียด
              </Link>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                สมัครเลย
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Grid View
  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Image */}
      <div className="h-48 bg-gray-200 relative overflow-hidden">
        {event.image && event.image !== "/images/event-placeholder.jpg" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600"></div>
        )}
        <div className="absolute top-3 left-3">
          <span className={`text-white text-xs px-3 py-1.5 rounded-full font-medium ${event.status === 'เปิดรับสมัคร' ? 'bg-green-500' : 'bg-gray-500'}`}>
            {event.status}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <span className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full font-medium">
            {event.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2 min-h-[3.5rem]">
          {event.title}
        </h3>

        <p className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
          {event.description}
        </p>

        <div className="space-y-2 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-2">
            <span>📅</span>
            <span>{event.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>⏰</span>
            <span>{event.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>📍</span>
            <span className="line-clamp-1">{event.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>👥</span>
            <span>{event.seats}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {event.tags.slice(0, 3).map((tag, index) => (
            <span key={index} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <Link
            href={`/organizer/events/${event.id}`}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 font-medium text-center"
          >
            ดูรายละเอียด
          </Link>
          <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-medium">
            สมัครเลย
          </button>
        </div>
      </div>
    </div>
  )
}
