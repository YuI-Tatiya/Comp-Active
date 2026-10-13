import { bangkokDateOnly, bangkokParts, formatHHmm } from "./time.util";

/**
 * ทุกฟังก์ชันต้องให้ผลตามเวลาไทยเสมอ ไม่ว่า process จะอยู่เขตเวลาไหน — บั๊กเดิม: formatHHmm ใช้ getHours()
 * ของ process ตอนรันใน container (UTC) กิจกรรม 09:30 จึงถูกบันทึกเป็น "02:30"
 * ชุดเทสต์ทั้งหมดรันในเขตเวลา UTC (jest.global-setup.js) เหมือน container จริง
 */
describe("time.util — always Asia/Bangkok, whatever the process time zone", () => {
  // 09:30 ตามเวลาไทยของวันที่ 18 ต.ค. 2026 = 02:30 UTC วันเดียวกัน
  const morning = new Date("2026-10-18T02:30:00.000Z");
  // 05:00 ตามเวลาไทยของวันที่ 18 = 22:00 UTC ของวันที่ 17 (ยังเป็น "เมื่อวาน" ใน UTC)
  const dawn = new Date("2026-10-17T22:00:00.000Z");

  it("runs in a non-Thai process time zone, so these tests can actually catch the bug", () => {
    // ถ้าเทสต์นี้ล้ม แปลว่ามีคนถอด globalSetup ออก — เทสต์ที่เหลือจะผ่านบนเครื่องที่ตั้งเวลาไทยแม้โค้ดจะพัง
    expect(morning.getHours()).toBe(2);
  });

  it("formatHHmm gives the Thai wall-clock time", () => {
    expect(formatHHmm(morning)).toBe("09:30");
    expect(formatHHmm(dawn)).toBe("05:00");
  });

  it("formatHHmm uses 24-hour time with leading zeros (midnight is 00:00, not 24:00)", () => {
    expect(formatHHmm(new Date("2026-10-17T17:00:00.000Z"))).toBe("00:00");
    expect(formatHHmm(new Date("2026-10-18T16:05:00.000Z"))).toBe("23:05");
  });

  it("bangkokDateOnly returns UTC midnight of the Thai calendar date", () => {
    expect(bangkokDateOnly(morning).toISOString()).toBe(
      "2026-10-18T00:00:00.000Z",
    );
    // ก่อน 07:00 ตามเวลาไทย วันที่ UTC ยังเป็นวันก่อนหน้า — ต้องได้วันที่ไทย (18) ไม่ใช่ 17
    expect(bangkokDateOnly(dawn).toISOString()).toBe(
      "2026-10-18T00:00:00.000Z",
    );
  });

  it("bangkokParts rolls the year at Thai midnight on New Year", () => {
    const newYear = new Date("2026-12-31T17:30:00.000Z"); // 00:30 วันที่ 1 ม.ค. 2027 ตามเวลาไทย
    expect(bangkokParts(newYear)).toMatchObject({
      year: 2027,
      month: 1,
      day: 1,
      hour: "00",
      minute: "30",
    });
  });
});
