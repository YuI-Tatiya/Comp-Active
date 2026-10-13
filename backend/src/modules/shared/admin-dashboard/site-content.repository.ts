import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SiteContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllPublic() {
    return this.prisma.siteContent.findMany({
      select: { key: true, title: true, body: true },
      orderBy: { key: 'asc' },
    });
  }

  findAllWithMeta() {
    return this.prisma.siteContent.findMany({
      include: { updatedBy: { select: { id: true, name: true, email: true } } },
      orderBy: { key: 'asc' },
    });
  }

  upsert(key: string, data: { title?: string; body?: string }, updatedById: number) {
    return this.prisma.siteContent.upsert({
      where: { key },
      create: { key, ...data, updatedById },
      update: { ...data, updatedById },
    });
  }

  delete(key: string) {
    return this.prisma.siteContent.delete({ where: { key } });
  }
}
