import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateOrganizerRequestDto } from './dto/create-organizer-request.dto';

@Injectable()
export class OrganizerRequestsService {
  private readonly logger = new Logger(OrganizerRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateOrganizerRequestDto) {
    const duplicate = await this.prisma.organizerRequest.findFirst({
      where: { email: dto.email, status: 'pending' },
    });
    if (duplicate) throw new BadRequestException('อีเมลนี้มีคำขอรออยู่แล้ว');

    const userExists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (userExists) throw new BadRequestException('อีเมลนี้มีบัญชีในระบบอยู่แล้ว');

    const request = await this.prisma.organizerRequest.create({ data: dto as any });
    this.logger.log(`Organizer request submitted: ${dto.email}`);

    const adminEmail = this.config.get<string>('ADMIN_EMAIL');
    if (adminEmail) {
      this.mail.sendAdminNewOrganizerRequest(adminEmail, dto.name, dto.email, dto.department).catch(() => {});
    }

    return request;
  }

  async findAll(status?: string) {
    return this.prisma.organizerRequest.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(id: number) {
    const req = await this.prisma.organizerRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('ไม่พบคำขอ');
    if (req.status !== 'pending') throw new BadRequestException('คำขอนี้ถูกดำเนินการแล้ว');

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const plain = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const hashed = await bcrypt.hash(plain, 10);

    const userExists = await this.prisma.user.findUnique({ where: { email: req.email } });
    if (userExists) throw new BadRequestException('อีเมลนี้มีบัญชีในระบบอยู่แล้ว');

    await this.prisma.$transaction(async (tx) => {
      await (tx as any).user.create({
        data: { name: req.name, email: req.email, password: hashed, role: 'organizer' },
      });
      await (tx as any).organizerRequest.update({
        where: { id },
        data: { status: 'approved' },
      });
    });

    await this.mail.sendOrganizerApproved(req.email, req.name, plain);
    this.logger.log(`Organizer request approved: ${req.email}`);
    return { message: 'อนุมัติและส่งอีเมลเรียบร้อยแล้ว' };
  }

  async reject(id: number, reason: string) {
    const req = await this.prisma.organizerRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('ไม่พบคำขอ');
    if (req.status !== 'pending') throw new BadRequestException('คำขอนี้ถูกดำเนินการแล้ว');

    await this.prisma.organizerRequest.update({
      where: { id },
      data: { status: 'rejected', rejectionReason: reason },
    });

    await this.mail.sendOrganizerRejected(req.email, req.name, reason);
    this.logger.log(`Organizer request rejected: ${req.email}`);
    return { message: 'ปฏิเสธคำขอและส่งอีเมลเรียบร้อยแล้ว' };
  }

  async countPending() {
    return this.prisma.organizerRequest.count({ where: { status: 'pending' } });
  }
}
