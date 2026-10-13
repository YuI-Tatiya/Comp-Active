import { SOFT_SKILL_TIER_VALUES } from '../../../common/utils/soft-skill-cap.util';

/** น้ำหนักของแต่ละแหล่งในคะแนนสุทธิ (ตามดีไซน์ 360°) — แหล่งที่ไม่มีข้อมูลจะถูกตัดออกแล้วกระจายน้ำหนักที่เหลือตามสัดส่วนเดิม */
export const SOURCE_WEIGHTS = { organizer: 0.5, self: 0.2, peer: 0.3 } as const;

/** เพื่อนที่ส่งแล้วต้องมีอย่างน้อยเท่านี้ค่าเฉลี่ยจึงจะนับเป็นแหล่งข้อมูล */
export const MIN_PEERS = 2;

export type Tier = (typeof SOFT_SKILL_TIER_VALUES)[number];

export type ApprovalFlag = 'self_missing' | 'peer_incomplete' | 'divergent' | 'has_exception';

export interface SkillInputs {
  organizer: number;
  /** null = ยังไม่ส่งแบบประเมินตนเอง */
  self: number | null;
  /** ระดับที่เพื่อนแต่ละคนให้ (เฉพาะใบที่ส่งแล้ว) */
  peers: number[];
}

export interface SkillNet {
  organizer: number;
  self: number | null;
  /** ค่าเฉลี่ยจากเพื่อน — null ถ้าส่งมาไม่ถึง MIN_PEERS คน */
  peer: number | null;
  peerCount: number;
  /** ก่อนปัดเข้าระดับ */
  raw: number;
  recommended: Tier;
}

/** คำนวณ tolerance ของทศนิยม — ผลรวมที่ควรเป็น 1.5 หรือ 2.5 พอดีต้องนับเป็น "เสมอกัน" ไม่ใช่ตกข้างใดข้างหนึ่งเพราะความคลาดเคลื่อน */
const EPSILON = 1e-9;

/**
 * ปัดเข้าระดับ {1,2,3} ที่ใกล้ที่สุด — เสมอกัน (1.5, 2.5) ปัดขึ้น แล้วครอบเพดานของกิจกรรมเสมอ
 * ค่าที่ต่ำกว่าระดับต่ำสุดถูกยกขึ้นเป็นระดับต่ำสุด
 */
export function roundToTier(value: number, cap: number): Tier {
  const allowed = SOFT_SKILL_TIER_VALUES.filter((t) => t <= cap);
  const candidates = allowed.length > 0 ? allowed : [SOFT_SKILL_TIER_VALUES[0]];

  let best = candidates[0];
  for (const tier of candidates) {
    const distance = Math.abs(tier - value);
    const bestDistance = Math.abs(best - value);
    // เสมอกัน (ห่างเท่ากัน) → เอาค่าที่สูงกว่า
    if (distance < bestDistance - EPSILON || (Math.abs(distance - bestDistance) <= EPSILON && tier > best)) best = tier;
  }
  return best;
}

export function computeSkillNet(input: SkillInputs, cap: number): SkillNet {
  const peer = input.peers.length >= MIN_PEERS ? input.peers.reduce((sum, v) => sum + v, 0) / input.peers.length : null;

  let weighted = SOURCE_WEIGHTS.organizer * input.organizer;
  let weight = SOURCE_WEIGHTS.organizer;
  if (input.self !== null) {
    weighted += SOURCE_WEIGHTS.self * input.self;
    weight += SOURCE_WEIGHTS.self;
  }
  if (peer !== null) {
    weighted += SOURCE_WEIGHTS.peer * peer;
    weight += SOURCE_WEIGHTS.peer;
  }

  const raw = weighted / weight;
  return {
    organizer: input.organizer,
    self: input.self,
    peer,
    peerCount: input.peers.length,
    raw,
    recommended: roundToTier(raw, cap),
  };
}

const tierIndex = (tier: Tier) => SOFT_SKILL_TIER_VALUES.indexOf(tier);

/**
 * เหตุผลที่คนนี้ "ต้องตรวจสอบ" ก่อนอนุมัติ — ตัดออกจากปุ่มอนุมัติทั้งหมด
 * divergent = ตนเองกับเพื่อนห่างกัน 2 ระดับ (ผ่าน vs ดีเยี่ยม) ในทักษะใดทักษะหนึ่ง
 */
export function flagsFor(skills: SkillNet[], hasException: boolean, cap: number): ApprovalFlag[] {
  const flags: ApprovalFlag[] = [];

  if (skills.some((s) => s.self === null)) flags.push('self_missing');
  if (skills.some((s) => s.peer === null)) flags.push('peer_incomplete');
  if (
    skills.some(
      (s) =>
        s.self !== null &&
        s.peer !== null &&
        Math.abs(tierIndex(roundToTier(s.self, cap)) - tierIndex(roundToTier(s.peer, cap))) >= 2,
    )
  ) {
    flags.push('divergent');
  }
  if (hasException) flags.push('has_exception');

  return flags;
}

/** คะแนนฝั่งผู้จัดต่อคนต่อทักษะ = ข้อยกเว้นรายคน ?? คะแนนฐานของฝ่าย ?? ค่าเริ่มต้นของกิจกรรม (กฎเดียวกับ Batch Evaluation) */
export function resolveOrganizerScore(parts: { exception?: number; baseline?: number; rate: number }): number {
  return parts.exception ?? parts.baseline ?? parts.rate;
}
