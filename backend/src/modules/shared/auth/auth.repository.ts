import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  updateUser(id: number, data: Record<string, any>) {
    return this.prisma.user.update({ where: { id }, data });
  }

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findUserByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  createUser(data: Record<string, any>) {
    return this.prisma.user.create({ data: data as any });
  }

  findAdminInviteByTokenHash(tokenHash: string) {
    return this.prisma.adminInvite.findUnique({ where: { tokenHash } });
  }

  acceptAdminInvite(inviteId: number, email: string, hashedPassword: string) {
    return this.prisma.$transaction(async (tx) => {
      await (tx as any).user.create({
        data: { name: email.split('@')[0], email, password: hashedPassword, role: 'admin' },
      });
      await (tx as any).adminInvite.update({
        where: { id: inviteId },
        data: { status: 'accepted', acceptedAt: new Date() },
      });
    });
  }

  findProfileById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        studentId: true,
        username: true,
        validUntil: true,
        createdAt: true,
        phone: true,
        educationLevel: true,
        program: true,
      },
    });
  }
}
