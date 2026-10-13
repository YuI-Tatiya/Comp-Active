"use client"

import Link from "next/link"
import { BookOpen } from "lucide-react"

/**
 * ลิงก์ไปหน้าเกณฑ์การประเมินระดับ Soft Skills — เปิดแท็บใหม่เสมอ
 * (เปิดจากฟอร์มสร้างกิจกรรม/หน้าประเมินแล้วต้องไม่ทำให้ข้อมูลที่กำลังกรอกอยู่หาย)
 */
export function SoftSkillRubricLink({ className }: { className?: string }) {
    return (
        <Link
            href="/organizer/soft-skills"
            target="_blank"
            rel="noopener noreferrer"
            className={className ?? "inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 underline-offset-4 hover:underline"}
        >
            <BookOpen className="size-3.5" aria-hidden="true" />
            ดูเกณฑ์การประเมินแต่ละระดับ
            <span className="sr-only">(เปิดในแท็บใหม่)</span>
        </Link>
    )
}
