"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/student') {
      return pathname === '/student'
    }
    return pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Unified Navbar identical to Root Page */}
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
              <Link href="/student" className={`pb-1 transition-colors ${isActive('/student') ? 'text-blue-600 font-bold border-b-2 border-blue-600' : 'text-gray-600 font-medium hover:text-blue-600'}`}>หน้าหลัก</Link>
              <Link href="/student/events" className={`pb-1 transition-colors ${isActive('/student/events') ? 'text-blue-600 font-bold border-b-2 border-blue-600' : 'text-gray-600 font-medium hover:text-blue-600'}`}>กิจกรรมทั้งหมด</Link>
              <Link href="/student/my-registrations" className={`pb-1 transition-colors ${isActive('/student/my-registrations') ? 'text-blue-600 font-bold border-b-2 border-blue-600' : 'text-gray-600 font-medium hover:text-blue-600'}`}>กิจกรรมของฉัน</Link>
              <Link href="/student/about" className={`pb-1 transition-colors ${isActive('/student/about') ? 'text-blue-600 font-bold border-b-2 border-blue-600' : 'text-gray-600 font-medium hover:text-blue-600'}`}>เกี่ยวกับเรา</Link>

              <Link href="/student/profile" className={`px-5 py-1.5 rounded-full text-xs font-bold uppercase ring-1 ring-blue-200 tracking-widest flex items-center gap-2 transition-colors ${isActive('/student/profile') ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                นักศึกษา <span className={`font-normal opacity-70 ${isActive('/student/profile') ? 'text-blue-100' : ''}`}>({user?.name || "ผู้ใช้งาน"})</span>
              </Link>

              <Button
                onClick={logout}
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl px-4 shadow-sm font-bold"
              >
                <LogOut className="w-4 h-4 mr-2" />
                ออกจากระบบ
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  )
}
