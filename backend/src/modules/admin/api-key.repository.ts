import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const PUBLIC_SELECT = {
  id: true,
  label: true,
  keyPrefix: true,
  rateLimit: true,
  isActive: true,
  lastUsedAt: true,
  createdAt: true,
} as const;

@Injectable()
export class ApiKeyRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(ownerId: number, label: string, keyHash: string, keyPrefix: string, rateLimit: number) {
    return this.prisma.apiKey.create({
      data: { ownerId, label, keyHash, keyPrefix, rateLimit },
      select: PUBLIC_SELECT,
    });
  }

  findMany() {
    return this.prisma.apiKey.findMany({ select: PUBLIC_SELECT, orderBy: { createdAt: 'desc' } });
  }

  findById(id: number) {
    return this.prisma.apiKey.findUnique({ where: { id }, select: PUBLIC_SELECT });
  }

  update(id: number, data: Record<string, any>) {
    return this.prisma.apiKey.update({ where: { id }, data, select: PUBLIC_SELECT });
  }

  findByHash(keyHash: string) {
    return this.prisma.apiKey.findUnique({ where: { keyHash } });
  }
}
