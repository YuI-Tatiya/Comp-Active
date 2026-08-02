import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { OrganizerRequestsRepository } from './organizer-request.repository';
import { MailService } from '../mail/mail.service';
import { CreateOrganizerRequestDto } from './dto/create-organizer-request.dto';
import { generateSecurePassword, generateUsername } from '../../../common/utils';

@Injectable()
export class OrganizerRequestsService {
  private readonly logger = new Logger(OrganizerRequestsService.name);

  constructor(
    private readonly organizerRequestsRepository: OrganizerRequestsRepository,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateOrganizerRequestDto) {
    const email = dto.email.trim().toLowerCase();

    const duplicate = await this.organizerRequestsRepository.findPendingByEmail(email);
    if (duplicate) throw new BadRequestException('อีเมลนี้มีคำขอรออยู่แล้ว');

    const userExists = await this.organizerRequestsRepository.findUserByEmail(email);
    if (userExists) throw new BadRequestException('อีเมลนี้มีบัญชีในระบบอยู่แล้ว');

    const request = await this.organizerRequestsRepository.create({ ...dto, email } as any);
    this.logger.log(`Organizer request submitted: ${email}`);

    const adminEmail = this.config.get<string>('ADMIN_EMAIL');
    if (adminEmail) {
      this.mail.sendAdminNewOrganizerRequest(adminEmail, dto.name, email, dto.department).catch(() => {});
    }

    return request;
  }

  async findAll(status?: string) {
    return this.organizerRequestsRepository.findAll(status);
  }

  async approve(id: number, validDays: number, approvedById: number) {
    const req = await this.organizerRequestsRepository.findById(id);
    if (!req) throw new NotFoundException('ไม่พบคำขอ');
    if (req.status !== 'pending') throw new BadRequestException('คำขอนี้ถูกดำเนินการแล้ว');

    const email = req.email.trim().toLowerCase();
    const userExists = await this.organizerRequestsRepository.findUserByEmail(email);
    if (userExists) throw new BadRequestException('อีเมลนี้มีบัญชีในระบบอยู่แล้ว');

    const username = await this.generateUniqueUsername();
    const plain = generateSecurePassword();
    const hashed = await bcrypt.hash(plain, 12);
    const validUntil = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000);

    await this.organizerRequestsRepository.approveTransaction(
      id,
      { name: req.name, email, username, password: hashed, validUntil },
      validDays,
      approvedById,
    );

    let emailSent = true;
    try {
      await this.mail.sendOrganizerApproved(email, req.name, username, plain, validUntil);
    } catch (error) {
      emailSent = false;
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send organizer-approved email to ${email}: ${msg}`);
    }

    this.logger.log(`Organizer request approved: ${email} (username: ${username})`);
    return {
      message: emailSent
        ? 'อนุมัติและส่งอีเมลเรียบร้อยแล้ว'
        : 'อนุมัติเรียบร้อยแล้ว แต่ส่งอีเมลไม่สำเร็จ กรุณาใช้ฟังก์ชัน "สร้างรหัสผ่านใหม่" เพื่อส่งข้อมูลให้ผู้ใช้ด้วยตนเอง',
      emailSent,
    };
  }

  private async generateUniqueUsername(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateUsername();
      const exists = await this.organizerRequestsRepository.findUserByUsername(candidate);
      if (!exists) return candidate;
    }
    throw new Error('ไม่สามารถสร้าง username ที่ไม่ซ้ำกันได้');
  }

  async reject(id: number, reason: string) {
    const req = await this.organizerRequestsRepository.findById(id);
    if (!req) throw new NotFoundException('ไม่พบคำขอ');
    if (req.status !== 'pending') throw new BadRequestException('คำขอนี้ถูกดำเนินการแล้ว');

    await this.organizerRequestsRepository.reject(id, reason);

    await this.mail.sendOrganizerRejected(req.email, req.name, reason);
    this.logger.log(`Organizer request rejected: ${req.email}`);
    return { message: 'ปฏิเสธคำขอและส่งอีเมลเรียบร้อยแล้ว' };
  }

  async countPending() {
    return this.organizerRequestsRepository.countPending();
  }
}
