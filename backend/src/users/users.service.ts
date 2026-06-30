import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '../common/enums/role.enum';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        studentId: true,
        isBlocked: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        studentId: true,
        googleId: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`ไม่พบผู้ใช้งาน ID: ${id}`);
    }

    return user;
  }

  async updateProfile(userId: number, updateDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        studentId: true,
        googleId: true,
        createdAt: true,
        password: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`ไม่พบผู้ใช้งาน ID: ${userId}`);
    }

    if (!updateDto.currentPassword) {
      throw new ForbiddenException('กรุณาระบุรหัสผ่านปัจจุบันเพื่อยืนยันการแก้ไขข้อมูล');
    }

    if (user.password) {
      const isPasswordValid = await bcrypt.compare(updateDto.currentPassword, user.password);
      if (!isPasswordValid) {
        throw new ForbiddenException('รหัสผ่านปัจจุบันไม่ถูกต้อง');
      }
    }

    const data: Record<string, any> = {};
    if (updateDto.name !== undefined) data.name = updateDto.name;
    if (updateDto.studentId !== undefined) data.studentId = updateDto.studentId;
    if (updateDto.newPassword) {
      data.password = await bcrypt.hash(updateDto.newPassword, 12);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        studentId: true,
        googleId: true,
        createdAt: true,
      },
    });

    this.logger.log(`User profile updated: ${updated.email}`);
    return updated;
  }

  async changeRole(userId: number, newRole: UserRole) {
    const user = await this.findById(userId);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { role: newRole as any },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        studentId: true,
        googleId: true,
        createdAt: true,
      },
    });
    this.logger.log(`User role changed: ${updated.email} → ${newRole}`);
    return updated;
  }

  async deleteUser(userId: number, adminId: number) {
    if (userId === adminId) {
      throw new ForbiddenException('ไม่สามารถลบบัญชีตัวเองได้');
    }

    const user = await this.findById(userId);
    await this.prisma.user.delete({ where: { id: user.id } });
    this.logger.log(`User deleted: ${user.email} (by admin ID: ${adminId})`);
  }

  async blockUser(userId: number) {
    await this.findById(userId);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: true },
      select: { id: true, name: true, email: true, role: true, isBlocked: true },
    });
    this.logger.log(`User blocked: ${updated.email}`);
    return updated;
  }

  async unblockUser(userId: number) {
    await this.findById(userId);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: false },
      select: { id: true, name: true, email: true, role: true, isBlocked: true },
    });
    this.logger.log(`User unblocked: ${updated.email}`);
    return updated;
  }

  async generatePassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) throw new NotFoundException(`ไม่พบผู้ใช้งานอีเมล: ${email}`);

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const plain = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const hashed = await bcrypt.hash(plain, 10);

    await this.prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    this.logger.log(`Password generated for: ${email}`);

    return { name: user.name, email: user.email, generatedPassword: plain };
  }

  async countByRole() {
    const result = await this.prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
    });
    return result.map((r) => ({ role: r.role, count: r._count.role }));
  }

  async countAll() {
    return this.prisma.user.count();
  }
}
