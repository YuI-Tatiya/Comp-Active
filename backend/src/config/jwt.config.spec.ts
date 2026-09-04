/**
 * A02/A07 — JWT_SECRET ต้อง "ล้มตั้งแต่บูต" ไม่ใช่รันต่อด้วย secret ที่ใครก็เดาได้
 *
 * ของเดิมเป็น `process.env.JWT_SECRET || 'default-secret'` ถ้าลืมตั้ง env ระบบจะบูตขึ้น
 * ตามปกติแต่เซ็น JWT ด้วยคำที่อยู่ในซอร์สโค้ด — ปลอม token เป็น admin ได้ทันที
 */
describe("jwt.config — บังคับให้มี JWT_SECRET ที่ใช้ได้จริง", () => {
  const original = process.env.JWT_SECRET;

  const loadFactory = async () => {
    jest.resetModules();
    const mod = await import("./jwt.config");
    return mod.default;
  };

  afterEach(() => {
    if (original === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = original;
  });

  it("ไม่ตั้ง JWT_SECRET → ต้อง throw ไม่ใช่ fallback เป็นค่า default", async () => {
    delete process.env.JWT_SECRET;
    const factory = await loadFactory();
    expect(() => factory()).toThrow(/JWT_SECRET ไม่ได้ถูกตั้งค่า/);
  });

  it("ใช้ค่าตัวอย่างจาก .env.example → ต้อง throw", async () => {
    process.env.JWT_SECRET =
      "your-super-secret-jwt-key-change-this-in-production";
    const factory = await loadFactory();
    expect(() => factory()).toThrow(/ค่าตัวอย่าง/);
  });

  it('ค่าเดิมที่เคย fallback อยู่ ("default-secret") → ต้อง throw', async () => {
    process.env.JWT_SECRET = "default-secret";
    const factory = await loadFactory();
    expect(() => factory()).toThrow();
  });

  it("ค่าตัวอย่างจาก README (ยาวพอแต่เปิดเผยต่อสาธารณะ) → ต้อง throw", async () => {
    process.env.JWT_SECRET = "paste-a-generated-value-here-at-least-32-chars";
    expect(process.env.JWT_SECRET.length).toBeGreaterThanOrEqual(32); // ผ่านเกณฑ์ความยาว
    const factory = await loadFactory();
    expect(() => factory()).toThrow(/ค่าตัวอย่าง/); // แต่ต้องถูกปฏิเสธอยู่ดี
  });

  it("secret สั้นเกินไป → ต้อง throw", async () => {
    process.env.JWT_SECRET = "short-secret-123";
    const factory = await loadFactory();
    expect(() => factory()).toThrow(/สั้นเกินไป/);
  });

  it("secret สุ่มยาวพอ → ผ่าน และคืนค่าที่ตั้งไว้", async () => {
    const strong = "x9K2mQ7vB4nR8tY6uI3oP1aS5dF0gH2jK4lZ7xC9vB1n";
    process.env.JWT_SECRET = strong;
    const factory = await loadFactory();
    expect(() => factory()).not.toThrow();
    expect(factory().secret).toBe(strong);
  });
});
