"use client"

import { useState, useEffect } from "react"
import { CheckCircle, XCircle, Clock, User, Mail, Phone, Building2, FileText, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { organizerRequestsAPI, OrganizerRequest } from "@/lib/api"

const statusConfig = {
    pending: { label: "รออนุมัติ", bg: "rgba(224,169,74,0.14)", color: "#c88e2a" },
    approved: { label: "อนุมัติแล้ว", bg: "rgba(63,160,172,0.12)", color: "#3fa0ac" },
    rejected: { label: "ปฏิเสธแล้ว", bg: "rgba(239,68,68,0.1)", color: "#dc2626" },
}

const filterTabs = [
    { key: "pending", label: "รออนุมัติ" },
    { key: "approved", label: "อนุมัติแล้ว" },
    { key: "rejected", label: "ปฏิเสธแล้ว" },
    { key: "all", label: "ทั้งหมด" },
] as const

export default function OrganizerRequestsPage() {
    const [requests, setRequests] = useState<OrganizerRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending")
    const [expanded, setExpanded] = useState<number | null>(null)
    const [rejectId, setRejectId] = useState<number | null>(null)
    const [rejectReason, setRejectReason] = useState("")
    const [actionLoading, setActionLoading] = useState<number | null>(null)

    useEffect(() => { loadRequests() }, [filter])

    async function loadRequests() {
        setLoading(true)
        try {
            const data = await organizerRequestsAPI.getAll(filter === "all" ? undefined : filter)
            setRequests(data)
        } catch {
            setRequests([])
        } finally {
            setLoading(false)
        }
    }

    async function handleApprove(id: number) {
        if (!confirm("อนุมัติคำขอนี้และส่ง credentials ทางอีเมล?")) return
        setActionLoading(id)
        try {
            await organizerRequestsAPI.approve(id)
            setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "approved" } : r))
        } catch (err) {
            alert(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
        } finally {
            setActionLoading(null)
        }
    }

    async function handleReject() {
        if (!rejectId || !rejectReason.trim()) return
        setActionLoading(rejectId)
        try {
            await organizerRequestsAPI.reject(rejectId, rejectReason.trim())
            setRequests((prev) => prev.map((r) => r.id === rejectId ? { ...r, status: "rejected", rejectionReason: rejectReason } : r))
            setRejectId(null)
            setRejectReason("")
        } catch (err) {
            alert(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
        } finally {
            setActionLoading(null)
        }
    }

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold" style={{ color: "#14263c" }}>คำขอเป็น Organizer</h1>
                <p className="text-sm mt-1" style={{ color: "#5f7691" }}>ตรวจสอบและอนุมัติ/ปฏิเสธคำขอ</p>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 flex-wrap">
                {filterTabs.map((tab) => {
                    const active = filter === tab.key
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key)}
                            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                            style={active ? {
                                background: "#3a72ad",
                                color: "#fff",
                            } : {
                                background: "#fff",
                                color: "#5f7691",
                                border: "1px solid #dce6f2",
                            }}
                        >
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#3a72ad" }} />
                </div>
            ) : requests.length === 0 ? (
                <div className="bg-white rounded-2xl py-16 text-center" style={{ border: "1px solid #dce6f2" }}>
                    <Clock className="w-10 h-10 mx-auto mb-3" style={{ color: "#dce6f2" }} />
                    <p className="text-sm" style={{ color: "#5f7691" }}>ไม่มีคำขอในขณะนี้</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {requests.map((req) => {
                        const isExpanded = expanded === req.id
                        const status = statusConfig[req.status]
                        return (
                            <div key={req.id} className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #dce6f2" }}>
                                <div className="px-6 py-4 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(58,114,173,0.1)" }}>
                                        <User className="w-5 h-5" style={{ color: "#3a72ad" }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-sm" style={{ color: "#14263c" }}>{req.name}</div>
                                        <div className="flex items-center gap-3 flex-wrap mt-0.5 text-xs" style={{ color: "#5f7691" }}>
                                            <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{req.email}</span>
                                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{req.phone}</span>
                                            <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{req.department}</span>
                                        </div>
                                    </div>
                                    <span className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0" style={{ background: status.bg, color: status.color }}>
                                        {status.label}
                                    </span>
                                    <button
                                        onClick={() => setExpanded(isExpanded ? null : req.id)}
                                        className="p-1.5 rounded-lg transition-colors shrink-0"
                                        style={{ color: "#5f7691" }}
                                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f0f4f9" }}
                                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                                    >
                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                </div>

                                {isExpanded && (
                                    <div className="px-6 pb-5 pt-4 space-y-4" style={{ borderTop: "1px solid #f0f4f9" }}>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: "#5f7691" }}>
                                                <FileText className="w-3 h-3" /> เหตุผล
                                            </p>
                                            <p className="text-sm rounded-xl p-3 leading-relaxed" style={{ background: "#f7f9fc", color: "#14263c" }}>{req.reason}</p>
                                        </div>
                                        {req.experience && (
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#5f7691" }}>ประสบการณ์</p>
                                                <p className="text-sm rounded-xl p-3 leading-relaxed" style={{ background: "#f7f9fc", color: "#14263c" }}>{req.experience}</p>
                                            </div>
                                        )}
                                        {req.status === "rejected" && req.rejectionReason && (
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#dc2626" }}>เหตุผลที่ปฏิเสธ</p>
                                                <p className="text-sm rounded-xl p-3" style={{ background: "rgba(239,68,68,0.06)", color: "#dc2626" }}>{req.rejectionReason}</p>
                                            </div>
                                        )}
                                        <p className="text-xs" style={{ color: "#5f7691" }}>ส่งเมื่อ {new Date(req.createdAt).toLocaleDateString("th-TH", { dateStyle: "long" })}</p>

                                        {req.status === "pending" && (
                                            <div className="flex gap-3 pt-1">
                                                <button
                                                    onClick={() => handleApprove(req.id)}
                                                    disabled={actionLoading === req.id}
                                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                                                    style={{ background: "#3fa0ac", color: "#fff" }}
                                                >
                                                    {actionLoading === req.id
                                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                                        : <CheckCircle className="w-4 h-4" />}
                                                    อนุมัติ + ส่ง Email
                                                </button>
                                                <button
                                                    onClick={() => { setRejectId(req.id); setRejectReason("") }}
                                                    disabled={actionLoading === req.id}
                                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                                                    style={{ border: "1px solid rgba(239,68,68,0.3)", color: "#dc2626" }}
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                    ปฏิเสธ
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Reject modal */}
            {rejectId !== null && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(16,31,51,0.5)", backdropFilter: "blur(4px)" }}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
                        <h3 className="font-bold text-lg" style={{ color: "#14263c" }}>ระบุเหตุผลที่ปฏิเสธ</h3>
                        <p className="text-sm" style={{ color: "#5f7691" }}>เหตุผลนี้จะถูกส่งไปยังอีเมลของผู้สมัคร</p>
                        <textarea
                            rows={4}
                            autoFocus
                            placeholder="เช่น ข้อมูลไม่ครบถ้วน / ไม่ตรงตามเงื่อนไข..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-sm rounded-xl resize-none outline-none"
                            style={{ border: "1px solid #dce6f2", color: "#14263c" }}
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setRejectId(null)}
                                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                                style={{ border: "1px solid #dce6f2", color: "#5f7691" }}
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={!rejectReason.trim() || actionLoading !== null}
                                className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                                style={{ background: "#dc2626", color: "#fff" }}
                            >
                                {actionLoading !== null
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <XCircle className="w-4 h-4" />}
                                ปฏิเสธและส่ง Email
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
