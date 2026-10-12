// ⚠️ ไฟล์นี้ต้องตรงกับ backend/src/common/constants/titles.ts เสมอ

export type TitleCode = "mr" | "miss"

export const TITLES: { code: TitleCode; label: string }[] = [
    { code: "mr", label: "นาย" },
    { code: "miss", label: "นางสาว" },
]
