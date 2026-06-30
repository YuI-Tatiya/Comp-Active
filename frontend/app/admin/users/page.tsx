"use client"

import { useState, useEffect } from "react"
import {
    Search, MoreVertical, Trash2, Shield, GraduationCap, Megaphone,
    Ban, CheckCircle, KeyRound, X, Copy, Check,
} from "lucide-react"
import { usersAPI, User } from "@/lib/api"

const roleLabels: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    student: { label: "นักศึกษา", color: "bg-sky-50 text-sky-600 border-sky-200", icon: GraduationCap },
    organizer: { label: "ผู้จัดกิจกรรม", color: "bg-amber-50 text-amber-600 border-amber-200", icon: Megaphone },
    admin: { label: "ผู้ดูแลระบบ", color: "bg-indigo-50 text-indigo-600 border-indigo-200", icon: Shield },
}

interface GeneratedResult {
    name: string
    email: string
    generatedPassword: string
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [roleFilter, setRoleFilter] = useState("all")
    const [openMenuId, setOpenMenuId] = useState<number | null>(null)

    // Generate password modal
    const [genEmail, setGenEmail] = useState("")
    const [genLoading, setGenLoading] = useState(false)
    const [genResult, setGenResult] = useState<GeneratedResult | null>(null)
    const [showGenModal, setShowGenModal] = useState(false)
    const [copied, setCopied] = useState(false)

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

    const roleCounts = {
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
            setUsers((prev) =>
                prev.map((u) => (u.id === userId ? { ...u, isBlocked: !currentlyBlocked } : u)),
            )
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

    async function handleGeneratePassword() {
        if (!genEmail.trim()) return
        setGenLoading(true)
        try {
            const result = await usersAPI.generatePassword(genEmail.trim())
            setGenResult(result)
        } catch (err) {
            alert(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
        } finally {
            setGenLoading(false)
        }
    }

    function closeGenModal() {
        setShowGenModal(false)
        setGenEmail("")
        setGenResult(null)
        setCopied(false)
    }

    function handleCopy(text: string) {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">จัดการผู้ใช้</h1>
                    <p className="text-slate-500 mt-1 text-sm">ดูและจัดการบัญชีผู้ใช้ทั้งหมด</p>
                </div>
                <button
                    onClick={() => setShowGenModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                    <KeyRound className="w-4 h-4" />
                    สร้างรหัสผ่าน Organizer
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อหรืออีเมล..."
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {(["all", "student", "organizer", "admin"] as const).map((role) => (
                            <button
                                key={role}
                                onClick={() => setRoleFilter(role)}
                                className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${roleFilter === role
                                    ? "bg-indigo-600 text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                            >
                                {role === "all" ? "ทั้งหมด" : roleLabels[role]?.label}
                                <span className="ml-1.5 text-xs opacity-75">({roleCounts[role]})</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3.5">ผู้ใช้</th>
                                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3.5">บทบาท</th>
                                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3.5">สถานะ</th>
                                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3.5">รหัส นศ.</th>
                                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3.5">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map((u) => {
                                const roleInfo = roleLabels[u.role] || roleLabels.student
                                const RoleIcon = roleInfo.icon
                                return (
                                    <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${u.isBlocked ? "opacity-60" : ""}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${u.isBlocked ? "bg-slate-400" : "bg-gradient-to-br from-indigo-400 to-indigo-600"}`}>
                                                    {u.name?.[0] || "?"}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900 text-sm">{u.name}</div>
                                                    <div className="text-xs text-slate-500">{u.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${roleInfo.color}`}>
                                                <RoleIcon className="w-3 h-3" />
                                                {roleInfo.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.isBlocked ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">
                                                    <Ban className="w-3 h-3" />
                                                    ถูกระงับ
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
                                                    <CheckCircle className="w-3 h-3" />
                                                    ปกติ
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">{u.studentId || "-"}</td>
                                        <td className="px-6 py-4 text-right relative">
                                            <button
                                                onClick={() => setOpenMenuId(openMenuId === u.id ? null : u.id)}
                                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                            >
                                                <MoreVertical className="w-4 h-4 text-slate-400" />
                                            </button>
                                            {openMenuId === u.id && (
                                                <div className="absolute right-6 top-12 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1.5 overflow-hidden">
                                                    <button
                                                        onClick={() => handleBlock(u.id, !!u.isBlocked)}
                                                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2.5 ${u.isBlocked ? "text-emerald-600" : "text-red-600"}`}
                                                    >
                                                        {u.isBlocked
                                                            ? <><CheckCircle className="w-4 h-4" /> ปลดระงับบัญชี</>
                                                            : <><Ban className="w-4 h-4" /> ระงับบัญชี</>
                                                        }
                                                    </button>
                                                    <div className="border-t border-slate-100 my-1" />
                                                    <button
                                                        onClick={() => handleDeleteUser(u.id)}
                                                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5"
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
                                    <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">ไม่พบผู้ใช้</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50">
                    <span className="text-xs text-slate-500">แสดง {filtered.length} จาก {users.length} ผู้ใช้</span>
                </div>
            </div>

            {/* Generate Password Modal */}
            {showGenModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
                                    <KeyRound className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-slate-800">สร้างรหัสผ่าน</h2>
                                    <p className="text-xs text-slate-500">สำหรับ Organizer ที่ต้องการเข้าระบบ</p>
                                </div>
                            </div>
                            <button onClick={closeGenModal} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X className="w-4 h-4 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {!genResult ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            อีเมลของ Organizer
                                        </label>
                                        <input
                                            type="email"
                                            value={genEmail}
                                            onChange={(e) => setGenEmail(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleGeneratePassword()}
                                            placeholder="example@kkumail.com"
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <p className="text-xs text-slate-400 mt-1.5">
                                            ผู้ใช้นี้ต้องมีอยู่ในระบบแล้ว
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleGeneratePassword}
                                        disabled={genLoading || !genEmail.trim()}
                                        className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                    >
                                        {genLoading ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <KeyRound className="w-4 h-4" />
                                        )}
                                        สร้างรหัสผ่าน
                                    </button>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                        <p className="text-sm font-medium text-emerald-700 mb-1">สร้างรหัสผ่านสำเร็จ</p>
                                        <p className="text-xs text-emerald-600">{genResult.name} · {genResult.email}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                            รหัสผ่านใหม่
                                        </label>
                                        <div className="flex gap-2">
                                            <div className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-lg font-bold text-slate-800 tracking-widest">
                                                {genResult.generatedPassword}
                                            </div>
                                            <button
                                                onClick={() => handleCopy(genResult.generatedPassword)}
                                                className={`px-4 rounded-xl border transition-colors ${copied
                                                    ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                                                    : "border-slate-200 hover:bg-slate-50 text-slate-600"
                                                    }`}
                                            >
                                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-2">
                                            โปรดแจ้งรหัสผ่านนี้ให้กับ Organizer ทันที ระบบจะไม่แสดงอีกครั้ง
                                        </p>
                                    </div>
                                    <button
                                        onClick={closeGenModal}
                                        className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-900 transition-colors"
                                    >
                                        ปิด
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Click outside to close menu */}
            {openMenuId !== null && (
                <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
            )}
        </div>
    )
}
