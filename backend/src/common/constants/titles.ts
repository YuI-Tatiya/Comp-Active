// ⚠️ ไฟล์นี้ต้องตรงกับ frontend/lib/titles.ts เสมอ

export type TitleCode = 'mr' | 'miss';

export const TITLES: { code: TitleCode; label: string }[] = [
  { code: 'mr', label: 'นาย' },
  { code: 'miss', label: 'นางสาว' },
];

export const TITLE_CODES: TitleCode[] = TITLES.map((t) => t.code);

export const TITLE_ERRORS = {
  REQUIRED: 'กรุณาเลือกคำนำหน้าชื่อ',
} as const;
