import { Injectable } from '@nestjs/common';
import { EventDraftRepository } from './event-draft.repository';

export interface EventDraftResult {
  payload: unknown;
  updatedAt: Date;
}

@Injectable()
export class EventDraftService {
  constructor(private readonly eventDraftRepository: EventDraftRepository) {}

  // null = ยังไม่เคยบันทึกฉบับร่าง — ไม่ใช่ error, หน้าสร้างงานอ่านค่านี้แล้วตัดสินใจว่าจะเสนอ "ดำเนินการต่อ" หรือไม่
  async getDraft(organizerId: number): Promise<EventDraftResult | null> {
    const draft = await this.eventDraftRepository.findByOrganizer(organizerId);
    if (!draft) return null;
    return { payload: draft.payload, updatedAt: draft.updatedAt };
  }

  async saveDraft(organizerId: number, payload: Record<string, unknown>): Promise<EventDraftResult> {
    const draft = await this.eventDraftRepository.upsert(organizerId, payload);
    return { payload: draft.payload, updatedAt: draft.updatedAt };
  }

  async clearDraft(organizerId: number): Promise<void> {
    await this.eventDraftRepository.deleteByOrganizer(organizerId);
  }
}
