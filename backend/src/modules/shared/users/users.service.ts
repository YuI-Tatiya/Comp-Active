import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersRepository } from './users.repository';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '../../../common/enums/role.enum';
import { generateSecurePassword, validateAcademicInfo } from '../../../common/utils';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  async findAll() {
    return this.usersRepository.findAll();
  }

  async findById(id: number) {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`ไม่พบผู้ใช้งาน ID: ${id}`);
    }

    return user;
  }

  async updateProfile(userId: number, updateDto: UpdateUserDto) {
    const user = await this.usersRepository.findByIdWithPassword(userId);

    if (!user) {
      throw new NotFoundException(`ไม่พบผู้ใช้งาน ID: ${userId}`);
    }

    if (!updateDto.currentPassword) {
      throw new ForbiddenException('กรุณาระบุรหัสผ่านปัจจุบันเพื่อยืนยันการแก้ไขข้อมูล');
    }

    const isPasswordValid = await bcrypt.compare(updateDto.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new ForbiddenException('รหัสผ่านปัจจุบันไม่ถูกต้อง');
    }

    // ถ้าแตะข้อมูลการศึกษา ต้องส่งมาครบชุดและสอดคล้องกัน
    validateAcademicInfo({ educationLevel: updateDto.educationLevel, program: updateDto.program });

    const data: Record<string, any> = {};
    if (updateDto.name !== undefined) data.name = updateDto.name;
    if (updateDto.studentId !== undefined) data.studentId = updateDto.studentId;
    if (updateDto.phone !== undefined) data.phone = updateDto.phone;
    if (updateDto.educationLevel !== undefined) data.educationLevel = updateDto.educationLevel;
    if (updateDto.program !== undefined) data.program = updateDto.program;
    if (updateDto.newPassword) {
      data.password = await bcrypt.hash(updateDto.newPassword, 12);
    }

    const updated = await this.usersRepository.update(userId, data);

    this.logger.log(`User profile updated: ${updated.email}`);
    return updated;
  }

  async changeRole(userId: number, newRole: UserRole) {
    const user = await this.findById(userId);
    const updated = await this.usersRepository.update(user.id, { role: newRole as any });
    this.logger.log(`User role changed: ${updated.email} → ${newRole}`);
    return updated;
  }

  async deleteUser(userId: number, adminId: number) {
    if (userId === adminId) {
      throw new ForbiddenException('ไม่สามารถลบบัญชีตัวเองได้');
    }

    const user = await this.findById(userId);
    await this.usersRepository.delete(user.id);
    this.logger.log(`User deleted: ${user.email} (by admin ID: ${adminId})`);
  }

  async blockUser(userId: number) {
    await this.findById(userId);
    const updated = await this.usersRepository.updateModerationFields(userId, { isBlocked: true });
    this.logger.log(`User blocked: ${updated.email}`);
    return updated;
  }

  async unblockUser(userId: number) {
    await this.findById(userId);
    const updated = await this.usersRepository.updateModerationFields(userId, { isBlocked: false });
    this.logger.log(`User unblocked: ${updated.email}`);
    return updated;
  }

  async generatePassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.usersRepository.findByEmail(normalizedEmail);
    if (!user) throw new NotFoundException(`ไม่พบผู้ใช้งานอีเมล: ${normalizedEmail}`);

    const plain = generateSecurePassword();
    const hashed = await bcrypt.hash(plain, 12);

    await this.usersRepository.updatePassword(user.id, hashed);
    this.logger.log(`Password generated for: ${normalizedEmail}`);

    return { name: user.name, email: user.email, generatedPassword: plain };
  }

  async extendValidity(userId: number, validDays: number) {
    const user = await this.usersRepository.findByIdBasic(userId);
    if (!user) throw new NotFoundException(`ไม่พบผู้ใช้งาน ID: ${userId}`);
    if (user.role !== 'organizer') {
      throw new BadRequestException('ต่ออายุได้เฉพาะบัญชี Organizer เท่านั้น');
    }

    const now = new Date();
    const base = user.validUntil && user.validUntil > now ? user.validUntil : now;
    const validUntil = new Date(base.getTime() + validDays * 24 * 60 * 60 * 1000);

    const updated = await this.usersRepository.update(userId, { validUntil });

    this.logger.log(`Validity extended for ${updated.email}: now valid until ${validUntil.toISOString()}`);
    return updated;
  }

  async countByRole() {
    const result = await this.usersRepository.countByRole();
    return result.map((r) => ({ role: r.role, count: r._count.role }));
  }

  async countAll() {
    return this.usersRepository.countAll();
  }
}
