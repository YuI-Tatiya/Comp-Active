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

  it('ไม่ได้ตั้งค่า CHATBOT_API_KEY — คืนข้อความแจ้งว่ายังไม่เปิดใช้งาน ไม่เรียก fetch เลย', async () => {
    const fetchSpy = jest.fn();
    (global as any).fetch = fetchSpy;
    const service = new ChatbotService(makeConfig({ CHATBOT_API_KEY: undefined }), makeActivitiesService());

    const reply = await service.reply('สวัสดี', [], null);

    expect(reply).toContain('ยังไม่ได้เปิดใช้งาน');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('เรียก Chatbot API สำเร็จ — แกะข้อความจาก choices[0].message.content', async () => {
    mockFetchOnce({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { role: 'assistant', content: 'ลงทะเบียนได้ที่หน้ากิจกรรม' } }] }),
    });
    const service = new ChatbotService(makeConfig({ CHATBOT_API_KEY: 'test-key' }), makeActivitiesService());

    const reply = await service.reply('ลงทะเบียนยังไง', [], 'student');

    expect(reply).toBe('ลงทะเบียนได้ที่หน้ากิจกรรม');
  });

  it('ส่ง history + system prompt (ข้อความแรก) + ใช้ model จาก CHATBOT_MODEL (ไม่ใช้ default) + ใช้ Authorization: Bearer', async () => {
    const fetchSpy = mockFetchOnce({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
    });
    const service = new ChatbotService(
      makeConfig({ CHATBOT_API_KEY: 'my-key', CHATBOT_MODEL: 'custom-model' }),
      makeActivitiesService(),
    );

    await service.reply('ขอบคุณ', [{ role: 'user', text: 'สวัสดี' }, { role: 'model', text: 'สวัสดีค่ะ' }], 'organizer');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://gen.ai.kku.ac.th/api/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer my-key');
    const body = JSON.parse(init.body);
    expect(body.model).toBe('custom-model');
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[0].content).toContain('Comp Active');
    expect(body.messages[0].content).toContain('ผู้จัดกิจกรรม');
    expect(body.messages.slice(1)).toEqual([
      { role: 'user', content: 'สวัสดี' },
      { role: 'assistant', content: 'สวัสดีค่ะ' }, // role 'model' (ของ DTO เดิม) แปลงเป็น 'assistant' ตามรูปแบบ OpenAI
      { role: 'user', content: 'ขอบคุณ' },
    ]);
  });

  it('ไม่ตั้ง CHATBOT_MODEL — ใช้ค่า default gemini-3.5-flash-lite', async () => {
    const fetchSpy = mockFetchOnce({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
    });
    const service = new ChatbotService(makeConfig({ CHATBOT_API_KEY: 'my-key' }), makeActivitiesService());

    await service.reply('หวัดดี', [], null);

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.model).toBe('gemini-3.5-flash-lite');
  });

  it('ไม่ตั้ง CHATBOT_BASE_URL — ใช้ gen.ai.kku.ac.th เป็นค่า default', async () => {
    const fetchSpy = mockFetchOnce({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
    });
    const service = new ChatbotService(makeConfig({ CHATBOT_API_KEY: 'my-key' }), makeActivitiesService());

    await service.reply('หวัดดี', [], null);

    expect(fetchSpy.mock.calls[0][0]).toBe('https://gen.ai.kku.ac.th/api/v1/chat/completions');
  });

  it('ตั้ง CHATBOT_BASE_URL เอง (มี / ท้ายด้วย) — ตัด / ซ้ำแล้วต่อ /chat/completions ให้ถูก', async () => {
    const fetchSpy = mockFetchOnce({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
    });
    const service = new ChatbotService(
      makeConfig({ CHATBOT_API_KEY: 'my-key', CHATBOT_BASE_URL: 'https://example.internal/v1/' }),
      makeActivitiesService(),
    );

    await service.reply('หวัดดี', [], null);

    expect(fetchSpy.mock.calls[0][0]).toBe('https://example.internal/v1/chat/completions');
  });

  it('fetch throw (เครือข่ายล่ม) — ลองซ้ำจนครบ 3 ครั้งแล้วคืนข้อความ fallback ไม่ throw ต่อ', async () => {
    const fetchSpy = jest.fn().mockRejectedValue(new Error('network down'));
    (global as any).fetch = fetchSpy;
    const service = new ChatbotService(makeConfig({ CHATBOT_API_KEY: 'test-key' }), makeActivitiesService());

    const reply = await service.reply('สวัสดี', [], null);

    expect(reply).toContain('เชื่อมต่อผู้ช่วย');
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it('ต้นทางตอบ 503 ติดกันทุกครั้ง (แน่นชั่วคราว) — ลองซ้ำจนครบ 3 ครั้งแล้วคืนข้อความ fallback', async () => {
    const fetchSpy = mockFetchOnce({ ok: false, status: 503, text: () => Promise.resolve('model overloaded') });
    const service = new ChatbotService(makeConfig({ CHATBOT_API_KEY: 'test-key' }), makeActivitiesService());

    const reply = await service.reply('สวัสดี', [], null);

    expect(reply).toContain('เชื่อมต่อผู้ช่วย');
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it('429 (เกินโควตา/rate limit) ไม่ retry — รอบปกติมักต้องรอเป็นสิบวินาที ลองซ้ำทันทีไม่มีทางช่วย', async () => {
    const fetchSpy = mockFetchOnce({ ok: false, status: 429, text: () => Promise.resolve('rate limit exceeded') });
    const service = new ChatbotService(makeConfig({ CHATBOT_API_KEY: 'test-key' }), makeActivitiesService());

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
        json: () => Promise.resolve({ choices: [{ message: { content: 'ลองใหม่สำเร็จ' } }] }),
      });
    (global as any).fetch = fetchSpy;
    const service = new ChatbotService(makeConfig({ CHATBOT_API_KEY: 'test-key' }), makeActivitiesService());

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
      const service = new ChatbotService(makeConfig({ CHATBOT_API_KEY: 'test-key' }), makeActivitiesService());

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
    const service = new ChatbotService(makeConfig({ CHATBOT_API_KEY: 'test-key' }), makeActivitiesService());

    const reply = await service.reply('สวัสดี', [], null);

    expect(reply).toContain('เชื่อมต่อผู้ช่วย');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('ตอบ 200 แต่ไม่มี choices (เช่น ถูก content filter บล็อก) — คืนข้อความ fallback แทนสตริงว่าง', async () => {
    mockFetchOnce({ ok: true, json: () => Promise.resolve({ choices: [] }) });
    const service = new ChatbotService(makeConfig({ CHATBOT_API_KEY: 'test-key' }), makeActivitiesService());

    const reply = await service.reply('สวัสดี', [], null);

    expect(reply).toContain('ไม่สามารถประมวลผลคำตอบได้');
  });

  it('แปลงเป็น JSON ไม่สำเร็จ — คืนข้อความ fallback ไม่ throw ต่อ', async () => {
    mockFetchOnce({ ok: true, json: () => Promise.reject(new Error('bad json')) });
    const service = new ChatbotService(makeConfig({ CHATBOT_API_KEY: 'test-key' }), makeActivitiesService());

    const reply = await service.reply('สวัสดี', [], null);

    expect(reply).toContain('ไม่สามารถประมวลผลคำตอบได้');
  });

  describe('ข้อมูลกิจกรรมที่เปิดรับสมัครอยู่ตอนนี้ (grounding context)', () => {
    it('มีกิจกรรมเปิดรับสมัคร — แปะรายชื่อ (ชื่อ/หมวดหมู่/วันที่/เวลา/สถานที่) ลงท้าย system prompt', async () => {
      const fetchSpy = mockFetchOnce({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
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
      const service = new ChatbotService(makeConfig({ CHATBOT_API_KEY: 'test-key' }), activitiesService);

      await service.reply('ช่วงนี้มีกิจกรรมอะไรเปิดรับสมัครบ้าง', [], null);

      expect(activitiesService.findOpenForChatbot).toHaveBeenCalledTimes(1);
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      const prompt = body.messages[0].content;
      expect(prompt).toContain('ค่ายอาสาพัฒนาโรงเรียน');
      expect(prompt).toContain('อาสาสมัคร');
      expect(prompt).toContain('2026-11-01');
      expect(prompt).toContain('08:00-16:00');
      expect(prompt).toContain('โรงเรียนบ้านหนองแวง');
    });

    it('ไม่มีกิจกรรมเปิดรับสมัครเลย — บอกโมเดลตรงๆ ว่าไม่มี ไม่ปล่อยให้เดา', async () => {
      const fetchSpy = mockFetchOnce({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
      });
      const service = new ChatbotService(makeConfig({ CHATBOT_API_KEY: 'test-key' }), makeActivitiesService([]));

      await service.reply('ช่วงนี้มีกิจกรรมอะไรเปิดรับสมัครบ้าง', [], null);

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.messages[0].content).toContain('ไม่มีกิจกรรมที่เปิดรับสมัครอยู่เลยในขณะนี้');
    });

    it('findOpenForChatbot พัง (DB ล่ม ฯลฯ) — ไม่ทำให้ทั้งคำขอพัง ยังเรียก Chatbot API ต่อได้ตามปกติ', async () => {
      const fetchSpy = mockFetchOnce({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: { content: 'ตอบได้ตามปกติ' } }] }),
      });
      const activitiesService = {
        findOpenForChatbot: jest.fn().mockRejectedValue(new Error('db down')),
      } as any;
      const service = new ChatbotService(makeConfig({ CHATBOT_API_KEY: 'test-key' }), activitiesService);

      const reply = await service.reply('สวัสดี', [], null);

      expect(reply).toBe('ตอบได้ตามปกติ');
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.messages[0].content).toContain('ดึงข้อมูลไม่สำเร็จชั่วคราว');
    });
  });
});
