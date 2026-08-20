"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Container } from "@/components/layout/container"
import { formatEventDate } from "@/components/ui/event-card"
import { Calendar, Clock, MapPin, Users, Share2, ArrowLeft, AlertTriangle, Loader2 } from "lucide-react"
import Link from "next/link"
import { eventsAPI, registrationsAPI, isUnlimitedCapacity, capacityLabel, EventSummary, RegistrationAnswerBody } from "@/lib/api"
import { resolveEventImageUrl } from "@/lib/event-image"
import { useAuth } from "@/lib/auth-context"
import {
    ActivityAboutPanel,
    ActivityRegistrationPanel,
    ActivityRewardsPanel,
} from "@/components/activity/activity-info-panels"

type EventActivity = EventSummary["activities"][number]

export default function StudentEventDetailsPage() {
    const { user } = useAuth()
    const params = useParams()
    const router = useRouter()
    const [event, setEvent] = useState<EventSummary | null>(null)
    const [activeActivityId, setActiveActivityId] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [isRegisterOpen, setIsRegisterOpen] = useState(false)
    const [registerForm, setRegisterForm] = useState({ name: "", studentId: "", email: "" })
    const [formError, setFormError] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [answers, setAnswers] = useState<Record<number, { textValue?: string; optionIds?: number[] }>>({})

    useEffect(() => {
        if (params.id) fetchEventDetails(Number(params.id))
    }, [params.id])

    const fetchEventDetails = async (id: number) => {
        try {
            setLoading(true)
            const data = await eventsAPI.getPublicById(id)
            setEvent(data)
            setActiveActivityId((prev) => prev ?? data.activities[0]?.id ?? null)
        } catch (err: unknown) {
            const e = err as Error
            setError(e.message || "โหลดข้อมูลงานไม่สำเร็จ")
        } finally {
            setLoading(false)
        }
    }

    const activeActivity: EventActivity | undefined = event?.activities.find((a) => a.id === activeActivityId)

    const openRegisterDialog = useCallback(() => {
        setRegisterForm({
            name: user?.name || "",
            studentId: (user as { studentId?: string } | null)?.studentId || "",
            email: user?.email || "",
        })
        setFormError("")
        setAnswers({})
        setIsRegisterOpen(true)
    }, [user])

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormError("")
        if (!activeActivity) return

        const profileName = user?.name?.trim().toLowerCase() || ""
        const profileStudentId = ((user as { studentId?: string } | null)?.studentId || "").trim()
        const profileEmail = user?.email?.trim().toLowerCase() || ""

        const enteredName = registerForm.name.trim().toLowerCase()
        const enteredStudentId = registerForm.studentId.trim()
        const enteredEmail = registerForm.email.trim().toLowerCase()

        if (enteredName !== profileName) {
            setFormError("ชื่อ-นามสกุลไม่ตรงกับบัญชีผู้ใช้ของคุณ")
            return
        }
        if (profileStudentId && enteredStudentId !== profileStudentId) {
            setFormError("รหัสนักศึกษาไม่ตรงกับบัญชีผู้ใช้ของคุณ")
            return
        }
        if (enteredEmail !== profileEmail) {
            setFormError("อีเมลไม่ตรงกับบัญชีผู้ใช้ของคุณ")
            return
        }

        for (const q of activeActivity.questions ?? []) {
            if (!q.required) continue
            const a = answers[q.id]
            const answered = q.type === "text" ? !!a?.textValue?.trim() : (a?.optionIds?.length ?? 0) > 0
            if (!answered) {
                setFormError(`กรุณาตอบคำถาม: ${q.label}`)
                return
            }
        }

        try {
            setSubmitting(true)
            const answerPayload: RegistrationAnswerBody[] = Object.entries(answers).map(([questionId, a]) => ({
                questionId: Number(questionId),
                textValue: a.textValue,
                optionIds: a.optionIds,
            }))
            await registrationsAPI.create(activeActivity.id, answerPayload)
            setIsRegisterOpen(false)
            alert("ลงทะเบียนสำเร็จ!")
            fetchEventDetails(event!.id)
        } catch (err: unknown) {
            const e = err as Error
            setFormError(e.message || "ลงทะเบียนไม่สำเร็จ")
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="bg-surface flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="mx-auto mb-4 size-8 animate-spin text-brand-600" aria-hidden="true" />
                    <p className="text-fg-muted">กำลังโหลดรายละเอียดงาน...</p>
                </div>
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="bg-surface flex flex-col items-center justify-center p-4">
                <div className="bg-bg p-8 rounded-xl shadow-sm max-w-md w-full text-center border border-border">
                    <AlertTriangle className="mx-auto mb-4 size-12 text-danger" aria-hidden="true" />
                    <h2 className="text-xl font-bold mb-2 text-fg">ไม่พบงาน</h2>
                    <p className="text-fg-muted mb-6">{error || "งานนี้อาจถูกลบหรือไม่มีอยู่จริง"}</p>
                    <Button onClick={() => router.push("/student/events")} className="w-full">กลับไปหน้าค้นหากิจกรรม</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-surface pb-12">
            <Container className="py-8">
                <div className="mb-6">
                    <Link href="/student/events" className="inline-flex items-center text-fg-muted hover:text-fg transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" /> กลับ
                    </Link>
                </div>

                <div className="mb-6">
                    <div className="aspect-video w-full max-h-[320px] bg-surface-2 rounded-xl overflow-hidden relative border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={resolveEventImageUrl(event, activeActivity)} alt={event.name} className="w-full h-full object-cover" />
                        {event.activities.length > 1 && (
                            <div className="absolute top-4 left-4">
                                <Badge className="bg-brand-600">{event.activities.length} กิจกรรมย่อย</Badge>
                            </div>
                        )}
                    </div>
                    <h1 className="mt-4 text-2xl md:text-3xl font-bold text-fg">{event.name}</h1>
                    <p className="mt-2 text-fg-muted whitespace-pre-line">{event.description}</p>
                </div>

                <Tabs value={activeActivityId ? String(activeActivityId) : undefined} onValueChange={(v) => setActiveActivityId(Number(v))}>
                    <TabsList className="h-auto flex-wrap justify-start gap-1 bg-surface-2 p-1 mb-6">
                        {event.activities.map((a) => (
                            <TabsTrigger key={a.id} value={String(a.id)}>{a.name}</TabsTrigger>
                        ))}
                    </TabsList>

                    {event.activities.map((a) => {
                        const unlimited = isUnlimitedCapacity(a.capacity)
                        const registeredCount = a.registeredCount ?? 0
                        return (
                        <TabsContent key={a.id} value={String(a.id)}>
                            <div className="grid lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-8">
                                    <Tabs defaultValue="details" className="w-full">
                                        <TabsList className="w-full justify-start bg-surface-2 p-1 rounded-lg mb-6">
                                            <TabsTrigger value="details" className="flex-1">รายละเอียด</TabsTrigger>
                                            <TabsTrigger value="rewards" className="flex-1">สิ่งที่จะได้รับ</TabsTrigger>
                                            <TabsTrigger value="registration" className="flex-1">การลงทะเบียน</TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="details">
                                            <ActivityAboutPanel activity={a} showActivityImage />
                                        </TabsContent>

                                        <TabsContent value="rewards">
                                            <ActivityRewardsPanel activity={a} />
                                        </TabsContent>

                                        <TabsContent value="registration">
                                            <ActivityRegistrationPanel activity={a} registrationCloseAt={event.registrationCloseAt} />
                                        </TabsContent>
                                    </Tabs>
                                </div>

                                <div className="space-y-6">
                                    <Card className="border-border shadow-xs overflow-hidden">
                                        <div className="p-6 space-y-6">
                                            <h3 className="font-semibold text-lg text-fg">ข้อมูลกิจกรรมย่อย</h3>
                                            <div className="space-y-4">
                                                <div className="flex gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0"><Calendar className="w-5 h-5" aria-hidden="true" /></div>
                                                    <div><div className="text-xs text-fg-muted">วันที่</div><div className="font-medium text-fg">{formatEventDate(a.date)}</div></div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0"><Clock className="w-5 h-5" aria-hidden="true" /></div>
                                                    <div><div className="text-xs text-fg-muted">เวลา</div><div className="font-medium text-fg">{a.startTime} - {a.endTime}</div></div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0"><MapPin className="w-5 h-5" aria-hidden="true" /></div>
                                                    <div><div className="text-xs text-fg-muted">สถานที่</div><div className="font-medium text-fg">{a.location}</div></div>
                                                </div>
                                                <div className="pt-4 border-t border-border">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="flex items-center gap-2 text-sm font-medium text-fg"><Users className="w-4 h-4" aria-hidden="true" /> ผู้เข้าร่วม</div>
                                                        <span className="text-sm text-fg-muted">{registeredCount} {capacityLabel(a.capacity) !== "ไม่จำกัดจำนวน" ? `/${a.capacity} คน` : "คน (ไม่จำกัด)"}</span>
                                                    </div>
                                                    {!unlimited && a.capacity && (
                                                        <>
                                                            <Progress value={registeredCount} max={a.capacity} className="h-2" />
                                                            <p className="text-xs text-fg-subtle mt-2 text-right">เหลืออีก {Math.max(a.capacity - registeredCount, 0)} ที่นั่ง</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-3 pt-2">
                                                {a.status !== "open" && (
                                                    <div className="flex justify-center">
                                                        <Badge variant="neutral">ปิดรับสมัคร</Badge>
                                                    </div>
                                                )}
                                                <Button
                                                    className="w-full h-11 text-base font-semibold"
                                                    onClick={openRegisterDialog}
                                                    disabled={a.status !== "open"}
                                                >
                                                    ลงทะเบียนเข้าร่วม
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="w-full"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`${window.location.origin}/events/${event.id}`)
                                                        alert("คัดลอกลิงก์สำหรับแชร์เรียบร้อยแล้ว!")
                                                    }}
                                                >
                                                    <Share2 className="w-4 h-4 mr-2" /> แชร์งานนี้
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </TabsContent>
                        )
                    })}
                </Tabs>
            </Container>

            <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>ลงทะเบียนเข้าร่วม &quot;{activeActivity?.name}&quot;</DialogTitle>
                        <p className="text-fg-muted text-sm">กรุณายืนยันข้อมูลของคุณเพื่อยืนยันตัวตนก่อนลงทะเบียน</p>
                    </DialogHeader>

                    <form onSubmit={handleRegister} className="space-y-4 py-2">
                        {formError && (
                            <div className="bg-danger-bg border border-danger text-danger text-sm font-medium px-4 py-3 rounded-lg flex items-center gap-2">
                                <AlertTriangle className="size-4 shrink-0" aria-hidden="true" /> {formError}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="reg-name">ชื่อ-นามสกุล <span className="text-danger">*</span></Label>
                            <Input id="reg-name" value={registerForm.name} onChange={(e) => setRegisterForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="กรอกชื่อ-นามสกุล" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reg-studentId">รหัสนักศึกษา <span className="text-danger">*</span></Label>
                            <Input id="reg-studentId" value={registerForm.studentId} onChange={(e) => setRegisterForm((prev) => ({ ...prev, studentId: e.target.value }))} placeholder="กรอกรหัสนักศึกษา" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reg-email">อีเมล <span className="text-danger">*</span></Label>
                            <Input id="reg-email" type="email" value={registerForm.email} onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="กรอกอีเมล" required />
                        </div>

                        {activeActivity?.questions && activeActivity.questions.length > 0 && (
                            <div className="space-y-4 border-t border-border pt-4">
                                <p className="text-sm font-medium text-fg">คำถามเพิ่มเติม</p>
                                {activeActivity.questions.map((q) => (
                                    <div key={q.id} className="space-y-2">
                                        <Label>{q.label} {q.required && <span className="text-danger">*</span>}</Label>
                                        {q.type === "text" && (
                                            <Input
                                                value={answers[q.id]?.textValue || ""}
                                                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: { textValue: e.target.value } }))}
                                            />
                                        )}
                                        {q.type === "single_choice" && (
                                            <div className="space-y-1.5">
                                                {q.options.map((opt) => (
                                                    <label key={opt.id} className="flex items-center gap-2 text-sm text-fg-muted">
                                                        <input
                                                            type="radio"
                                                            name={`question-${q.id}`}
                                                            checked={(answers[q.id]?.optionIds ?? [])[0] === opt.id}
                                                            onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: { optionIds: [opt.id] } }))}
                                                        />
                                                        {opt.label}
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                        {q.type === "multi_choice" && (
                                            <div className="space-y-1.5">
                                                {q.options.map((opt) => {
                                                    const selected = answers[q.id]?.optionIds ?? []
                                                    const checked = selected.includes(opt.id)
                                                    return (
                                                        <label key={opt.id} className="flex items-center gap-2 text-sm text-fg-muted">
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={(e) => {
                                                                    const next = e.target.checked ? [...selected, opt.id] : selected.filter((id) => id !== opt.id)
                                                                    setAnswers((prev) => ({ ...prev, [q.id]: { optionIds: next } }))
                                                                }}
                                                            />
                                                            {opt.label}
                                                        </label>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <p className="text-xs text-fg-subtle bg-surface px-3 py-2 rounded-lg">* ข้อมูลจะถูกตรวจสอบกับบัญชีผู้ใช้ที่ลงทะเบียนไว้ หากไม่ตรงกันจะไม่สามารถลงทะเบียนได้</p>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsRegisterOpen(false)} disabled={submitting}>ยกเลิก</Button>
                            <Button type="submit" disabled={submitting}>{submitting ? "กำลังลงทะเบียน..." : "ยืนยันการลงทะเบียน"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
