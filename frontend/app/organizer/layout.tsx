"use client"

import Link from "next/link"
import { useAuth } from "@/lib/auth-context"

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

          {/* Logo + title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">📅</span>
            </div>
            <div>
              <div className="font-semibold">ระบบจัดการกิจกรรม</div>
              <div className="text-xs text-gray-500 -mt-1">
                วิทยาลัยการคอมพิวเตอร์
              </div>
            </div>
          </div>

          {/* Menu */}
          <div className="flex items-center space-x-6 text-sm">

            <Link className="text-blue-600" href="/organizer">หน้าหลัก</Link>
            <Link className="text-gray-700 hover:text-blue-600" href="/organizer/events">กิจกรรมทั้งหมด</Link>
            <Link className="text-gray-700 hover:text-blue-600" href="/organizer/manage">จัดการกิจกรรม</Link>
            <Link className="text-gray-700 hover:text-blue-600" href="/organizer/dashboard">แดชบอร์ดผู้จัด</Link>

            {/* Role Badge */}
            <span className="px-3 py-1 text-xs rounded-full bg-purple-100 text-purple-600 border border-purple-300">
              ผู้จัด
            </span>

            {/* Create event */}
            <Link
              href="/organizer/create"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              + สร้างกิจกรรม
            </Link>

            {/* User Menu */}
            <div className="flex items-center space-x-2 pl-4 border-l border-gray-200">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-xs font-bold text-purple-600">
                {user?.name?.[0] || "O"}
              </div>
              <span className="text-gray-700">{user?.name || "ผู้ใช้งาน"}</span>
              <button
                onClick={logout}
                className="text-sm text-red-500 hover:text-red-700 font-medium"
              >
                ออก
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  );
}
