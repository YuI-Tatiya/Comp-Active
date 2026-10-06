import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActivitiesService } from '../activities/activities.service';

export interface ChatHistoryItem {
  role: 'user' | 'model';
  text: string;
}

const FALLBACK_NOT_CONFIGURED =
  'ขออภัยค่ะ ระบบแชทบอทยังไม่ได้เปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ';
const FALLBACK_NETWORK_ERROR =
  'ขออภัยค่ะ ตอนนี้เชื่อมต่อผู้ช่วยตอบคำถามไม่ได้ ลองใหม่อีกครั้งในอีกสักครู่นะคะ';
const FALLBACK_EMPTY_REPLY =
  'ขออภัยค่ะ ไม่สามารถประมวลผลคำตอบได้ ลองถามอีกครั้งด้วยคำถามอื่นนะคะ';

const DEFAULT_MODEL = 'gemini-3.8-flash';

/** คุ้มค่าที่จะลองซ้ำแค่ 503 (โมเดลแน่นชั่วคราวฝั่ง Google — ทดสอบจริงแล้วว่ามักหายภายในเสี้ยววินาทีถึงไม่กี่วินาที)
 *  "429 เสมอ" คือเกินโควตา — ตัว error เองรวม retryDelay ที่มักเป็นหลักสิบวินาที (เช่น free tier บาง
 *  โมเดลจำกัดแค่ 5 ครั้ง/นาที) การลองซ้ำทันทีภายในคำขอเดียวจึงไม่มีทางสำเร็จ มีแต่เสียเวลาผู้ใช้ + ยิงซ้ำไปเปล่าๆ
 *  ส่วนสถานะอื่น (400/403/404 ฯลฯ) คือปัญหาถาวรของคำขอนั้น ลองใหม่ก็ได้ผลเหมือนเดิม */
const RETRYABLE_STATUSES = new Set([503]);
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [300, 800]; // หน่วงก่อนลองครั้งที่ 2 และ 3 ตามลำดับ

/** fetch() เปล่าไม่มี timeout ในตัว — ถ้า path ออกนอกจาก container ไปยัง Google สะดุด (DNS ค้าง/
 *  connection ค้าง) คำขอจะแขวนรอเฉยๆ ไม่ throw ไม่ resolve จนกว่า nginx proxy_read_timeout (default
 *  60s) จะตัดก่อนแล้วโยน 504 ให้ผู้ใช้เห็นหน้า error ของ nginx ตรงๆ (เจอจริงระหว่างทดสอบ) ยิ่งมี retry
 *  3 ครั้งยิ่งแขวนได้นานขึ้นไปอีก — ตั้งเพดานต่อครั้งไว้ชัดเจนด้วย AbortController กันเหตุนี้ 3 ครั้ง
 *  เลวร้ายสุด = 3×15s + 1.1s ดีเลย์ ≈ 46s ยังอยู่ใต้เพดาน 60s ของ nginx พอให้ fallback ข้อความตอบทัน */
const FETCH_TIMEOUT_MS = 15_000;

/**
 * เรียก Google AI Studio (Gemini API) ฝั่ง server เท่านั้น — ห้ามส่ง GEMINI_API_KEY ไปฝั่ง client
 * เด็ดขาด ไม่งั้นใครก็คัดลอกไปยิง API ด้วยโควตาของเราได้ นี่คือเหตุผลที่ฟีเจอร์นี้ต้องมี backend
 * endpoint มาคั่นกลาง ไม่ใช่ให้ frontend เรียก Gemini ตรง ๆ
 *
 * ไม่ผูกกับ record ของผู้ใช้จริงในระบบเลย (ไม่มีข้อมูลบัญชี/คะแนน/สถานะการลงทะเบียนส่วนตัวของใครทั้งนั้น) —
 * จึงไม่มีความเสี่ยงข้อมูลส่วนตัวหลุดจากฝั่งนี้ ต่อให้ prompt ถูกผู้ใช้พยายามแหกออกจากขอบเขตก็ตาม ข้อมูลเดียวที่ query
 * จริงคือรายชื่อกิจกรรมที่เปิดรับสมัครอยู่ตอนนี้ (ผ่าน ActivitiesService) ซึ่งเป็นข้อมูลสาธารณะอยู่แล้วบนหน้าแรก
 */
@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private warnedMissingKey = false;

  constructor(
    private readonly config: ConfigService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  async reply(message: string, history: ChatHistoryItem[], viewerRole: string | null): Promise<string> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')?.trim();
    if (!apiKey) {
      if (!this.warnedMissingKey) {
        this.logger.warn(
          'GEMINI_API_KEY ไม่ได้ตั้งค่า — แชทบอทจะตอบข้อความแจ้งเตือนแทนคำตอบจริงจนกว่าจะตั้งค่าใน .env (ขอฟรีได้ที่ https://aistudio.google.com/apikey)',
        );
        this.warnedMissingKey = true;
      }
      return FALLBACK_NOT_CONFIGURED;
    }

    const model = this.config.get<string>('GEMINI_MODEL')?.trim() || DEFAULT_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const activitiesContext = await this.buildActivitiesContext();

    const body = {
      contents: [
        ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
        { role: 'user', parts: [{ text: message }] },
      ],
      systemInstruction: { parts: [{ text: `${this.buildSystemPrompt(viewerRole)}\n\n${activitiesContext}` }] },
      // thinkingLevel: 'low' — รุ่น *-flash ตั้งแต่ Gemini 3 เปิด "คิดก่อนตอบ" (thinking) โดย
      // default และ maxOutputTokens นับรวม thinking token ด้วย ถ้าปล่อย default (medium/high)
      // งบ token เกือบทั้งหมดจะถูกกินไปกับการคิดจนคำตอบที่เห็นจริงถูกตัดกลางคัน — บอทนี้ตอบคำถาม
      // พื้นฐานเกี่ยวกับการใช้งานเว็บไซต์ ไม่ต้องใช้เหตุผลหลายขั้นตอน จึงตั้งต่ำสุดได้โดยไม่กระทบคุณภาพ
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 500,
        thinkingConfig: { thinkingLevel: 'low' },
      },
    };

    let res: Response | undefined;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (err) {
        const isTimeout = (err as Error).name === 'AbortError';
        const reason = isTimeout ? `หมดเวลา ${FETCH_TIMEOUT_MS / 1000}s` : (err as Error).message;
        this.logger.error(`เรียก Gemini API ไม่สำเร็จ (ครั้งที่ ${attempt}/${MAX_ATTEMPTS}): ${reason}`);
        if (attempt === MAX_ATTEMPTS) return FALLBACK_NETWORK_ERROR;
        await this.delay(RETRY_DELAYS_MS[attempt - 1]);
        continue;
      } finally {
        clearTimeout(timer);
      }

      if (res.ok) break;

      const errBody = await res.text().catch(() => '');
      this.logger.error(`Gemini API ตอบสถานะ ${res.status} (ครั้งที่ ${attempt}/${MAX_ATTEMPTS}): ${errBody.slice(0, 500)}`);
      if (!RETRYABLE_STATUSES.has(res.status) || attempt === MAX_ATTEMPTS) return FALLBACK_NETWORK_ERROR;
      await this.delay(RETRY_DELAYS_MS[attempt - 1]);
    }

    let data: unknown;
    try {
      // ผ่านลูปมาถึงนี่ได้ทางเดียวคือ break ตอน res.ok เป็นจริง (ทุกทางออกอื่นมี return คั่นไว้แล้ว) — res จึงพร้อมใช้เสมอ
      data = await res!.json();
    } catch (err) {
      this.logger.error(`แปลงคำตอบ Gemini API เป็น JSON ไม่สำเร็จ: ${(err as Error).message}`);
      return FALLBACK_EMPTY_REPLY;
    }

    const text = this.extractText(data);
    return text || FALLBACK_EMPTY_REPLY;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** ดึงรายชื่อกิจกรรมที่เปิดรับสมัครอยู่ตอนนี้มาแปะท้าย system prompt ให้โมเดลอิงตอบแทนการเดา/ปฏิเสธเฉยๆ
   *  พังก็ไม่ทำให้ทั้งคำขอพัง — แค่ตกไปใช้ข้อความบอกว่าดึงไม่สำเร็จแทน แล้วให้โมเดลแนะนำไปดูหน้าเว็บเอง */
  private async buildActivitiesContext(): Promise<string> {
    const HEADER = 'ข้อมูลกิจกรรมที่เปิดรับสมัครอยู่ตอนนี้ (ข้อมูลจริง ดึงสดก่อนตอบทุกครั้ง):';
    try {
      const activities = await this.activitiesService.findOpenForChatbot();
      if (activities.length === 0) {
        return `${HEADER} ไม่มีกิจกรรมที่เปิดรับสมัครอยู่เลยในขณะนี้`;
      }
      const lines = activities.map((a: any, i: number) => {
        const dateStr = new Date(a.date).toISOString().slice(0, 10);
        const categories = Array.isArray(a.categories) && a.categories.length > 0 ? a.categories.join(', ') : '-';
        return `${i + 1}. ${a.name} (${categories}) — วันที่ ${dateStr} เวลา ${a.startTime}-${a.endTime} น. ที่ ${a.location}`;
      });
      return [HEADER, ...lines].join('\n');
    } catch (err) {
      this.logger.error(`ดึงรายชื่อกิจกรรมที่เปิดรับสมัครไม่สำเร็จ: ${(err as Error).message}`);
      return `${HEADER} ดึงข้อมูลไม่สำเร็จชั่วคราว — แนะนำให้ผู้ใช้ไปดูที่หน้ากิจกรรมของเว็บไซต์โดยตรงแทน`;
    }
  }

  /** แกะ candidates[0].content.parts[].text ออกมาต่อกัน — เขียนแบบกันพังถ้ารูปแบบคำตอบเปลี่ยนไป (field ไหนหายก็คืนค่าว่าง ไม่ throw) */
  private extractText(data: unknown): string {
    const candidates = (data as { candidates?: unknown })?.candidates;
    if (!Array.isArray(candidates) || candidates.length === 0) return '';
    const parts = (candidates[0] as { content?: { parts?: unknown } })?.content?.parts;
    if (!Array.isArray(parts)) return '';
    return parts
      .map((p) => (typeof (p as { text?: unknown })?.text === 'string' ? (p as { text: string }).text : ''))
      .join('')
      .trim();
  }

  private buildSystemPrompt(viewerRole: string | null): string {
    const roleNote =
      viewerRole === 'student'
        ? 'ผู้ถามล็อกอินอยู่ในฐานะนักศึกษา'
        : viewerRole === 'organizer'
          ? 'ผู้ถามล็อกอินอยู่ในฐานะผู้จัดกิจกรรม'
          : 'ผู้ถามยังไม่ได้ล็อกอิน (เป็นบุคคลทั่วไปที่กำลังดูเว็บไซต์)';

    return [
      'คุณคือผู้ช่วยตอบคำถามบนเว็บไซต์ "Comp Active" ซึ่งเป็นแพลตฟอร์มของวิทยาลัยการคอมพิวเตอร์ สำหรับ',
      'จัดการกิจกรรม เก็บคะแนนทักษะ soft skills (เช่น การสื่อสาร การทำงานเป็นทีม ความเป็นผู้นำ) และขอใบรับรองจิตอาสา',
      'มีผู้ใช้ 3 กลุ่มหลัก: นักศึกษา (ลงทะเบียนกิจกรรม เก็บคะแนนทักษะ ขอใบรับรองจิตอาสา), ผู้จัดกิจกรรม/organizer',
      '(สร้างกิจกรรม กำหนดคะแนนทักษะ ดูรายชื่อผู้ลงทะเบียน), และผู้ดูแลระบบ/admin',
      `${roleNote}`,
      '',
      'กติกาการตอบ:',
      '- ตอบเป็นภาษาไทย สั้น กระชับ เป็นกันเอง เข้าใจง่าย',
      '- ตอบได้เฉพาะคำถามเกี่ยวกับการใช้งานเว็บไซต์นี้ (วิธีลงทะเบียนกิจกรรม วิธีดูคะแนนทักษะ วิธีขอใบรับรองจิตอาสา',
      '  วิธีสร้างกิจกรรม กิจกรรมที่เปิดรับสมัครอยู่ตอนนี้ ฯลฯ) ถ้าถามเรื่องอื่นที่ไม่เกี่ยวข้อง ให้ปฏิเสธอย่างสุภาพแล้วชวนกลับมาคุยเรื่องเว็บไซต์',
      '- ท้ายข้อความนี้มี "ข้อมูลกิจกรรมที่เปิดรับสมัครอยู่ตอนนี้" ซึ่งเป็นข้อมูลจริงที่ดึงสดก่อนตอบทุกครั้ง ใช้ตอบคำถาม',
      '  เกี่ยวกับกิจกรรมที่เปิดอยู่ได้เลยโดยอิงจากรายการนั้นเท่านั้น ห้ามแต่งชื่อ/วันที่/รายละเอียดกิจกรรมที่ไม่อยู่ในรายการขึ้นมาเอง',
      '- ข้อมูลกิจกรรมด้านล่างเป็นข้อมูลสาธารณะ แต่คุณไม่มีสิทธิ์เข้าถึงข้อมูลบัญชีหรือข้อมูลส่วนตัวของผู้ใช้จริง ๆ เลย',
      '  (เช่น ใครลงทะเบียนไว้บ้าง คะแนนของใคร สถานะการลงทะเบียนของใคร) ห้ามแต่งข้อมูลเหล่านี้ขึ้นมาเองเด็ดขาด',
      '  ถ้าคำถามต้องใช้ข้อมูลเฉพาะบัญชี ให้แนะนำให้ไปดูในหน้าที่เกี่ยวข้องของเว็บไซต์ หรือติดต่อผู้จัดกิจกรรม/ผู้ดูแลระบบโดยตรงแทน',
      '- ถ้าไม่แน่ใจคำตอบ ให้บอกตามตรงว่าไม่แน่ใจ ไม่ต้องเดา',
    ].join('\n');
  }
}
