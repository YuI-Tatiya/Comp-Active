import { MailerService } from "./mailer.service";

function makeConfig(values: Record<string, string | undefined>) {
  return { get: (key: string) => values[key] } as any;
}

function mockFetchOnce(response: { ok: boolean; status?: number; text?: () => Promise<string> }) {
  const fn = jest.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 500),
    text: response.text ?? (() => Promise.resolve("")),
  });
  (global as any).fetch = fn;
  return fn;
}

describe("MailerService.sendMail — ส่งผ่าน Resend (HTTPS API)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete (global as any).fetch;
  });

  it("ไม่ได้ตั้งค่า RESEND_API_KEY — throw ทันที ไม่เรียก fetch เลย", async () => {
    const fetchSpy = jest.fn();
    (global as any).fetch = fetchSpy;
    const service = new MailerService(makeConfig({}));

    await expect(
      service.sendMail({ to: "a@b.com", subject: "s", html: "<p>x</p>" }),
    ).rejects.toThrow(/RESEND_API_KEY/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("ส่งสำเร็จ — เรียก Resend API ด้วย Authorization header และ body ที่ถูกต้อง", async () => {
    const fetchSpy = mockFetchOnce({ ok: true });
    const service = new MailerService(
      makeConfig({ RESEND_API_KEY: "re_test_key", MAIL_FROM: "Comp Active <no-reply@example.test>" }),
    );

    await service.sendMail({ to: "student@kkumail.com", subject: "หัวข้อ", html: "<p>เนื้อหา</p>" });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer re_test_key");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      from: "Comp Active <no-reply@example.test>",
      to: "student@kkumail.com",
      subject: "หัวข้อ",
      html: "<p>เนื้อหา</p>",
    });
  });

  it("ไม่ได้ตั้ง MAIL_FROM — ใช้ค่า default", async () => {
    const fetchSpy = mockFetchOnce({ ok: true });
    const service = new MailerService(makeConfig({ RESEND_API_KEY: "re_test_key" }));

    await service.sendMail({ to: "a@b.com", subject: "s", html: "<p>x</p>" });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.from).toBe("Comp Active <no-reply@compactive.com>");
  });

  it("ตัด CR/LF ใน to/subject ก่อนส่ง (กัน header injection)", async () => {
    const fetchSpy = mockFetchOnce({ ok: true });
    const service = new MailerService(makeConfig({ RESEND_API_KEY: "re_test_key" }));

    await service.sendMail({
      to: "a@b.com",
      subject: "ปกติ\r\nBcc: attacker@evil.com",
      html: "<p>x</p>",
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.subject).not.toMatch(/[\r\n]/);
  });

  it("Resend ตอบ error status — throw พร้อมสถานะ ไม่กลืนเงียบ", async () => {
    mockFetchOnce({ ok: false, status: 422, text: () => Promise.resolve('{"message":"invalid from"}') });
    const service = new MailerService(makeConfig({ RESEND_API_KEY: "re_test_key" }));

    await expect(
      service.sendMail({ to: "a@b.com", subject: "s", html: "<p>x</p>" }),
    ).rejects.toThrow(/422/);
  });

  it("fetch ค้างเกิน timeout — throw แทนที่จะแขวนรอไม่รู้จบ", async () => {
    jest.useFakeTimers();
    (global as any).fetch = jest.fn(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
    );
    const service = new MailerService(makeConfig({ RESEND_API_KEY: "re_test_key" }));

    const pending = service.sendMail({ to: "a@b.com", subject: "s", html: "<p>x</p>" });
    const assertion = expect(pending).rejects.toThrow(/หมดเวลา/);
    await jest.advanceTimersByTimeAsync(15_000);
    await assertion;
    jest.useRealTimers();
  });
});
