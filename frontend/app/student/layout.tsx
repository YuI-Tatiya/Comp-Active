"use client"

import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header / Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">S</span>
              </div>
              <span className="font-bold text-gray-800">
                ระบบจัดการกิจกรรม
              </span>
            </div>

            {/* Menu */}
            <div className="flex items-center space-x-6">
              <Link href="/student" className="text-gray-700 hover:text-blue-600">
                หน้าแรก
              </Link>
              <Link href="/student/events" className="text-gray-700 hover:text-blue-600">
                ค้นหากิจกรรม
              </Link>
              <Link href="/student/my-registrations" className="text-gray-700 hover:text-blue-600">
                กิจกรรมของฉัน
              </Link>
              <Link href="/student/soft-skills" className="text-gray-700 hover:text-blue-600">
                Soft Skills
              </Link>

              {/* User Menu */}
              <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
                  {user?.name?.[0] || "U"}
                </div>
                <span className="text-sm text-gray-700">{user?.name || "ผู้ใช้งาน"}</span>
                <button
                  onClick={logout}
                  className="text-sm text-red-500 hover:text-red-700 font-medium"
                >
                  ออกจากระบบ
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  )
}
