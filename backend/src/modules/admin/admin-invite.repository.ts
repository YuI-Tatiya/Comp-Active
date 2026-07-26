import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminInvitesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findPendingInviteByEmail(email: string) {
    return this.prisma.adminInvite.findFirst({
      where: { email, status: 'pending', expiresAt: { gt: new Date() } },
    });
  }

  create(email: string, tokenHash: string, invitedById: number, expiresAt: Date) {
    return this.prisma.adminInvite.create({ data: { email, tokenHash, invitedById, expiresAt } });
  }

  findAll() {
    return this.prisma.adminInvite.findMany({
      orderBy: { createdAt: 'desc' },
      include: { invitedBy: { select: { id: true, name: true, email: true } } },
    });
  }

  findById(id: number) {
    return this.prisma.adminInvite.findUnique({ where: { id } });
  }

  revoke(id: number) {
    return this.prisma.adminInvite.update({ where: { id }, data: { status: 'revoked' } });
  }
}
