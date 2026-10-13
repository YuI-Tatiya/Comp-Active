import { computeSkillNet, flagsFor, resolveOrganizerScore, roundToTier, MIN_PEERS } from './net-score.util';

describe('roundToTier — ปัดเข้าระดับ {1,2,3} ที่ใกล้สุด เสมอกันปัดขึ้น แล้วครอบเพดาน', () => {
  it.each([
    [0, 1],
    [1, 1],
    [1.4, 1],
    [1.5, 2], // เสมอกันระหว่าง 1 กับ 2 → ปัดขึ้น
    [1.6, 2],
    [2, 2],
    [2.4, 2],
    [2.5, 3], // เสมอกันระหว่าง 2 กับ 3 → ปัดขึ้น
    [2.6, 3],
    [3, 3],
  ])('%p → %p (เพดาน 3)', (value, expected) => {
    expect(roundToTier(value, 3)).toBe(expected);
  });

  it('ครอบเพดาน: ไม่เกินระดับสูงสุดที่กิจกรรมปลดล็อก', () => {
    expect(roundToTier(3, 2)).toBe(2);
    expect(roundToTier(2.6, 2)).toBe(2);
    expect(roundToTier(3, 1)).toBe(1);
  });

  it('ทนความคลาดเคลื่อนของทศนิยม: ค่าที่ควรเป็น 1.5 / 2.5 พอดีแต่เพี้ยนจาก FP ต้องนับเป็นเสมอกัน', () => {
    expect(roundToTier(1.4999999999999998, 3)).toBe(2);
    expect(roundToTier(2.4999999999999996, 3)).toBe(3);
  });
});

describe('computeSkillNet — คะแนนสุทธิต่อทักษะ', () => {
  it('ครบทั้งสามแหล่ง: 0.5·ผู้จัด + 0.2·ตนเอง + 0.3·เพื่อน', () => {
    const net = computeSkillNet({ organizer: 2, self: 3, peers: [2, 2] }, 3);
    expect(net.peer).toBe(2);
    expect(net.peerCount).toBe(2);
    expect(net.raw).toBeCloseTo(2.2, 6);
    expect(net.recommended).toBe(2);
  });

  it('เพื่อนใช้ค่าเฉลี่ย', () => {
    const net = computeSkillNet({ organizer: 3, self: 1, peers: [1, 2] }, 3);
    expect(net.peer).toBe(1.5);
    expect(net.raw).toBeCloseTo(2.15, 6);
    expect(net.recommended).toBe(2);
  });

  it('เพื่อนน้อยกว่า 2 คน = ไม่นับแหล่งนี้ แล้วกระจายน้ำหนักที่เหลือตามสัดส่วนเดิม', () => {
    expect(MIN_PEERS).toBe(2);
    const net = computeSkillNet({ organizer: 2, self: 3, peers: [3] }, 3);
    expect(net.peer).toBeNull();
    expect(net.peerCount).toBe(1);
    expect(net.raw).toBeCloseTo((0.5 * 2 + 0.2 * 3) / 0.7, 6);
    expect(net.recommended).toBe(2);
  });

  it('ตนเองยังไม่ส่ง: กระจายน้ำหนักให้ผู้จัดกับเพื่อน', () => {
    const net = computeSkillNet({ organizer: 3, self: null, peers: [3, 3] }, 3);
    expect(net.self).toBeNull();
    expect(net.raw).toBeCloseTo((0.5 * 3 + 0.3 * 3) / 0.8, 6);
    expect(net.recommended).toBe(3);
  });

  it('มีแต่ผู้จัด: ผลสุทธิ = คะแนนของผู้จัด (ไม่ค้างรอแหล่งอื่น)', () => {
    const net = computeSkillNet({ organizer: 2, self: null, peers: [] }, 3);
    expect(net.raw).toBe(2);
    expect(net.recommended).toBe(2);
  });

  it('เสมอกันที่ 2.5 ปัดขึ้นเป็น 3 และเสมอกันที่ 1.5 ปัดขึ้นเป็น 2', () => {
    expect(computeSkillNet({ organizer: 2, self: 3, peers: [3, 3] }, 3).recommended).toBe(3);
    expect(computeSkillNet({ organizer: 1, self: 2, peers: [2, 2] }, 3).recommended).toBe(2);
  });

  it('ครอบเพดานของกิจกรรมเสมอ แม้ทุกแหล่งให้สูงสุด', () => {
    expect(computeSkillNet({ organizer: 3, self: 3, peers: [3, 3] }, 2).recommended).toBe(2);
  });
});

describe('flagsFor — เหตุผลที่ต้องตรวจสอบก่อนอนุมัติ', () => {
  const net = (organizer: number, self: number | null, peers: number[]) => computeSkillNet({ organizer, self, peers }, 3);

  it('ครบทุกแหล่ง ไม่ขัดแย้ง ไม่มีข้อยกเว้น → ไม่มี flag', () => {
    expect(flagsFor([net(2, 2, [2, 3])], false, 3)).toEqual([]);
  });

  it('ตนเองยังไม่ส่ง → self_missing', () => {
    expect(flagsFor([net(2, null, [2, 2])], false, 3)).toEqual(['self_missing']);
  });

  it('เพื่อนส่งไม่ถึง 2 คน → peer_incomplete', () => {
    expect(flagsFor([net(2, 2, [2])], false, 3)).toEqual(['peer_incomplete']);
  });

  it('ขาดทั้งสองแหล่ง → ได้ทั้งสอง flag ตามลำดับคงที่', () => {
    expect(flagsFor([net(2, null, [])], false, 3)).toEqual(['self_missing', 'peer_incomplete']);
  });

  it.each([
    [1, [3, 3], true], // ตนเอง "ผ่าน" เพื่อน "ดีเยี่ยม"
    [3, [1, 1], true], // ตนเอง "ดีเยี่ยม" เพื่อน "ผ่าน"
    [2, [3, 3], false], // ห่างกันแค่ 1 ระดับ
    [1, [2, 2], false],
    [3, [2, 2], false],
  ])('ตนเอง %p vs เพื่อน %p → divergent=%p', (self, peers, expected) => {
    expect(flagsFor([net(2, self, peers)], false, 3).includes('divergent')).toBe(expected);
  });

  it('divergent ในทักษะใดทักษะหนึ่งก็พอ', () => {
    expect(flagsFor([net(2, 2, [2, 2]), net(2, 1, [3, 3])], false, 3)).toEqual(['divergent']);
  });

  it('ผู้จัดตั้งข้อยกเว้นไว้ → has_exception', () => {
    expect(flagsFor([net(2, 2, [2, 2])], true, 3)).toEqual(['has_exception']);
  });
});

describe('resolveOrganizerScore — ข้อยกเว้น ?? ฐานของฝ่าย ?? ค่าเริ่มต้นของกิจกรรม', () => {
  it('เลือกตามลำดับความสำคัญ', () => {
    expect(resolveOrganizerScore({ exception: 3, baseline: 2, rate: 1 })).toBe(3);
    expect(resolveOrganizerScore({ baseline: 2, rate: 1 })).toBe(2);
    expect(resolveOrganizerScore({ rate: 1 })).toBe(1);
  });

  it('ค่า 0 ไม่ถูกมองว่าไม่มีค่า', () => {
    expect(resolveOrganizerScore({ exception: 0, baseline: 2, rate: 1 })).toBe(0);
  });
});
