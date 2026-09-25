export const ActivityStatus = { OPEN: 'open', CLOSED: 'closed', COMPLETED: 'completed' } as const;
export type ActivityStatus = (typeof ActivityStatus)[keyof typeof ActivityStatus];

export const ApprovalStatus = {
  PENDING: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PENDING_CANCEL: 'pending_cancel',
  /** ผู้จัดยกเลิกกิจกรรมของตัวเอง — แยกจาก REJECTED (แอดมิน/ระบบปฏิเสธ) */
  CANCELLED: 'cancelled',
} as const;
export type ApprovalStatus = (typeof ApprovalStatus)[keyof typeof ApprovalStatus];

export const RegistrationStatus = { PENDING: 'pending', CONFIRMED: 'confirmed', CANCELLED: 'cancelled' } as const;
export type RegistrationStatus = (typeof RegistrationStatus)[keyof typeof RegistrationStatus];

export const AttendanceStatus = { ATTENDED: 'attended', ABSENT: 'absent' } as const;
export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

export const InviteStatus = { PENDING: 'pending', ACCEPTED: 'accepted', REVOKED: 'revoked' } as const;
export type InviteStatus = (typeof InviteStatus)[keyof typeof InviteStatus];

export const EventVisibility = { EVERYONE: 'everyone', RESTRICTED: 'restricted' } as const;
export type EventVisibility = (typeof EventVisibility)[keyof typeof EventVisibility];

export const ActivityQuestionType = {
  TEXT: 'text',
  SINGLE_CHOICE: 'single_choice',
  MULTI_CHOICE: 'multi_choice',
} as const;
export type ActivityQuestionType = (typeof ActivityQuestionType)[keyof typeof ActivityQuestionType];

export const SurveyQuestionType = { RATING: 'rating', TEXT: 'text' } as const;
export type SurveyQuestionType = (typeof SurveyQuestionType)[keyof typeof SurveyQuestionType];

export const RegistrationType = {
  PARTICIPANT: 'participant',
  STAFF_VOLUNTEER: 'staff_volunteer',
  CONTESTANT: 'contestant',
} as const;
export type RegistrationType = (typeof RegistrationType)[keyof typeof RegistrationType];

/** แหล่งของคะแนนประเมินรอบด้าน (360°) ฝั่งนักศึกษา — ตรงกับ enum AssessmentSource ใน schema.prisma */
export const AssessmentSource = { SELF: 'self', PEER: 'peer' } as const;
export type AssessmentSource = (typeof AssessmentSource)[keyof typeof AssessmentSource];

/** สถานะคะแนนของนักศึกษาหนึ่งกิจกรรม — ตรงกับ enum EvaluationStatus ใน schema.prisma */
export const EvaluationStatus = { PENDING_APPROVAL: 'pending_approval', APPROVED: 'approved' } as const;
export type EvaluationStatus = (typeof EvaluationStatus)[keyof typeof EvaluationStatus];
