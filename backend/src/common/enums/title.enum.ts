/** คำนำหน้าชื่อ — ตรงกับ enum Title ใน schema.prisma */
export const Title = { MR: 'mr', MISS: 'miss' } as const;

export type Title = (typeof Title)[keyof typeof Title];
