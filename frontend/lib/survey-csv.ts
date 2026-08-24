import type { SurveyResult, SurveyRespondent } from "./api"

/**
 * สร้างเนื้อหาไฟล์ CSV ของผลแบบสำรวจ — ไฟล์เดียวมีทั้งบล็อกสรุปรายข้อและคำตอบรายบุคคล
 *
 * แยกออกจากคอมโพเนนต์เพราะเป็นตรรกะล้วนๆ ไม่มี DOM เข้ามาเกี่ยว ทำให้ตรวจสอบผลลัพธ์
 * ด้วยข้อมูลจริงได้โดยไม่ต้องเปิดเบราว์เซอร์ (คอมโพเนนต์เหลือหน้าที่แค่สั่งดาวน์โหลด)
 */

/**
 * ครอบค่าเป็นช่อง CSV — escape เครื่องหมายคำพูดด้วยการซ้ำตัวมันเอง ตามมาตรฐาน RFC 4180
 * จำเป็นจริง เพราะคำตอบแบบข้อความที่นักศึกษาพิมพ์มีเครื่องหมายคำพูดได้ ถ้าไม่ escape ไฟล์จะเพี้ยนทั้งแถว
 */
export function csvCell(value: string | number | null | undefined): string {
    const text = value == null || value === "" ? "-" : String(value)
    return `"${text.replace(/"/g, '""')}"`
}

/** คำถามที่คำนวณค่าสรุปสำหรับขอบเขตที่กรองไว้แล้ว */
export interface SurveyCsvQuestion extends SurveyResult {
    distribution: Record<number, number>
}

export interface BuildSurveyCsvInput {
    /** คำเรียกหน่วย ("งาน" / "กิจกรรม") */
    subjectLabel: string
    /** ชื่องาน/กิจกรรม */
    subjectName: string
    /** ขอบเขตข้อมูลที่ส่งออก เช่น "ทุกกิจกรรมย่อย" หรือชื่อกิจกรรมย่อยที่กรองอยู่ */
    scopeName: string
    /** คำถามเรียงตามลำดับที่แสดง พร้อมค่าสรุปของขอบเขตนี้ */
    questions: SurveyCsvQuestion[]
    /** ผู้ตอบในขอบเขตนี้ */
    respondents: SurveyRespondent[]
    /** เวลาที่ส่งออก — รับเข้ามาเพื่อให้ผลลัพธ์คงที่เวลาทดสอบ */
    exportedAt: Date
}

export function buildSurveyCsv({
    subjectLabel,
    subjectName,
    scopeName,
    questions,
    respondents,
    exportedAt,
}: BuildSurveyCsvInput): string {
    // คำถามแบบให้คะแนนอาจมีคะแนนเต็มไม่เท่ากัน — ใช้ค่ามากสุดเป็นจำนวนคอลัมน์ แล้วเติม "-" ให้ข้อที่สั้นกว่า
    const maxScale = Math.max(0, ...questions.filter((q) => q.type === "rating").map((q) => q.scaleMax ?? 5))
    const scaleColumns = Array.from({ length: maxScale }, (_, i) => i + 1)

    const summaryHeader = [
        "คำถาม",
        "ชนิด",
        "จำนวนคนตอบ",
        "ค่าเฉลี่ย",
        ...scaleColumns.map((s) => `ให้ ${s} คะแนน`),
    ]

    const summaryRows = questions.map((q) =>
        q.type === "rating"
            ? [
                  csvCell(q.label),
                  csvCell("คะแนน"),
                  csvCell(q.responseCount),
                  csvCell(q.average?.toFixed(2)),
                  ...scaleColumns.map((s) => csvCell(s <= (q.scaleMax ?? 5) ? (q.distribution[s] ?? 0) : null)),
              ].join(",")
            : [
                  csvCell(q.label),
                  csvCell("ข้อความ"),
                  csvCell(q.responseCount),
                  csvCell(null),
                  ...scaleColumns.map(() => csvCell(null)),
              ].join(",")
    )

    const detailHeader = ["ลำดับ", "ชื่อ-นามสกุล", "รหัสนักศึกษา", "กิจกรรมย่อย", ...questions.map((q) => q.label)]

    const detailRows = respondents.map((r, idx) =>
        [
            csvCell(idx + 1),
            csvCell(r.student.name),
            csvCell(r.student.studentId),
            csvCell(r.activityName),
            ...questions.map((q) => {
                const ans = r.answers[q.questionId]
                if (!ans) return csvCell(null)
                return csvCell(q.type === "rating" ? ans.ratingValue : ans.textValue)
            }),
        ].join(",")
    )

    return [
        `แบบสำรวจหลัง${subjectLabel}: ${subjectName || "-"}`,
        `ขอบเขตข้อมูล: ${scopeName}`,
        `จำนวนผู้ตอบแบบสำรวจ: ${respondents.length} คน`,
        `วันที่ส่งออก: ${exportedAt.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}`,
        "",
        "[สรุปรายข้อ]",
        summaryHeader.map(csvCell).join(","),
        ...summaryRows,
        "",
        "[คำตอบรายบุคคล]",
        detailHeader.map(csvCell).join(","),
        ...detailRows,
    ].join("\n")
}
