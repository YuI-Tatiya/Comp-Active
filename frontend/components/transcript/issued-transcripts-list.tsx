// components/transcript/issued-transcripts-list.tsx
"use client"

import { FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatThaiDate, formatTranscriptCode, type TranscriptListItem } from "@/lib/transcript"

interface IssuedTranscriptsListProps {
    items: TranscriptListItem[]
    onOpen: (code: string) => void
    onRevoke: (code: string) => void
}

export function IssuedTranscriptsList({ items, onOpen, onRevoke }: IssuedTranscriptsListProps) {
    return (
        <div className="rounded-2xl border border-border bg-bg p-8 shadow-xs">
            <h4 className="text-xl font-bold text-fg">เอกสารที่ออกแล้ว</h4>
            <p className="mb-6 mt-1 text-sm text-fg-muted">
                ผู้รับเอกสารตรวจสอบความถูกต้องได้ด้วย QR หรือเลขที่เอกสาร ยกเลิกเมื่อไรก็ได้ เอกสารที่ยกเลิกจะตรวจสอบไม่ผ่านทันที
            </p>

            {items.length === 0 ? (
                <p className="py-6 text-center text-sm text-fg-subtle">ยังไม่มีเอกสารที่ออก กดปุ่ม “ส่งออกเอกสารรับรอง (PDF)” ด้านบนเพื่อออกฉบับแรก</p>
            ) : (
                <ul className="divide-y divide-border">
                    {items.map((item) => {
                        const revoked = item.revokedAt !== null
                        return (
                            <li key={item.code} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start gap-3">
                                    <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                                        <FileText className="size-4" aria-hidden="true" />
                                    </span>
                                    <div>
                                        <p className="font-mono text-sm font-semibold text-fg">{formatTranscriptCode(item.code)}</p>
                                        <p className="text-xs text-fg-muted">
                                            ออกเมื่อ {formatThaiDate(item.issuedAt)} · {item.activityCount} กิจกรรม · {item.totalScore.toLocaleString("th-TH")} แต้ม
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {revoked ? (
                                        <Badge variant="neutral">ยกเลิกแล้ว {formatThaiDate(item.revokedAt as string)}</Badge>
                                    ) : (
                                        <>
                                            <Button type="button" variant="outline" size="sm" onClick={() => onOpen(item.code)}>
                                                เปิด / พิมพ์อีกครั้ง
                                            </Button>
                                            <Button type="button" variant="ghost" size="sm" className="text-danger-fg" onClick={() => onRevoke(item.code)}>
                                                ยกเลิก
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}
