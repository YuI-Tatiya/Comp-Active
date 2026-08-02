import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export const ADMIN_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  studentId: true,
  username: true,
  validUntil: true,
  isBlocked: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({ select: ADMIN_SAFE_SELECT, orderBy: { createdAt: 'desc' } });
  }

  findById(id: number) {
    return this.prisma.user.findUnique({ where: { id }, select: ADMIN_SAFE_SELECT });
  }

  findByIdWithPassword(id: number) {
    return this.prisma.user.findUnique({ where: { id }, select: { ...ADMIN_SAFE_SELECT, password: true } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  findByIdBasic(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, validUntil: true },
    });
  }

  update(id: number, data: Record<string, any>) {
    return this.prisma.user.update({ where: { id }, data, select: ADMIN_SAFE_SELECT });
  }

  updateModerationFields(id: number, data: Record<string, any>) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, isBlocked: true },
    });
  }

  updatePassword(id: number, password: string) {
    return this.prisma.user.update({ where: { id }, data: { password } });
  }

  delete(id: number) {
    return this.prisma.user.delete({ where: { id } });
  }

  countByRole() {
    return this.prisma.user.groupBy({ by: ['role'], _count: { role: true } });
  }

  countAll() {
    return this.prisma.user.count();
  }
}
