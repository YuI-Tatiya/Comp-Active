import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrganizerRequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPendingByEmail(email: string) {
    return this.prisma.organizerRequest.findFirst({ where: { email, status: 'pending' } });
  }

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findUserByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  create(data: Record<string, any>) {
    return this.prisma.organizerRequest.create({ data: data as any });
  }

  findAll(status?: string) {
    return this.prisma.organizerRequest.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: number) {
    return this.prisma.organizerRequest.findUnique({ where: { id } });
  }

  approveTransaction(
    id: number,
    userData: { name: string; email: string; username: string; password: string; validUntil: Date },
    validDays: number,
    approvedById: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await (tx as any).user.create({ data: { ...userData, role: 'organizer' } });
      await (tx as any).organizerRequest.update({
        where: { id },
        data: { status: 'approved', validDays, approvedById },
      });
    });
  }

  reject(id: number, reason: string) {
    return this.prisma.organizerRequest.update({
      where: { id },
      data: { status: 'rejected', rejectionReason: reason },
    });
  }

  countPending() {
    return this.prisma.organizerRequest.count({ where: { status: 'pending' } });
  }
}
