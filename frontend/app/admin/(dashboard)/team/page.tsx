"use client"

import { useState, useEffect } from "react"
import { UserPlus, Mail, Clock, Ban, Loader2, X, ShieldCheck } from "lucide-react"
import { adminInvitesAPI, AdminInvite } from "@/lib/api"

const statusConfig = {
    pending: { label: "รอตอบรับ", bg: "rgba(224,169,74,0.14)", color: "#c88e2a" },
    accepted: { label: "ใช้งานแล้ว", bg: "rgba(63,160,172,0.12)", color: "#3fa0ac" },
    revoked: { label: "ยกเลิกแล้ว", bg: "rgba(239,68,68,0.1)", color: "#dc2626" },
}

export default function AdminTeamPage() {
    const [invites, setInvites] = useState<AdminInvite[]>([])
    const [loading, setLoading] = useState(true)
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [email, setEmail] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [formError, setFormError] = useState("")
    const [revokingId, setRevokingId] = useState<number | null>(null)

    useEffect(() => { loadInvites() }, [])

    async function loadInvites() {
        setLoading(true)
        try {
            setInvites(await adminInvitesAPI.getAll())
        } catch {
            setInvites([])
        } finally {
            setLoading(false)
        }
    }

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault()
        setFormError("")
        if (!email.trim()) {
            setFormError("กรุณากรอกอีเมล")
            return
        }
        setSubmitting(true)
        try {
            await adminInvitesAPI.create(email.trim())
            setShowInviteModal(false)
            setEmail("")
            await loadInvites()
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
        } finally {
            setSubmitting(false)
        }
    }

    async function handleRevoke(id: number) {
        setRevokingId(id)
        try {
            await adminInvitesAPI.revoke(id)
            await loadInvites()
        } catch (err) {
            alert(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
        } finally {
            setRevokingId(null)
        }
    }

    function isExpired(invite: AdminInvite) {
        return invite.status === "pending" && new Date(invite.expiresAt) < new Date()
    }

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>จัดการทีม Admin</h1>
                    <p className="text-sm mt-1" style={{ color: "#64748b" }}>เชิญผู้ดูแลระบบใหม่ผ่านอีเมล — ไม่ต้องรู้รหัสผ่านของกันและกัน</p>
                </div>
                <button
                    onClick={() => { setEmail(""); setFormError(""); setShowInviteModal(true) }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
                    style={{ background: "#2563eb", color: "#fff" }}
                >
                    <UserPlus className="w-4 h-4" />
                    เชิญ Admin ใหม่
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2563eb" }} />
                </div>
            ) : invites.length === 0 ? (
                <div className="bg-white rounded-2xl py-16 text-center" style={{ border: "1px solid #e2e8f0" }}>
                    <ShieldCheck className="w-10 h-10 mx-auto mb-3" style={{ color: "#e2e8f0" }} />
                    <p className="text-sm" style={{ color: "#64748b" }}>ยังไม่มีคำเชิญ Admin</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {invites.map((invite) => {
                        const expired = isExpired(invite)
                        const status = expired
                            ? { label: "หมดอายุ", bg: "rgba(239,68,68,0.1)", color: "#dc2626" }
                            : statusConfig[invite.status]
                        return (
                            <div key={invite.id} className="bg-white rounded-2xl px-6 py-4 flex items-center gap-4" style={{ border: "1px solid #e2e8f0" }}>
                                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(37,99,235,0.1)" }}>
                                    <Mail className="w-5 h-5" style={{ color: "#2563eb" }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-sm" style={{ color: "#0f172a" }}>{invite.email}</div>
                                    <div className="flex items-center gap-3 flex-wrap mt-0.5 text-xs" style={{ color: "#64748b" }}>
                                        {invite.invitedBy && <span>เชิญโดย {invite.invitedBy.name}</span>}
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {invite.status === "pending"
                                                ? `หมดอายุ ${new Date(invite.expiresAt).toLocaleDateString("th-TH", { dateStyle: "medium" })}`
                                                : `ส่งเมื่อ ${new Date(invite.createdAt).toLocaleDateString("th-TH", { dateStyle: "medium" })}`}
                                        </span>
                                    </div>
                                </div>
                                <span className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0" style={{ background: status.bg, color: status.color }}>
                                    {status.label}
                                </span>
                                {invite.status === "pending" && !expired && (
                                    <button
                                        onClick={() => handleRevoke(invite.id)}
                                        disabled={revokingId === invite.id}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                                        style={{ border: "1px solid rgba(239,68,68,0.3)", color: "#dc2626" }}
                                    >
                                        {revokingId === invite.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                                        ยกเลิก
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="h-1.5" style={{ background: "linear-gradient(90deg,#1e293b,#2563eb)" }} />
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold" style={{ color: "#0f172a" }}>เชิญ Admin ใหม่</h3>
                                    <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>ระบบจะส่งลิงก์ตั้งรหัสผ่านไปยังอีเมลนี้</p>
                                </div>
                                <button
                                    onClick={() => !submitting && setShowInviteModal(false)}
                                    className="p-1.5 rounded-lg transition-colors"
                                    style={{ color: "#64748b" }}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleInvite}>
                                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#64748b" }}>
                                    อีเมล <span style={{ color: "#dc2626" }}>*</span>
                                </label>
                                <input
                                    type="email"
                                    autoFocus
                                    placeholder="newadmin@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-3.5 py-2.5 text-sm rounded-xl outline-none mb-1"
                                    style={{ border: "1px solid #e2e8f0", color: "#0f172a", background: "#f8fafc" }}
                                />
                                {formError && <p className="text-xs mt-1 mb-3" style={{ color: "#dc2626" }}>{formError}</p>}

                                <div className="flex gap-3 mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowInviteModal(false)}
                                        disabled={submitting}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                                        style={{ border: "1px solid #e2e8f0", color: "#64748b" }}
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60 transition-all hover:opacity-90"
                                        style={{ background: "#2563eb", color: "#fff" }}
                                    >
                                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                        {submitting ? "กำลังส่ง..." : "ส่งคำเชิญ"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
