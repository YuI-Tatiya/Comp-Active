"use client"

import { useState, useEffect } from "react"
import { Search, MoreVertical, UserCog, Trash2, Shield, GraduationCap, Megaphone } from "lucide-react"
import { usersAPI, User } from "@/lib/api"

const roleLabels: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    student: { label: "นักศึกษา", color: "bg-blue-50 text-blue-600 border-blue-200", icon: GraduationCap },
    organizer: { label: "ผู้จัดกิจกรรม", color: "bg-purple-50 text-purple-600 border-purple-200", icon: Megaphone },
    admin: { label: "ผู้ดูแลระบบ", color: "bg-red-50 text-red-600 border-red-200", icon: Shield },
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [roleFilter, setRoleFilter] = useState("all")
    const [openMenuId, setOpenMenuId] = useState<number | null>(null)

    useEffect(() => {
        loadUsers()
    }, [])

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

    const filteredUsers = users.filter((user) => {
        const matchSearch =
            user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchRole = roleFilter === "all" || user.role === roleFilter
        return matchSearch && matchRole
    })

    const handleChangeRole = async (userId: number, newRole: string) => {
        try {
            await usersAPI.changeRole(userId, newRole)
            setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole as "student" | "organizer" | "admin" } : u)))
        } catch (err) {
            const message = err instanceof Error ? err.message : "เปลี่ยนบทบาทไม่สำเร็จ"
            alert(message)
        }
        setOpenMenuId(null)
    }

    const handleDeleteUser = async (userId: number) => {
        if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้นี้?")) return
        try {
            await usersAPI.deleteUser(userId)
            setUsers((prev) => prev.filter((u) => u.id !== userId))
        } catch (err) {
            const message = err instanceof Error ? err.message : "ลบผู้ใช้ไม่สำเร็จ"
            alert(message)
        }
    }

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">จัดการผู้ใช้</h1>
                <p className="text-gray-500 mt-1">ดูและจัดการบัญชีผู้ใช้ทั้งหมดในระบบ</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อหรืออีเมล..."
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        {["all", "student", "organizer", "admin"].map((role) => (
                            <button
                                key={role}
                                onClick={() => setRoleFilter(role)}
                                className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${roleFilter === role ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                            >
                                {role === "all" ? "ทั้งหมด" : roleLabels[role]?.label || role}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-4">ผู้ใช้</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-4">บทบาท</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-4">รหัส นศ.</th>
                                <th className="text-right text-xs font-semibold text-gray-500 uppercase px-6 py-4">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredUsers.map((user) => {
                                const roleInfo = roleLabels[user.role] || roleLabels.student
                                const RoleIcon = roleInfo.icon
                                return (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                    {user.name?.[0] || "?"}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900 text-sm">{user.name}</div>
                                                    <div className="text-xs text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${roleInfo.color}`}>
                                                <RoleIcon className="w-3 h-3" />
                                                {roleInfo.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{user.studentId || "-"}</td>
                                        <td className="px-6 py-4 text-right relative">
                                            <button
                                                onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                                                className="p-2 hover:bg-gray-100 rounded-lg"
                                            >
                                                <MoreVertical className="w-4 h-4 text-gray-400" />
                                            </button>
                                            {openMenuId === user.id && (
                                                <div className="absolute right-6 top-12 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-2">
                                                    <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase">เปลี่ยนบทบาท</div>
                                                    {["student", "organizer", "admin"].map((role) => (
                                                        <button
                                                            key={role}
                                                            onClick={() => handleChangeRole(user.id, role)}
                                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${user.role === role ? "text-blue-600 font-medium" : "text-gray-700"
                                                                }`}
                                                        >
                                                            <UserCog className="w-4 h-4" />
                                                            {roleLabels[role]?.label || role}
                                                        </button>
                                                    ))}
                                                    <div className="border-t border-gray-100 mt-1 pt-1">
                                                        <button
                                                            onClick={() => handleDeleteUser(user.id)}
                                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            ลบผู้ใช้
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                    <div className="text-sm text-gray-500">แสดง {filteredUsers.length} จาก {users.length} ผู้ใช้</div>
                </div>
            </div>
        </div>
    )
}
