import { computeSkillNet, flagsFor, resolveOrganizerScore, roundToTier, MIN_PEERS } from './net-score.util';

describe('roundToTier — ปัดเข้าระดับ {2,3,5} ที่ใกล้สุด เสมอกันปัดขึ้น แล้วครอบเพดาน', () => {
  it.each([
    [1, 2],
    [2, 2],
    [2.4, 2],
    [2.5, 3], // เสมอกันระหว่าง 2 กับ 3 → ปัดขึ้น
    [2.6, 3],
    [3, 3],
    [3.9, 3],
    [4, 5], // เสมอกันระหว่าง 3 กับ 5 → ปัดขึ้น
    [4.1, 5],
    [5, 5],
  ])('%p → %p (เพดาน 5)', (value, expected) => {
    expect(roundToTier(value, 5)).toBe(expected);
  });

  it('ครอบเพดาน: ไม่เกินระดับสูงสุดที่กิจกรรมปลดล็อก', () => {
    expect(roundToTier(5, 3)).toBe(3);
    expect(roundToTier(4.4, 3)).toBe(3);
    expect(roundToTier(5, 2)).toBe(2);
  });

  it('ทนความคลาดเคลื่อนของทศนิยม: ผลรวมที่ควรเป็น 2.5 / 4 พอดีต้องนับเป็นเสมอกัน', () => {
    expect(roundToTier(0.1 + 0.2 + 2.2, 5)).toBe(3); // 2.5000000000000004
    expect(roundToTier(3.9999999999999996, 5)).toBe(5);
  });
});

describe('computeSkillNet — คะแนนสุทธิต่อทักษะ', () => {
  it('ครบทั้งสามแหล่ง: 0.5·ผู้จัด + 0.2·ตนเอง + 0.3·เพื่อน', () => {
    const net = computeSkillNet({ organizer: 3, self: 5, peers: [3, 3] }, 5);
    expect(net.peer).toBe(3);
    expect(net.peerCount).toBe(2);
    expect(net.raw).toBeCloseTo(3.4, 6);
    expect(net.recommended).toBe(3);
  });

  it('เพื่อนใช้ค่าเฉลี่ย', () => {
    const net = computeSkillNet({ organizer: 5, self: 2, peers: [2, 3] }, 5);
    expect(net.peer).toBe(2.5);
    expect(net.raw).toBeCloseTo(3.65, 6);
    expect(net.recommended).toBe(3);
  });

  it('เพื่อนน้อยกว่า 2 คน = ไม่นับแหล่งนี้ แล้วกระจายน้ำหนักที่เหลือตามสัดส่วนเดิม', () => {
    expect(MIN_PEERS).toBe(2);
    const net = computeSkillNet({ organizer: 3, self: 5, peers: [5] }, 5);
    expect(net.peer).toBeNull();
    expect(net.peerCount).toBe(1);
    expect(net.raw).toBeCloseTo((0.5 * 3 + 0.2 * 5) / 0.7, 6);
    expect(net.recommended).toBe(3);
  });

  it('ตนเองยังไม่ส่ง: กระจายน้ำหนักให้ผู้จัดกับเพื่อน', () => {
    const net = computeSkillNet({ organizer: 5, self: null, peers: [5, 5] }, 5);
    expect(net.self).toBeNull();
    expect(net.raw).toBeCloseTo((0.5 * 5 + 0.3 * 5) / 0.8, 6);
    expect(net.recommended).toBe(5);
  });

  it('มีแต่ผู้จัด: ผลสุทธิ = คะแนนของผู้จัด (ไม่ค้างรอแหล่งอื่น)', () => {
    const net = computeSkillNet({ organizer: 3, self: null, peers: [] }, 5);
    expect(net.raw).toBe(3);
    expect(net.recommended).toBe(3);
  });

  it('เสมอกันที่ 4.0 ปัดขึ้นเป็น 5 และเสมอกันที่ 2.5 ปัดขึ้นเป็น 3', () => {
    expect(computeSkillNet({ organizer: 3, self: 5, peers: [5, 5] }, 5).recommended).toBe(5);
    expect(computeSkillNet({ organizer: 2, self: 3, peers: [3, 3] }, 5).recommended).toBe(3);
  });

  it('ครอบเพดานของกิจกรรมเสมอ แม้ทุกแหล่งให้สูงสุด', () => {
    expect(computeSkillNet({ organizer: 5, self: 5, peers: [5, 5] }, 3).recommended).toBe(3);
  });
});

describe('flagsFor — เหตุผลที่ต้องตรวจสอบก่อนอนุมัติ', () => {
  const net = (organizer: number, self: number | null, peers: number[]) => computeSkillNet({ organizer, self, peers }, 5);

  it('ครบทุกแหล่ง ไม่ขัดแย้ง ไม่มีข้อยกเว้น → ไม่มี flag', () => {
    expect(flagsFor([net(3, 3, [3, 5])], false, 5)).toEqual([]);
  });

  it('ตนเองยังไม่ส่ง → self_missing', () => {
    expect(flagsFor([net(3, null, [3, 3])], false, 5)).toEqual(['self_missing']);
  });

  it('เพื่อนส่งไม่ถึง 2 คน → peer_incomplete', () => {
    expect(flagsFor([net(3, 3, [3])], false, 5)).toEqual(['peer_incomplete']);
  });

  it('ขาดทั้งสองแหล่ง → ได้ทั้งสอง flag ตามลำดับคงที่', () => {
    expect(flagsFor([net(3, null, [])], false, 5)).toEqual(['self_missing', 'peer_incomplete']);
  });

  it.each([
    [2, [5, 5], true], // ตนเอง "ผ่าน" เพื่อน "ดีเยี่ยม"
    [5, [2, 2], true], // ตนเอง "ดีเยี่ยม" เพื่อน "ผ่าน"
    [3, [5, 5], false], // ห่างกันแค่ 1 ระดับ
    [2, [3, 3], false],
    [5, [3, 3], false],
  ])('ตนเอง %p vs เพื่อน %p → divergent=%p', (self, peers, expected) => {
    expect(flagsFor([net(3, self, peers)], false, 5).includes('divergent')).toBe(expected);
  });

  it('divergent ในทักษะใดทักษะหนึ่งก็พอ', () => {
    expect(flagsFor([net(3, 3, [3, 3]), net(3, 2, [5, 5])], false, 5)).toEqual(['divergent']);
  });

  it('ผู้จัดตั้งข้อยกเว้นไว้ → has_exception', () => {
    expect(flagsFor([net(3, 3, [3, 3])], true, 5)).toEqual(['has_exception']);
  });
});

describe('resolveOrganizerScore — ข้อยกเว้น ?? ฐานของฝ่าย ?? ค่าเริ่มต้นของกิจกรรม', () => {
  it('เลือกตามลำดับความสำคัญ', () => {
    expect(resolveOrganizerScore({ exception: 5, baseline: 3, rate: 2 })).toBe(5);
    expect(resolveOrganizerScore({ baseline: 3, rate: 2 })).toBe(3);
    expect(resolveOrganizerScore({ rate: 2 })).toBe(2);
  });

  it('ค่า 0 ไม่ถูกมองว่าไม่มีค่า', () => {
    expect(resolveOrganizerScore({ exception: 0, baseline: 3, rate: 2 })).toBe(0);
  });
});
