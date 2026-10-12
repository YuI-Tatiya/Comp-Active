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

  /**
   * เขียนทับคำขอสมัครที่ยังไม่ยืนยัน — เงื่อนไข isVerified:false อยู่ใน where เดียวกับการเขียน
   * บัญชีที่เพิ่งยืนยันเสร็จไปก่อนหน้าเสี้ยววินาทีจึงไม่ถูกดึงกลับเป็นไม่ยืนยัน (คืน null)
   */
  async overwritePendingRegistration(id: number, data: Record<string, any>) {
    const { count } = await this.prisma.user.updateMany({
      where: { id, isVerified: false },
      data,
    });
    return count === 1 ? this.findUserById(id) : null;
  }

  /**
   * ยืนยันการสมัครแบบ compare-and-set — สำเร็จเฉพาะเมื่อแถวยังเป็นคำขอเดิมที่เพิ่งตรวจ OTP + รหัสผ่านผ่าน
   * (มีคนสมัครทับระหว่างนั้น = รหัสผ่าน/OTP บนแถวเปลี่ยนแล้ว → null) และล้าง OTP ทิ้งในการเขียนครั้งเดียวกัน
   */
  async markRegistrationVerified(
    id: number,
    passwordHash: string,
    otp: string,
  ) {
    const { count } = await this.prisma.user.updateMany({
      where: {
        id,
        isVerified: false,
        password: passwordHash,
        verificationOtp: otp,
      },
      data: {
        isVerified: true,
        verificationOtp: null,
        verificationOtpExpiresAt: null,
        verificationOtpAttempts: 0,
      },
    });
    return count === 1 ? this.findUserById(id) : null;
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
