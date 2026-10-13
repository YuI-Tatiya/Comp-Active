import {
    MessageSquare,
    Clock,
    Repeat,
    Users,
    Brain,
    Scale,
    Palette,
    Lightbulb,
    BookOpen,
    Handshake,
    Crown,
    Smile,
    type LucideIcon,
} from "lucide-react"
import type { SkillScores } from "@/lib/api"

/**
 * ทักษะ Soft Skills ทั้ง 12 ด้าน — ค่า value ตรงกับที่ backend เก็บใน
 * ActivitySoftSkill.skillType / Evaluation (SoftSkillType enum)
 */
export type SoftSkillType =
    | "communication"
    | "time_management"
    | "flexibility_adaptability"
    | "teamwork_collaboration"
    | "analytic_critical_thinking"
    | "decision_making"
    | "creativity"
    | "complex_problem_solving"
    | "curiosity_lifelong_learning"
    | "negotiation_persuasion"
    | "leadership"
    | "positive_attitude"

export interface SoftSkillMeta {
    value: SoftSkillType
    /** ชื่อ field ที่ตรงกันบน Evaluation ฝั่ง backend (SkillScores) — เช่น "time_management" -> "timeManagement" */
    field: keyof SkillScores
    label: string
    labelEn: string
    icon: LucideIcon
    desc: string
}

export const SOFT_SKILLS: SoftSkillMeta[] = [
    {
        value: "communication",
        field: "communication",
        label: "ทักษะการสื่อสาร",
        labelEn: "Communication",
        icon: MessageSquare,
        desc: "ถ่ายทอดความคิดได้ชัดเจนและตรงประเด็น",
    },
    {
        value: "time_management",
        field: "timeManagement",
        label: "ทักษะการบริหารจัดการเวลา",
        labelEn: "Time Management",
        icon: Clock,
        desc: "จัดสรรและบริหารเวลาได้อย่างมีประสิทธิภาพ",
    },
    {
        value: "flexibility_adaptability",
        field: "flexibilityAdaptability",
        label: "ทักษะความยืดหยุ่นและปรับตัว",
        labelEn: "Flexibility and Adaptability",
        icon: Repeat,
        desc: "รับมือกับสถานการณ์ที่เปลี่ยนแปลงได้",
    },
    {
        value: "teamwork_collaboration",
        field: "teamworkCollaboration",
        label: "ทักษะการทำงานร่วมกับผู้อื่น",
        labelEn: "Teamwork and Collaboration",
        icon: Users,
        desc: "ทำงานร่วมกับผู้อื่นได้อย่างราบรื่น",
    },
    {
        value: "analytic_critical_thinking",
        field: "analyticCriticalThinking",
        label: "ทักษะการคิดเชิงวิเคราะห์และเชิงวิพากษ์",
        labelEn: "Analytic and Critical Thinking",
        icon: Brain,
        desc: "วิเคราะห์ข้อมูลและตั้งคำถามอย่างมีเหตุผล",
    },
    {
        value: "decision_making",
        field: "decisionMaking",
        label: "ทักษะการตัดสินใจ",
        labelEn: "Decision Making",
        icon: Scale,
        desc: "ชั่งน้ำหนักทางเลือกและตัดสินใจอย่างมีความรับผิดชอบ",
    },
    {
        value: "creativity",
        field: "creativity",
        label: "ทักษะการคิดเชิงสร้างสรรค์",
        labelEn: "Creativity",
        icon: Palette,
        desc: "คิดค้นแนวทางหรือไอเดียใหม่ ๆ",
    },
    {
        value: "complex_problem_solving",
        field: "complexProblemSolving",
        label: "ทักษะการแก้ไขปัญหาที่มีความซับซ้อน",
        labelEn: "Complex Problem Solving",
        icon: Lightbulb,
        desc: "วิเคราะห์และหาทางออกอย่างเป็นระบบ",
    },
    {
        value: "curiosity_lifelong_learning",
        field: "curiosityLifelongLearning",
        label: "ทักษะการใฝ่เรียนรู้ตลอดเวลา",
        labelEn: "Curiosity and Lifelong Learning",
        icon: BookOpen,
        desc: "แสวงหาความรู้และพัฒนาตัวเองอย่างต่อเนื่อง",
    },
    {
        value: "negotiation_persuasion",
        field: "negotiationPersuasion",
        label: "ทักษะการโน้มน้าวและต่อรอง",
        labelEn: "Negotiation and Persuasion",
        icon: Handshake,
        desc: "สื่อสารเพื่อโน้มน้าวและหาข้อตกลงร่วมกัน",
    },
    {
        value: "leadership",
        field: "leadership",
        label: "ทักษะการเป็นผู้นำ",
        labelEn: "Leadership",
        icon: Crown,
        desc: "นำทีมและตัดสินใจอย่างมีความรับผิดชอบ",
    },
    {
        value: "positive_attitude",
        field: "positiveAttitude",
        label: "ทักษะการมีทัศนคติเชิงบวก",
        labelEn: "Positive Attitude",
        icon: Smile,
        desc: "มองสถานการณ์ในแง่ดีและรักษาพลังบวก",
    },
]

// ระดับ 3 ระดับ (ผ่าน/ดี/ดีเยี่ยม) อยู่ใน soft-skill-tiers.ts (ไม่ผูก icon) — re-export ให้ import จากที่นี่ได้เหมือนเดิม
export { SOFT_SKILL_TIERS, softSkillTierLabel } from "./soft-skill-tiers"

export const MAX_SOFT_SKILLS_PER_ACTIVITY = 3

/**
 * เพดานระดับ Soft Skills ตามระยะเวลากิจกรรม — พรีวิวฝั่ง client เท่านั้น server ตรวจซ้ำเสมอ
 * ใช้ได้กับกิจกรรมทุกประเภทการรับสมัครเหมือนกันหมด (ไม่แยกสตาฟฟ์/ผู้เข้าร่วมทั่วไป — คุมด้วยระยะเวลาอย่างเดียว)
 * (ต้องตรงกับ backend/src/common/utils/soft-skill-cap.util.ts เป๊ะ ห้ามแก้ที่เดียว)
 */
export function maxSoftSkillLevel(durationHours: number): 1 | 2 | 3 {
    if (durationHours <= 4) return 1
    if (durationHours >= 48) return 3
    return 2
}

const BY_VALUE = new Map(SOFT_SKILLS.map((s) => [s.value, s]))
const BY_FIELD = new Map(SOFT_SKILLS.map((s) => [s.field, s]))

export function getSoftSkill(value?: string | null): SoftSkillMeta | undefined {
    return value ? BY_VALUE.get(value as SoftSkillType) : undefined
}

export function softSkillLabel(value?: string | null): string {
    return getSoftSkill(value)?.label ?? value ?? ""
}

/** เหมือน softSkillLabel แต่ค้นด้วยชื่อ field แบบ camelCase (เช่น key ใน SkillScores) แทน enum value */
export function softSkillLabelByField(field?: string | null): string {
    return (field ? BY_FIELD.get(field as keyof SkillScores)?.label : undefined) ?? field ?? ""
}
