import { ChatbotService } from './chatbot.service';

function makeConfig(values: Record<string, string | undefined>) {
  return { get: (key: string) => values[key] } as any;
}

/** default: ไม่มีกิจกรรมเปิดรับสมัคร — เทสต์ส่วนใหญ่ไม่ได้สนใจข้อมูลกิจกรรม จึงให้ว่างไว้เป็นค่าเริ่มต้น */
function makeActivitiesService(activities: unknown[] = []) {
  return { findOpenForChatbot: jest.fn().mockResolvedValue(activities) } as any;
}

function mockFetchOnce(response: { ok: boolean; status?: number; json?: () => Promise<unknown>; text?: () => Promise<string> }) {
  const fn = jest.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 500),
    json: response.json ?? (() => Promise.resolve({})),
    text: response.text ?? (() => Promise.resolve('')),
  });
  (global as any).fetch = fn;
  return fn;
}

describe('ChatbotService.reply', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete (global as any).fetch;
  });

  it('ไม่ได้ตั้งค่า GEMINI_API_KEY — คืนข้อความแจ้งว่ายังไม่เปิดใช้งาน ไม่เรียก fetch เลย', async () => {
    const fetchSpy = jest.fn();
    (global as any).fetch = fetchSpy;
    const service = new ChatbotService(makeConfig({ GEMINI_API_KEY: undefined }), makeActivitiesService());

    const reply = await service.reply('สวัสดี', [], null);

    expect(reply).toContain('ยังไม่ได้เปิดใช้งาน');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('เรียก Gemini สำเร็จ — แกะข้อความจาก candidates[0].content.parts มาต่อกัน', async () => {
    mockFetchOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          candidates: [{ content: { parts: [{ text: 'ลงทะเบียนได้ที่หน้า ' }, { text: 'กิจกรรม' }] } }],
        }),
    });
    const service = new ChatbotService(makeConfig({ GEMINI_API_KEY: 'test-key' }), makeActivitiesService());

    const reply = await service.reply('ลงทะเบียนยังไง', [], 'student');

    expect(reply).toBe('ลงทะเบียนได้ที่หน้า กิจกรรม');
  });

  it('ส่ง history + system instruction + ใช้ model จาก GEMINI_MODEL (ไม่ใช้ default) + ฝัง key ใน URL', async () => {
    const fetchSpy = mockFetchOnce({
      ok: true,
      json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }),
    });
    const service = new ChatbotService(
      makeConfig({ GEMINI_API_KEY: 'my-key', GEMINI_MODEL: 'gemini-custom' }),
      makeActivitiesService(),
    );

    await service.reply('ขอบคุณ', [{ role: 'user', text: 'สวัสดี' }, { role: 'model', text: 'สวัสดีค่ะ' }], 'organizer');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-custom:generateContent?key=my-key');
    const body = JSON.parse(init.body);
    expect(body.contents).toEqual([
      { role: 'user', parts: [{ text: 'สวัสดี' }] },
      { role: 'model', parts: [{ text: 'สวัสดีค่ะ' }] },
      { role: 'user', parts: [{ text: 'ขอบคุณ' }] },
    ]);
    expect(body.systemInstruction.parts[0].text).toContain('Comp Active');
    expect(body.systemInstruction.parts[0].text).toContain('ผู้จัดกิจกรรม');
  });

  it('ไม่ตั้ง GEMINI_MODEL — ใช้ค่า default gemini-3.8-flash', async () => {
    const fetchSpy = mockFetchOnce({
      ok: true,
      json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }),
    });
    const service = new ChatbotService(makeConfig({ GEMINI_API_KEY: 'my-key' }), makeActivitiesService());

    await service.reply('หวัดดี', [], null);

    const [url] = fetchSpy.mock.calls[0];
    expect(url).toContain('/models/gemini-3.8-flash:generateContent');
  });

  it('fetch throw (เครือข่ายล่ม) — ลองซ้ำจนครบ 3 ครั้งแล้วคืนข้อความ fallback ไม่ throw ต่อ', async () => {
    const fetchSpy = jest.fn().mockRejectedValue(new Error('network down'));
    (global as any).fetch = fetchSpy;
    const service = new ChatbotService(makeConfig({ GEMINI_API_KEY: 'test-key' }), makeActivitiesService());

    const reply = await service.reply('สวัสดี', [], null);

    expect(reply).toContain('เชื่อมต่อผู้ช่วย');
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it('Gemini ตอบ 503 ติดกันทุกครั้ง (โมเดลแน่น) — ลองซ้ำจนครบ 3 ครั้งแล้วคืนข้อความ fallback', async () => {
    const fetchSpy = mockFetchOnce({ ok: false, status: 503, text: () => Promise.resolve('model overloaded') });
    const service = new ChatbotService(makeConfig({ GEMINI_API_KEY: 'test-key' }), makeActivitiesService());

    const reply = await service.reply('สวัสดี', [], null);

    expect(reply).toContain('เชื่อมต่อผู้ช่วย');
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it('429 (เกินโควตา) ไม่ retry — retryDelay ที่ Gemini แนะนำมักเป็นหลักสิบวินาที ลองซ้ำทันทีไม่มีทางช่วย', async () => {
    const fetchSpy = mockFetchOnce({ ok: false, status: 429, text: () => Promise.resolve('quota exceeded, retry in 53s') });
    const service = new ChatbotService(makeConfig({ GEMINI_API_KEY: 'test-key' }), makeActivitiesService());

    const reply = await service.reply('สวัสดี', [], null);

    expect(reply).toContain('เชื่อมต่อผู้ช่วย');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('503 ครั้งแรกแล้วสำเร็จครั้งที่สอง — ลองซ้ำอัตโนมัติจนได้คำตอบจริง ไม่คืน fallback', async () => {
    const fetchSpy = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503, text: () => Promise.resolve('model overloaded') })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: 'ลองใหม่สำเร็จ' }] } }] }),
      });
    (global as any).fetch = fetchSpy;
    const service = new ChatbotService(makeConfig({ GEMINI_API_KEY: 'test-key' }), makeActivitiesService());

    const reply = await service.reply('สวัสดี', [], null);

    expect(reply).toBe('ลองใหม่สำเร็จ');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('fetch ค้างไม่ resolve/reject เลย (network แขวนจริง เช่น DNS/connection ค้าง) — AbortController ตัดตามเพดานเวลา ไม่แขวนไม่มีกำหนด', async () => {
    jest.useFakeTimers();
    try {
      const fetchSpy = jest.fn().mockImplementation((_url: unknown, init: any) => {
        // จำลอง fetch จริงที่ไม่ resolve/reject เองเลย — จะ reject ก็ต่อเมื่อ signal ถูก abort เท่านั้น
        return new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      });
      (global as any).fetch = fetchSpy;
      const service = new ChatbotService(makeConfig({ GEMINI_API_KEY: 'test-key' }), makeActivitiesService());

      const replyPromise = service.reply('สวัสดี', [], null);
      await jest.advanceTimersByTimeAsync(50_000); // เกินเพดานเลวร้ายสุด (3×15s+1.1s ≈ 46.1s) ให้ครบทั้ง 3 attempt

      const reply = await replyPromise;

      expect(reply).toContain('เชื่อมต่อผู้ช่วย');
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    } finally {
      jest.useRealTimers();
    }
  });

  it('สถานะที่ retry ไม่ช่วย (เช่น 400 คำขอผิดรูปแบบ) — ไม่ลองซ้ำ คืน fallback จากความพยายามครั้งเดียว', async () => {
    const fetchSpy = mockFetchOnce({ ok: false, status: 400, text: () => Promise.resolve('bad request') });
    const service = new ChatbotService(makeConfig({ GEMINI_API_KEY: 'test-key' }), makeActivitiesService());

    const reply = await service.reply('สวัสดี', [], null);

    expect(reply).toContain('เชื่อมต่อผู้ช่วย');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('ตอบ 200 แต่ไม่มี candidates (เช่น ถูก safety filter บล็อก) — คืนข้อความ fallback แทนสตริงว่าง', async () => {
    mockFetchOnce({ ok: true, json: () => Promise.resolve({ promptFeedback: { blockReason: 'SAFETY' } }) });
    const service = new ChatbotService(makeConfig({ GEMINI_API_KEY: 'test-key' }), makeActivitiesService());

    const reply = await service.reply('สวัสดี', [], null);

    expect(reply).toContain('ไม่สามารถประมวลผลคำตอบได้');
  });

  it('แปลงเป็น JSON ไม่สำเร็จ — คืนข้อความ fallback ไม่ throw ต่อ', async () => {
    mockFetchOnce({ ok: true, json: () => Promise.reject(new Error('bad json')) });
    const service = new ChatbotService(makeConfig({ GEMINI_API_KEY: 'test-key' }), makeActivitiesService());

    const reply = await service.reply('สวัสดี', [], null);

    expect(reply).toContain('ไม่สามารถประมวลผลคำตอบได้');
  });

  describe('ข้อมูลกิจกรรมที่เปิดรับสมัครอยู่ตอนนี้ (grounding context)', () => {
    it('มีกิจกรรมเปิดรับสมัคร — แปะรายชื่อ (ชื่อ/หมวดหมู่/วันที่/เวลา/สถานที่) ลงท้าย system instruction', async () => {
      const fetchSpy = mockFetchOnce({
        ok: true,
        json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }),
      });
      const activitiesService = makeActivitiesService([
        {
          name: 'ค่ายอาสาพัฒนาโรงเรียน',
          categories: ['อาสาสมัคร'],
          date: '2026-11-01T00:00:00.000Z',
          startTime: '08:00',
          endTime: '16:00',
          location: 'โรงเรียนบ้านหนองแวง',
        },
      ]);
      const service = new ChatbotService(makeConfig({ GEMINI_API_KEY: 'test-key' }), activitiesService);

      await service.reply('ช่วงนี้มีกิจกรรมอะไรเปิดรับสมัครบ้าง', [], null);

      expect(activitiesService.findOpenForChatbot).toHaveBeenCalledTimes(1);
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      const prompt = body.systemInstruction.parts[0].text;
      expect(prompt).toContain('ค่ายอาสาพัฒนาโรงเรียน');
      expect(prompt).toContain('อาสาสมัคร');
      expect(prompt).toContain('2026-11-01');
      expect(prompt).toContain('08:00-16:00');
      expect(prompt).toContain('โรงเรียนบ้านหนองแวง');
    });

    it('ไม่มีกิจกรรมเปิดรับสมัครเลย — บอกโมเดลตรงๆ ว่าไม่มี ไม่ปล่อยให้เดา', async () => {
      const fetchSpy = mockFetchOnce({
        ok: true,
        json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }),
      });
      const service = new ChatbotService(makeConfig({ GEMINI_API_KEY: 'test-key' }), makeActivitiesService([]));

      await service.reply('ช่วงนี้มีกิจกรรมอะไรเปิดรับสมัครบ้าง', [], null);

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.systemInstruction.parts[0].text).toContain('ไม่มีกิจกรรมที่เปิดรับสมัครอยู่เลยในขณะนี้');
    });

    it('findOpenForChatbot พัง (DB ล่ม ฯลฯ) — ไม่ทำให้ทั้งคำขอพัง ยังเรียก Gemini ต่อได้ตามปกติ', async () => {
      const fetchSpy = mockFetchOnce({
        ok: true,
        json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: 'ตอบได้ตามปกติ' }] } }] }),
      });
      const activitiesService = {
        findOpenForChatbot: jest.fn().mockRejectedValue(new Error('db down')),
      } as any;
      const service = new ChatbotService(makeConfig({ GEMINI_API_KEY: 'test-key' }), activitiesService);

      const reply = await service.reply('สวัสดี', [], null);

      expect(reply).toBe('ตอบได้ตามปกติ');
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.systemInstruction.parts[0].text).toContain('ดึงข้อมูลไม่สำเร็จชั่วคราว');
    });
  });
});
