"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/organizer') {
      return pathname === '/organizer'
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
              <Link href="/organizer" className={`pb-1 transition-colors ${isActive('/organizer') ? 'text-blue-600 font-bold border-b-2 border-blue-600' : 'text-gray-600 font-medium hover:text-blue-600'}`}>หน้าหลัก</Link>
              <Link href="/organizer/manage" className={`pb-1 transition-colors ${isActive('/organizer/manage') ? 'text-blue-600 font-bold border-b-2 border-blue-600' : 'text-gray-600 font-medium hover:text-blue-600'}`}>จัดการกิจกรรม</Link>
              <Link href="/organizer/create" className={`pb-1 transition-colors ${isActive('/organizer/create') ? 'text-blue-600 font-bold border-b-2 border-blue-600' : 'text-gray-600 font-medium hover:text-blue-600'}`}>สร้างกิจกรรม</Link>
              <Link href="/organizer/dashboard" className={`pb-1 transition-colors ${isActive('/organizer/dashboard') ? 'text-blue-600 font-bold border-b-2 border-blue-600' : 'text-gray-600 font-medium hover:text-blue-600'}`}>แดชบอร์ด</Link>
              <Link href="/organizer/about" className={`pb-1 transition-colors ${isActive('/organizer/about') ? 'text-blue-600 font-bold border-b-2 border-blue-600' : 'text-gray-600 font-medium hover:text-blue-600'}`}>เกี่ยวกับเรา</Link>
              <Link href="/organizer/settings" className={`pb-1 transition-colors ${isActive('/organizer/settings') ? 'text-blue-600 font-bold border-b-2 border-blue-600' : 'text-gray-600 font-medium hover:text-blue-600'}`}>ตั้งค่า</Link>

              <div className="bg-orange-50 text-orange-600 px-5 py-1.5 rounded-full text-xs font-bold ring-1 ring-orange-200 uppercase tracking-widest flex items-center gap-2">
                ผู้จัดกิจกรรม <span className="font-normal opacity-70">({user?.name || "ผู้ใช้งาน"})</span>
              </div>

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
