"use client"

import { useState, useEffect, useCallback } from "react"
import { CheckCircle, XCircle, Clock, User, Mail, Phone, Building2, FileText, ChevronDown, ChevronUp, Loader2, X } from "lucide-react"
import { organizerRequestsAPI, OrganizerRequest } from "@/lib/api"

const statusConfig = {
    pending: { label: "รออนุมัติ", bg: "rgba(232,163,58,0.14)", color: "#7a4f0e" },
    approved: { label: "อนุมัติแล้ว", bg: "rgba(4,120,87,0.12)", color: "#047857" },
    rejected: { label: "ปฏิเสธแล้ว", bg: "rgba(239,68,68,0.1)", color: "#dc2626" },
}

const filterTabs = [
    { key: "pending", label: "รออนุมัติ" },
    { key: "approved", label: "อนุมัติแล้ว" },
    { key: "rejected", label: "ปฏิเสธแล้ว" },
    { key: "all", label: "ทั้งหมด" },
] as const

type ModalState =
    | { type: "approve-confirm"; req: OrganizerRequest }
    | { type: "approve-success"; req: OrganizerRequest; emailSent: boolean }
    | { type: "reject"; req: OrganizerRequest }
    | { type: "reject-success"; req: OrganizerRequest }
    | null

const DEFAULT_VALID_DAYS = 90

export default function OrganizerRequestsPage() {
    const [requests, setRequests] = useState<OrganizerRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending")
    const [expanded, setExpanded] = useState<number | null>(null)
    const [modal, setModal] = useState<ModalState>(null)
    const [rejectReason, setRejectReason] = useState("")
    const [validDays, setValidDays] = useState(DEFAULT_VALID_DAYS)
    const [submitting, setSubmitting] = useState(false)

    const loadRequests = useCallback(async () => {
        setLoading(true)
        try {
            const data = await organizerRequestsAPI.getAll(filter === "all" ? undefined : filter)
            setRequests(data)
        } catch {
            setRequests([])
        } finally {
            setLoading(false)
        }
    }, [filter])

    useEffect(() => { loadRequests() }, [loadRequests])

    async function confirmApprove() {
        if (!modal || modal.type !== "approve-confirm") return
        const req = modal.req
        setSubmitting(true)
        try {
            const res = await organizerRequestsAPI.approve(req.id, validDays)
            setRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: "approved" } : r))
            setModal({ type: "approve-success", req, emailSent: res.emailSent })
        } catch (err) {
            alert(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
            setModal(null)
        } finally {
            setSubmitting(false)
        }
    }

    async function confirmReject() {
        if (!modal || modal.type !== "reject" || !rejectReason.trim()) return
        const req = modal.req
        setSubmitting(true)
        try {
            await organizerRequestsAPI.reject(req.id, rejectReason.trim())
            setRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: "rejected", rejectionReason: rejectReason } : r))
            setModal({ type: "reject-success", req })
            setRejectReason("")
        } catch (err) {
            alert(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
            setModal(null)
        } finally {
            setSubmitting(false)
        }
    }

    function closeModal() {
        if (submitting) return
        setModal(null)
        setRejectReason("")
    }

    const Overlay = ({ children }: { children: React.ReactNode }) => (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(18,34,61,0.55)", backdropFilter: "blur(4px)" }}>
            {children}
        </div>
    )

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold" style={{ color: "#12223d" }}>คำขอเป็น Organizer</h1>
                <p className="text-sm mt-1" style={{ color: "#5f6f87" }}>ตรวจสอบและอนุมัติ/ปฏิเสธคำขอ</p>
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
                            style={active ? { background: "#1f3a63", color: "#fff" } : { background: "#fff", color: "#5f6f87", border: "1px solid #dce4f0" }}
                        >
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#1f3a63" }} />
                </div>
            ) : requests.length === 0 ? (
                <div className="bg-white rounded-2xl py-16 text-center" style={{ border: "1px solid #dce4f0" }}>
                    <Clock className="w-10 h-10 mx-auto mb-3" style={{ color: "#dce4f0" }} />
                    <p className="text-sm" style={{ color: "#5f6f87" }}>ไม่มีคำขอในขณะนี้</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {requests.map((req) => {
                        const isExpanded = expanded === req.id
                        const status = statusConfig[req.status]
                        return (
                            <div key={req.id} className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #dce4f0" }}>
                                <div className="px-6 py-4 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(31,58,99,0.1)" }}>
                                        <User className="w-5 h-5" style={{ color: "#1f3a63" }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-sm" style={{ color: "#12223d" }}>{req.name}</div>
                                        <div className="flex items-center gap-3 flex-wrap mt-0.5 text-xs" style={{ color: "#5f6f87" }}>
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
                                        style={{ color: "#5f6f87" }}
                                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#e8eef7" }}
                                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                                    >
                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                </div>

                                {isExpanded && (
                                    <div className="px-6 pb-5 pt-4 space-y-4" style={{ borderTop: "1px solid #e8eef7" }}>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: "#5f6f87" }}>
                                                <FileText className="w-3 h-3" /> เหตุผล
                                            </p>
                                            <p className="text-sm rounded-xl p-3 leading-relaxed" style={{ background: "#f2f5fa", color: "#12223d" }}>{req.reason}</p>
                                        </div>
                                        {req.experience && (
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#5f6f87" }}>ประสบการณ์</p>
                                                <p className="text-sm rounded-xl p-3 leading-relaxed" style={{ background: "#f2f5fa", color: "#12223d" }}>{req.experience}</p>
                                            </div>
                                        )}
                                        {req.status === "rejected" && req.rejectionReason && (
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#dc2626" }}>เหตุผลที่ปฏิเสธ</p>
                                                <p className="text-sm rounded-xl p-3" style={{ background: "rgba(239,68,68,0.06)", color: "#dc2626" }}>{req.rejectionReason}</p>
                                            </div>
                                        )}
                                        <p className="text-xs" style={{ color: "#5f6f87" }}>ส่งเมื่อ {new Date(req.createdAt).toLocaleDateString("th-TH", { dateStyle: "long" })}</p>

                                        {req.status === "pending" && (
                                            <div className="flex gap-3 pt-1">
                                                <button
                                                    onClick={() => { setValidDays(DEFAULT_VALID_DAYS); setModal({ type: "approve-confirm", req }) }}
                                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
                                                    style={{ background: "#047857", color: "#fff" }}
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                    อนุมัติ + ส่ง Email
                                                </button>
                                                <button
                                                    onClick={() => { setRejectReason(""); setModal({ type: "reject", req }) }}
                                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
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

            {/* ── Approve confirmation modal ── */}
            {modal?.type === "approve-confirm" && (
                <Overlay>
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
                        <div className="h-1.5" style={{ background: "linear-gradient(90deg,#047857,#1f3a63)" }} />
                        <div className="p-7 flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(4,120,87,0.12)" }}>
                                <CheckCircle className="w-8 h-8" style={{ color: "#047857" }} />
                            </div>
                            <h3 className="text-lg font-bold mb-1" style={{ color: "#12223d" }}>ยืนยันการอนุมัติ</h3>
                            <p className="text-sm mb-1" style={{ color: "#5f6f87" }}>
                                อนุมัติคำขอของ <span className="font-semibold" style={{ color: "#12223d" }}>{modal.req.name}</span>
                            </p>
                            <p className="text-xs mb-4" style={{ color: "#5f6f87" }}>
                                ระบบจะสร้างบัญชีและส่ง credentials ไปที่<br />
                                <span className="font-medium" style={{ color: "#1f3a63" }}>{modal.req.email}</span>
                            </p>
                            <div className="w-full text-left mb-6">
                                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#5f6f87" }}>
                                    ให้สิทธิ์ใช้งานกี่วัน
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={3650}
                                    value={validDays}
                                    onChange={(e) => setValidDays(Math.max(1, Number(e.target.value) || 1))}
                                    className="w-full px-3.5 py-2.5 text-sm rounded-xl outline-none"
                                    style={{ border: "1px solid #dce4f0", color: "#12223d", background: "#f2f5fa" }}
                                />
                            </div>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={closeModal}
                                    disabled={submitting}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                                    style={{ border: "1px solid #dce4f0", color: "#5f6f87" }}
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={confirmApprove}
                                    disabled={submitting}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                                    style={{ background: "#047857", color: "#fff" }}
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    {submitting ? "กำลังดำเนินการ..." : "ยืนยันอนุมัติ"}
                                </button>
                            </div>
                        </div>
                    </div>
                </Overlay>
            )}

            {/* ── Approve success modal ── */}
            {modal?.type === "approve-success" && (
                <Overlay>
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
                        <div className="h-1.5" style={{ background: "linear-gradient(90deg,#047857,#22c55e)" }} />
                        <div className="p-7 flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(34,197,94,0.12)" }}>
                                <CheckCircle className="w-9 h-9" style={{ color: "#16a34a" }} />
                            </div>
                            <h3 className="text-lg font-bold mb-1" style={{ color: "#12223d" }}>อนุมัติเรียบร้อยแล้ว!</h3>
                            <p className="text-sm mb-1" style={{ color: "#5f6f87" }}>
                                บัญชี Organizer ของ <span className="font-semibold" style={{ color: "#12223d" }}>{modal.req.name}</span> ถูกสร้างแล้ว
                            </p>
                            {modal.emailSent ? (
                                <p className="text-xs mb-6" style={{ color: "#5f6f87" }}>
                                    ส่ง credentials ไปที่<br />
                                    <span className="font-medium" style={{ color: "#1f3a63" }}>{modal.req.email}</span> เรียบร้อย
                                </p>
                            ) : (
                                <p className="text-xs mb-6 rounded-xl p-3" style={{ background: "rgba(239,68,68,0.06)", color: "#dc2626" }}>
                                    ส่งอีเมลไม่สำเร็จ — กรุณาไปที่หน้า &quot;จัดการผู้ใช้&quot; และใช้ปุ่ม &quot;สร้างรหัสผ่านใหม่&quot;
                                    เพื่อส่งข้อมูลให้ {modal.req.email} ด้วยตนเอง
                                </p>
                            )}
                            <button
                                onClick={closeModal}
                                className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
                                style={{ background: "linear-gradient(135deg,#047857,#1f3a63)" }}
                            >
                                ตกลง
                            </button>
                        </div>
                    </div>
                </Overlay>
            )}

            {/* ── Reject modal ── */}
            {modal?.type === "reject" && (
                <Overlay>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="h-1.5" style={{ background: "linear-gradient(90deg,#dc2626,#ef4444)" }} />
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold" style={{ color: "#12223d" }}>ระบุเหตุผลที่ปฏิเสธ</h3>
                                    <p className="text-sm mt-0.5" style={{ color: "#5f6f87" }}>
                                        ส่งให้ <span className="font-medium" style={{ color: "#12223d" }}>{modal.req.name}</span> ทาง {modal.req.email}
                                    </p>
                                </div>
                                <button onClick={closeModal} disabled={submitting} className="p-1.5 rounded-lg transition-colors" style={{ color: "#5f6f87" }}
                                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#e8eef7" }}
                                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}>
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#5f6f87" }}>
                                เหตุผล <span style={{ color: "#dc2626" }}>*</span>
                            </label>
                            <textarea
                                rows={4}
                                autoFocus
                                placeholder="เช่น ข้อมูลไม่ครบถ้วน, ไม่ตรงตามเงื่อนไข, ไม่ใช่บุคลากรของวิทยาลัย..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="w-full px-3.5 py-2.5 text-sm rounded-xl resize-none outline-none mb-4"
                                style={{ border: "1px solid #dce4f0", color: "#12223d", background: "#f2f5fa" }}
                                onFocus={(e) => { e.currentTarget.style.border = "1px solid #1f3a63" }}
                                onBlur={(e) => { e.currentTarget.style.border = "1px solid #dce4f0" }}
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={closeModal}
                                    disabled={submitting}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                                    style={{ border: "1px solid #dce4f0", color: "#5f6f87" }}
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={confirmReject}
                                    disabled={!rejectReason.trim() || submitting}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:opacity-90"
                                    style={{ background: "#dc2626", color: "#fff" }}
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                    {submitting ? "กำลังส่ง..." : "ปฏิเสธและส่ง Email"}
                                </button>
                            </div>
                        </div>
                    </div>
                </Overlay>
            )}

            {/* ── Reject success modal ── */}
            {modal?.type === "reject-success" && (
                <Overlay>
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
                        <div className="h-1.5" style={{ background: "linear-gradient(90deg,#dc2626,#ef4444)" }} />
                        <div className="p-7 flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(239,68,68,0.08)" }}>
                                <XCircle className="w-9 h-9" style={{ color: "#dc2626" }} />
                            </div>
                            <h3 className="text-lg font-bold mb-1" style={{ color: "#12223d" }}>ส่งผลการพิจารณาแล้ว</h3>
                            <p className="text-sm mb-1" style={{ color: "#5f6f87" }}>
                                ปฏิเสธคำขอของ <span className="font-semibold" style={{ color: "#12223d" }}>{modal.req.name}</span>
                            </p>
                            <p className="text-xs mb-6" style={{ color: "#5f6f87" }}>
                                ส่งอีเมลแจ้งเหตุผลไปที่<br />
                                <span className="font-medium" style={{ color: "#1f3a63" }}>{modal.req.email}</span> เรียบร้อย
                            </p>
                            <button
                                onClick={closeModal}
                                className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
                                style={{ background: "#dc2626" }}
                            >
                                ตกลง
                            </button>
                        </div>
                    </div>
                </Overlay>
            )}
        </div>
    )
}
