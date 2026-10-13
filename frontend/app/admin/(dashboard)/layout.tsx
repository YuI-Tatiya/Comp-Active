"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { organizerRequestsAPI } from "@/lib/api"
import { LayoutDashboard, Users, CalendarDays, LogOut, ClipboardList, UserPlus, Loader2 } from "lucide-react"

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const { user, isLoading, logout } = useAuth()
    const [showConfirm, setShowConfirm] = useState(false)
    const [loggingOut, setLoggingOut] = useState(false)
    const [pendingCount, setPendingCount] = useState(0)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const authorized = !isLoading && !!user && user.role === "admin"

    useEffect(() => {
        if (!isLoading && !authorized) {
            router.replace("/login")
        }
    }, [isLoading, authorized, router])

    useEffect(() => {
        if (!authorized) return
        async function fetchCount() {
            try {
                const count = await organizerRequestsAPI.getPendingCount()
                setPendingCount(typeof count === "number" ? count : 0)
            } catch {
                // silently ignore
            }
        }
        fetchCount()
        intervalRef.current = setInterval(fetchCount, 60_000)
        return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    }, [authorized])

    if (!authorized) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: "#eef3fa" }}>
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#1f3a63" }} />
            </div>
        )
    }

    const navItems = [
        { label: "Dashboard", href: "/", icon: LayoutDashboard, badge: 0 },
        { label: "จัดการผู้ใช้", href: "/users", icon: Users, badge: 0 },
        { label: "คำขอ Organizer", href: "/organizer-requests", icon: ClipboardList, badge: pendingCount },
        { label: "กิจกรรมทั้งหมด", href: "/all-activities", icon: CalendarDays, badge: 0 },
        { label: "จัดการทีม Admin", href: "/team", icon: UserPlus, badge: 0 },
    ]

    async function handleLogout() {
        setLoggingOut(true)
        await logout()
    }

    return (
        <div className="min-h-screen flex">
            <aside className="denim-weave-deep w-64 flex flex-col shrink-0 font-plex">
                {/* Brand */}
                <div className="px-6 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex flex-col leading-tight">
                        <span className="font-display text-xl font-bold text-white">
                            Comp<span className="text-amber">Active</span>
                        </span>
                        <div className="font-code text-xs" style={{ color: "#a9c0e2" }}>admin.panel</div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-5 px-3 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                                style={isActive ? {
                                    background: "rgba(232,163,58,0.14)",
                                    color: "#e8a33a",
                                    paddingLeft: "14px",
                                    borderLeft: "3px solid #e8a33a",
                                } : {
                                    color: "#a9c0e2",
                                    paddingLeft: "16px",
                                }}
                                onMouseEnter={(e) => { if (!isActive) { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLAnchorElement).style.color = "#fff" } }}
                                onMouseLeave={(e) => { if (!isActive) { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; (e.currentTarget as HTMLAnchorElement).style.color = "#a9c0e2" } }}
                            >
                                <Icon className="shrink-0" style={{ width: "18px", height: "18px" }} />
                                <span className="flex-1">{item.label}</span>
                                {item.badge > 0 && (
                                    <span
                                        className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center"
                                        style={{ background: "#e53e3e", color: "#fff", fontSize: "11px" }}
                                    >
                                        {item.badge > 99 ? "99+" : item.badge}
                                    </span>
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* User info */}
                <div className="p-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex items-center gap-3 px-2 mb-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-sm shrink-0 bg-amber text-denim-deep">
                            {user?.name?.[0]?.toUpperCase() || "A"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-white truncate">{user?.name || "Admin"}</div>
                            <div className="text-xs truncate" style={{ color: "#a9c0e2" }}>{user?.email || ""}</div>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowConfirm(true)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all"
                        style={{ color: "#a9c0e2" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.15)"; (e.currentTarget as HTMLButtonElement).style.color = "#fca5a5" }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#a9c0e2" }}
                    >
                        <LogOut className="w-4 h-4" />
                        ออกจากระบบ
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-auto" style={{ background: "#eef3fa" }}>
                {children}
            </main>

            {/* Logout popup */}
            {(showConfirm || loggingOut) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(18,34,61,0.6)", backdropFilter: "blur(4px)" }}>
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
                        {/* Top bar */}
                        <div className="checker-strip h-2" aria-hidden="true" />

                        <div className="p-8 flex flex-col items-center text-center">
                            {loggingOut ? (
                                /* Loading state */
                                <>
                                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: "rgba(31,58,99,0.1)" }}>
                                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1f3a63" }} />
                                    </div>
                                    <h3 className="text-lg font-bold mb-1.5" style={{ color: "#12223d" }}>กำลังออกจากระบบ</h3>
                                    <p className="text-sm" style={{ color: "#5f6f87" }}>โปรดรอสักครู่...</p>
                                </>
                            ) : (
                                /* Confirm state */
                                <>
                                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: "rgba(239,68,68,0.08)" }}>
                                        <LogOut className="w-7 h-7" style={{ color: "#dc2626" }} />
                                    </div>
                                    <h3 className="text-lg font-bold mb-1.5" style={{ color: "#12223d" }}>ออกจากระบบ?</h3>
                                    <p className="text-sm mb-7" style={{ color: "#5f6f87" }}>คุณต้องการออกจากระบบ Comp Active ใช่หรือไม่</p>
                                    <div className="flex gap-3 w-full">
                                        <button
                                            onClick={() => setShowConfirm(false)}
                                            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                                            style={{ border: "1px solid #dce4f0", color: "#5f6f87" }}
                                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f2f5fa" }}
                                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                                        >
                                            ยกเลิก
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
                                            style={{ background: "linear-gradient(135deg,#dc2626,#b91c1c)" }}
                                        >
                                            ออกจากระบบ
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
