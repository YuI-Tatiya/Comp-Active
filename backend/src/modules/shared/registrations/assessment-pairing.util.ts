export interface PeerMember {
  registrationId: number;
  dutyRole: string | null;
}

export interface PeerPair {
  assessorId: number;
  targetId: number;
}

/** PRNG แบบมี seed (mulberry32) — ต้องได้ผลเหมือนเดิมเมื่อ input เหมือนเดิม จึงไม่ใช้ Math.random */
function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * จับคู่เพื่อนประเมินกัน — ทุกคนประเมินเพื่อน `k` คน และถูกประเมินโดยเพื่อน `k` คนพอดี (โหลดเท่ากันทุกคน)
 *
 * วิธีทำ: สับลำดับสมาชิกในแต่ละกลุ่ม แล้วให้คนที่ i ประเมินคนที่ i+1..i+k (วนรอบ) — ไม่จับตัวเอง ไม่ซ้ำ
 * - จับคู่ภายในฝ่าย (dutyRole) เดียวกันก่อน เพราะเป็นคนที่เห็นงานกันจริง
 * - ฝ่ายที่เล็กกว่า k+1 คนจะมีเพื่อนไม่พอ จึงรวมสมาชิกของฝ่ายเล็กๆ เข้าด้วยกัน; ถ้ายังไม่ถึง k+1 ให้ยัดเข้าฝ่ายใหญ่
 *   ที่เล็กที่สุด (ยังคงให้/รับ k พอดี) — ไม่ทิ้งใครให้ไม่มีเพื่อนประเมินตราบใดที่ทั้งกิจกรรมมีคน > k
 * - ทั้งกิจกรรมมีคนไม่เกิน k: ให้เท่าที่เป็นไปได้ (ทุกคนประเมินทุกคนที่เหลือ)
 *
 * seed ถูกกำหนดจากกิจกรรม เพื่อให้เรียกซ้ำ/เรียกพร้อมกันได้ผลเหมือนกัน (สร้างใบงานแบบ idempotent โดยไม่ต้องล็อก)
 * คู่ประเมินไม่ใช่ความลับ จึงไม่จำเป็นต้องใช้ตัวสุ่มระดับ crypto
 * ผลไม่ขึ้นกับลำดับของ input
 */
export function pairPeers(members: PeerMember[], k: number, seed: number): PeerPair[] {
  if (members.length < 2 || k < 1) return [];

  const sorted = [...members].sort((a, b) => a.registrationId - b.registrationId);

  const byRole = new Map<string, PeerMember[]>();
  for (const m of sorted) {
    const key = m.dutyRole ?? '';
    byRole.set(key, [...(byRole.get(key) ?? []), m]);
  }
  const groups = [...byRole.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, list]) => list);

  const pools = groups.filter((g) => g.length >= k + 1);
  const leftover = groups.filter((g) => g.length < k + 1).flat();

  if (leftover.length > 0) {
    if (leftover.length >= k + 1 || pools.length === 0) {
      pools.push(leftover);
    } else {
      // ยัดเข้าฝ่ายใหญ่ที่เล็กที่สุด — ขนาดยังเป็น ≥ k+1 จึงคงให้/รับ k พอดี
      const smallest = pools.reduce((min, p) => (p.length < min.length ? p : min), pools[0]);
      smallest.push(...leftover);
    }
  }

  const random = seededRandom(seed);
  const pairs: PeerPair[] = [];

  for (const pool of pools) {
    const order = shuffle(pool, random);
    const n = order.length;
    const perPerson = Math.min(k, n - 1);
    for (let i = 0; i < n; i++) {
      for (let d = 1; d <= perPerson; d++) {
        pairs.push({ assessorId: order[i].registrationId, targetId: order[(i + d) % n].registrationId });
      }
    }
  }

  return pairs;
}
