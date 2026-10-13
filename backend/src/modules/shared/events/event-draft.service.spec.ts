import { Test } from '@nestjs/testing';
import { EventDraftService } from './event-draft.service';
import { EventDraftRepository } from './event-draft.repository';

describe('EventDraftService', () => {
  let service: EventDraftService;
  let repo: {
    findByOrganizer: jest.Mock;
    upsert: jest.Mock;
    deleteByOrganizer: jest.Mock;
  };

  const ORGANIZER_ID = 7;

  beforeEach(async () => {
    repo = {
      findByOrganizer: jest.fn(),
      upsert: jest.fn(),
      deleteByOrganizer: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [EventDraftService, { provide: EventDraftRepository, useValue: repo }],
    }).compile();
    service = module.get(EventDraftService);
  });

  describe('getDraft', () => {
    it('คืน null เมื่อผู้จัดยังไม่เคยบันทึกฉบับร่าง — ไม่ใช่ error', async () => {
      repo.findByOrganizer.mockResolvedValue(null);
      await expect(service.getDraft(ORGANIZER_ID)).resolves.toBeNull();
      expect(repo.findByOrganizer).toHaveBeenCalledWith(ORGANIZER_ID);
    });

    it('คืน payload + updatedAt เมื่อมีฉบับร่าง', async () => {
      const updatedAt = new Date('2026-01-01T00:00:00.000Z');
      repo.findByOrganizer.mockResolvedValue({
        id: 1,
        organizerId: ORGANIZER_ID,
        payload: { event: { name: 'ร่าง' }, activities: [] },
        updatedAt,
        createdAt: updatedAt,
      });

      await expect(service.getDraft(ORGANIZER_ID)).resolves.toEqual({
        payload: { event: { name: 'ร่าง' }, activities: [] },
        updatedAt,
      });
    });
  });

  describe('saveDraft', () => {
    it('ส่ง payload ที่ได้รับเข้า upsert ตรงๆ แบบ opaque (ไม่ตรวจ/แก้ไขเนื้อข้างใน)', async () => {
      const payload = {
        event: { name: 'ค่ายอาสา' },
        activities: [{ name: 'วันที่ 1' }],
      };
      const updatedAt = new Date('2026-02-02T00:00:00.000Z');
      repo.upsert.mockResolvedValue({
        id: 1,
        organizerId: ORGANIZER_ID,
        payload,
        updatedAt,
        createdAt: updatedAt,
      });

      const result = await service.saveDraft(ORGANIZER_ID, payload);

      expect(repo.upsert).toHaveBeenCalledWith(ORGANIZER_ID, payload);
      expect(result).toEqual({ payload, updatedAt });
    });
  });

  describe('clearDraft', () => {
    it('เรียก deleteByOrganizer ด้วย organizerId ที่ถูกต้อง', async () => {
      await service.clearDraft(ORGANIZER_ID);
      expect(repo.deleteByOrganizer).toHaveBeenCalledWith(ORGANIZER_ID);
    });
  });
});
