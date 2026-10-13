import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '../../../../generated/prisma/client';

@Injectable()
export class EventDraftRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByOrganizer(organizerId: number) {
    return this.prisma.eventDraft.findUnique({ where: { organizerId } });
  }

  upsert(organizerId: number, payload: Record<string, unknown>) {
    const json = payload as Prisma.InputJsonValue;
    return this.prisma.eventDraft.upsert({
      where: { organizerId },
      create: { organizerId, payload: json },
      update: { payload: json },
    });
  }

  // deleteMany แทน delete — เคลียร์ฉบับร่างที่ไม่มีอยู่แล้วไม่ควร throw (เช่นกดลบซ้ำ หรือเพิ่งเผยแพร่ไปแล้ว)
  async deleteByOrganizer(organizerId: number): Promise<void> {
    await this.prisma.eventDraft.deleteMany({ where: { organizerId } });
  }
}
