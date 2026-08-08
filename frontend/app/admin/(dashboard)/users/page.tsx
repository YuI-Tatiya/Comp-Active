"use client"

import { useState, useEffect } from "react"
import { Search, MoreVertical, Trash2, Shield, GraduationCap, Megaphone, Ban, CheckCircle, CalendarClock } from "lucide-react"
import { usersAPI, User } from "@/lib/api"

const roleLabels: Record<string, { label: string; icon: React.ElementType; color: string; dot: string }> = {
    student: { label: "นักศึกษา", icon: GraduationCap, color: "rgba(14,165,233,0.12)", dot: "#0ea5e9" },
    organizer: { label: "ผู้จัดกิจกรรม", icon: Megaphone, color: "rgba(224,169,74,0.14)", dot: "#c88e2a" },
    admin: { label: "ผู้ดูแลระบบ", icon: Shield, color: "rgba(37,99,235,0.12)", dot: "#2563eb" },
}

const filters = [
    { key: "all", label: "ทั้งหมด" },
    { key: "student", label: "นักศึกษา" },
    { key: "organizer", label: "ผู้จัดกิจกรรม" },
    { key: "admin", label: "ผู้ดูแลระบบ" },
] as const

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [roleFilter, setRoleFilter] = useState("all")
    const [openMenuId, setOpenMenuId] = useState<number | null>(null)

    useEffect(() => { loadUsers() }, [])

    async function loadUsers() {
        try {
            setLoading(true)
            const data = await usersAPI.getAll()
            setUsers(Array.isArray(data) ? data : [])
        } catch {
            setUsers([])
        } finally {
            setLoading(false)
        }
    }

    const filtered = users.filter((u) => {
        const matchSearch =
            u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchRole = roleFilter === "all" || u.role === roleFilter
        return matchSearch && matchRole
    })

    const roleCounts: Record<string, number> = {
        all: users.length,
        student: users.filter((u) => u.role === "student").length,
        organizer: users.filter((u) => u.role === "organizer").length,
        admin: users.filter((u) => u.role === "admin").length,
    }

    async function handleBlock(userId: number, currentlyBlocked: boolean) {
        try {
            if (currentlyBlocked) {
                await usersAPI.unblockUser(userId)
            } else {
                await usersAPI.blockUser(userId)
            }
            setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isBlocked: !currentlyBlocked } : u)))
        } catch (err) {
            alert(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
        }
        setOpenMenuId(null)
    }

    async function handleDeleteUser(userId: number) {
        if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้นี้?")) return
        try {
            await usersAPI.deleteUser(userId)
            setUsers((prev) => prev.filter((u) => u.id !== userId))
        } catch (err) {
            alert(err instanceof Error ? err.message : "ลบผู้ใช้ไม่สำเร็จ")
        }
    }

    async function handleExtend(userId: number) {
        const input = prompt("ต่ออายุเพิ่มกี่วัน?", "30")
        if (!input) return
        const validDays = Number(input)
        if (!Number.isInteger(validDays) || validDays < 1) {
            alert("กรุณากรอกจำนวนวันเป็นตัวเลขที่มากกว่า 0")
            return
        }
        try {
            const updated = await usersAPI.extendValidity(userId, validDays)
            setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, validUntil: updated.validUntil } : u)))
        } catch (err) {
            alert(err instanceof Error ? err.message : "ต่ออายุไม่สำเร็จ")
        }
        setOpenMenuId(null)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 rounded-full animate-spin" style={{ border: "4px solid #e2e8f0", borderTopColor: "#2563eb" }} />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>จัดการผู้ใช้</h1>
                <p className="text-sm mt-1" style={{ color: "#64748b" }}>ดูและจัดการบัญชีผู้ใช้ทั้งหมด</p>
            </div>

            {/* Search + Filter */}
            <div className="bg-white rounded-2xl p-4" style={{ border: "1px solid #e2e8f0" }}>
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 w-4 h-4" style={{ color: "#64748b" }} />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อหรืออีเมล..."
                            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
                            style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#0f172a" }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {filters.map((f) => {
                            const active = roleFilter === f.key
                            return (
                                <button
                                    key={f.key}
                                    onClick={() => setRoleFilter(f.key)}
                                    className="px-3.5 py-2 text-sm rounded-xl font-medium transition-all"
                                    style={active ? {
                                        background: "#2563eb",
                                        color: "#fff",
                                    } : {
                                        background: "#f1f5f9",
                                        color: "#64748b",
                                        border: "1px solid #e2e8f0",
                                    }}
                                >
                                    {f.label}
                                    <span className="ml-1.5 text-xs opacity-70">({roleCounts[f.key]})</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                                {["ผู้ใช้", "บทบาท", "สถานะ", "รหัส นศ.", "สิทธิ์ Organizer", "จัดการ"].map((h, i, arr) => (
                                    <th key={h} className={`px-6 py-3.5 text-xs font-semibold uppercase tracking-wider ${i === arr.length - 1 ? "text-right" : "text-left"}`} style={{ color: "#64748b" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((u, i) => {
                                const roleInfo = roleLabels[u.role] || roleLabels.student
                                const RoleIcon = roleInfo.icon
                                return (
                                    <tr
                                        key={u.id}
                                        className="transition-colors"
                                        style={{
                                            borderBottom: i < filtered.length - 1 ? "1px solid #f1f5f9" : "none",
                                            opacity: u.isBlocked ? 0.55 : 1,
                                        }}
                                        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#f8fafc" }}
                                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent" }}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: u.isBlocked ? "#94a3b8" : "linear-gradient(135deg,#2563eb,#1d4ed8)" }}>
                                                    {u.name?.[0]?.toUpperCase() || "?"}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-sm" style={{ color: "#0f172a" }}>{u.name}</div>
                                                    <div className="text-xs" style={{ color: "#64748b" }}>{u.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: roleInfo.color, color: roleInfo.dot }}>
                                                <RoleIcon className="w-3 h-3" />
                                                {roleInfo.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.isBlocked ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626" }}>
                                                    <Ban className="w-3 h-3" />ถูกระงับ
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "rgba(63,160,172,0.12)", color: "#3fa0ac" }}>
                                                    <CheckCircle className="w-3 h-3" />ปกติ
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm" style={{ color: "#64748b" }}>{u.studentId || "—"}</td>
                                        <td className="px-6 py-4 text-sm">
                                            {u.role === "organizer" ? (
                                                u.validUntil ? (
                                                    new Date(u.validUntil) < new Date() ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626" }}>
                                                            <CalendarClock className="w-3 h-3" />หมดอายุแล้ว
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: "#64748b" }}>ถึง {new Date(u.validUntil).toLocaleDateString("th-TH", { dateStyle: "medium" })}</span>
                                                    )
                                                ) : <span style={{ color: "#64748b" }}>—</span>
                                            ) : <span style={{ color: "#64748b" }}>—</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right relative">
                                            <button
                                                onClick={() => setOpenMenuId(openMenuId === u.id ? null : u.id)}
                                                className="p-2 rounded-lg transition-colors"
                                                style={{ color: "#64748b" }}
                                                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9" }}
                                                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                            {openMenuId === u.id && (
                                                <div className="absolute right-6 top-12 w-52 bg-white rounded-xl shadow-xl z-20 py-1.5 overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
                                                    {u.role === "organizer" && (
                                                        <>
                                                            <button
                                                                onClick={() => handleExtend(u.id)}
                                                                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors"
                                                                style={{ color: "#2563eb" }}
                                                                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc" }}
                                                                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                                                            >
                                                                <CalendarClock className="w-4 h-4" /> ต่ออายุ
                                                            </button>
                                                            <div style={{ borderTop: "1px solid #f1f5f9", margin: "4px 0" }} />
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => handleBlock(u.id, !!u.isBlocked)}
                                                        className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors"
                                                        style={{ color: u.isBlocked ? "#3fa0ac" : "#dc2626" }}
                                                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc" }}
                                                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                                                    >
                                                        {u.isBlocked
                                                            ? <><CheckCircle className="w-4 h-4" /> ปลดระงับบัญชี</>
                                                            : <><Ban className="w-4 h-4" /> ระงับบัญชี</>
                                                        }
                                                    </button>
                                                    <div style={{ borderTop: "1px solid #f1f5f9", margin: "4px 0" }} />
                                                    <button
                                                        onClick={() => handleDeleteUser(u.id)}
                                                        className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors"
                                                        style={{ color: "#dc2626" }}
                                                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.06)" }}
                                                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        ลบผู้ใช้
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-14 text-center text-sm" style={{ color: "#64748b" }}>ไม่พบผู้ใช้</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-3" style={{ borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
                    <span className="text-xs" style={{ color: "#64748b" }}>แสดง {filtered.length} จาก {users.length} ผู้ใช้</span>
                </div>
            </div>

            {openMenuId !== null && (
                <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
            )}
        </div>
    )
}
