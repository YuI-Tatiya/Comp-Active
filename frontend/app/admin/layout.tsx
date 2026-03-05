"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import {
    LayoutDashboard,
    Users,
    CalendarCheck,
    ClipboardList,
    LogOut,
    Shield,
    AlertOctagon,
} from "lucide-react"

const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "จัดการผู้ใช้", href: "/admin/users", icon: Users },
    { label: "อนุมัติกิจกรรม", href: "/admin/activities", icon: CalendarCheck },
    { label: "รอยกเลิก", href: "/admin/cancellations", icon: AlertOctagon },
    { label: "กิจกรรมทั้งหมด", href: "/admin/all-activities", icon: ClipboardList },
]

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const { user, logout } = useAuth()

    return (
        <div className="min-h-screen flex">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-900 text-white flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="font-bold text-sm">CP Check</div>
                            <div className="text-xs text-gray-400">Admin Panel</div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 px-3 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? "bg-blue-600/20 text-blue-400"
                                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                {/* User */}
                <div className="p-4 border-t border-gray-800">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {user?.name?.[0] || "A"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{user?.name || "Admin"}</div>
                            <div className="text-xs text-gray-500 truncate">{user?.email || ""}</div>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        ออกจากระบบ
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 bg-gray-50 overflow-auto">
                {children}
            </main>
        </div>
    )
}
