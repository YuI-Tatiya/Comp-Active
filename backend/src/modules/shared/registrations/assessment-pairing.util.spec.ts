import { pairPeers, PeerMember } from './assessment-pairing.util';

function members(spec: Record<string, number>): PeerMember[] {
  let id = 1;
  return Object.entries(spec).flatMap(([dutyRole, count]) =>
    Array.from({ length: count }, () => ({ registrationId: id++, dutyRole: dutyRole === '-' ? null : dutyRole })),
  );
}

function tally(pairs: { assessorId: number; targetId: number }[]) {
  const given = new Map<number, number>();
  const received = new Map<number, number>();
  for (const p of pairs) {
    given.set(p.assessorId, (given.get(p.assessorId) ?? 0) + 1);
    received.set(p.targetId, (received.get(p.targetId) ?? 0) + 1);
  }
  return { given, received };
}

describe('pairPeers', () => {
  it('ทุกคนประเมิน k คนและถูกประเมิน k คนพอดี (โหลดเท่ากัน) เมื่อกลุ่มมีอย่างน้อย k+1 คน', () => {
    const list = members({ ฝ่ายA: 6, ฝ่ายB: 5 });
    const { given, received } = tally(pairPeers(list, 2, 7));

    for (const m of list) {
      expect(given.get(m.registrationId)).toBe(2);
      expect(received.get(m.registrationId)).toBe(2);
    }
  });

  it('ไม่จับคู่ตัวเอง และไม่มีคู่ซ้ำ', () => {
    const pairs = pairPeers(members({ ฝ่ายA: 7, ฝ่ายB: 4 }), 2, 3);

    expect(pairs.every((p) => p.assessorId !== p.targetId)).toBe(true);
    const keys = pairs.map((p) => `${p.assessorId}>${p.targetId}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('จับคู่ภายในฝ่ายเดียวกันเมื่อฝ่ายนั้นใหญ่พอ (คนที่เห็นงานกัน)', () => {
    const list = members({ ฝ่ายA: 4, ฝ่ายB: 4 });
    const roleOf = new Map(list.map((m) => [m.registrationId, m.dutyRole]));

    for (const p of pairPeers(list, 2, 11)) {
      expect(roleOf.get(p.assessorId)).toBe(roleOf.get(p.targetId));
    }
  });

  it('ฝ่ายเล็กเกินไปถูกรวมเข้าฝ่ายใหญ่ ไม่ทิ้งให้ไม่มีเพื่อนประเมิน', () => {
    const list = members({ ฝ่ายA: 4, ฝ่ายB: 1 });
    const { given, received } = tally(pairPeers(list, 2, 5));

    for (const m of list) {
      expect(given.get(m.registrationId)).toBe(2);
      expect(received.get(m.registrationId)).toBe(2);
    }
  });

  it('ฝ่ายเล็กหลายฝ่ายรวมกันเป็นกลุ่มเศษที่จับกันเอง', () => {
    const list = members({ ฝ่ายA: 1, ฝ่ายB: 1, ฝ่ายC: 1 });
    const { given, received } = tally(pairPeers(list, 2, 5));

    for (const m of list) {
      expect(given.get(m.registrationId)).toBe(2);
      expect(received.get(m.registrationId)).toBe(2);
    }
  });

  it('คนที่ไม่มีฝ่ายนับเป็นกลุ่มเดียวกัน', () => {
    const list = members({ '-': 4 });
    expect(pairPeers(list, 2, 1)).toHaveLength(8);
  });

  it('คนน้อยกว่า k+1: ให้เท่าที่เป็นไปได้ (ทุกคนประเมินทุกคนที่เหลือ)', () => {
    expect(pairPeers(members({ ฝ่ายA: 2 }), 2, 1)).toHaveLength(2);
    expect(pairPeers(members({ ฝ่ายA: 1 }), 2, 1)).toEqual([]);
    expect(pairPeers([], 2, 1)).toEqual([]);
  });

  it('deterministic: input เดียวกัน seed เดียวกัน ได้ผลเหมือนเดิม และไม่ขึ้นกับลำดับของ input', () => {
    const list = members({ ฝ่ายA: 6, ฝ่ายB: 5 });
    const first = pairPeers(list, 2, 42);

    expect(pairPeers(list, 2, 42)).toEqual(first);
    expect(pairPeers([...list].reverse(), 2, 42)).toEqual(first);
  });

  it('seed ต่างกันให้การจับคู่ต่างกันได้', () => {
    const list = members({ ฝ่ายA: 8 });
    const seen = new Set(Array.from({ length: 10 }, (_, seed) => JSON.stringify(pairPeers(list, 2, seed))));
    expect(seen.size).toBeGreaterThan(1);
  });

  it('รองรับ k อื่น (k=1: ทุกคนประเมิน 1 คนและถูกประเมิน 1 คน)', () => {
    const list = members({ ฝ่ายA: 5 });
    const { given, received } = tally(pairPeers(list, 1, 9));

    for (const m of list) {
      expect(given.get(m.registrationId)).toBe(1);
      expect(received.get(m.registrationId)).toBe(1);
    }
  });
});
