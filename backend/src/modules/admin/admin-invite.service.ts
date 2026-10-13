import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminInvitesRepository } from './admin-invite.repository';
import { MailService } from '../shared/mail/mail.service';
import { generateSecureToken, hashToken } from '../../common/utils';

@Injectable()
export class AdminInvitesService {
  private readonly logger = new Logger(AdminInvitesService.name);

  constructor(
    private readonly adminInvitesRepository: AdminInvitesRepository,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async createInvite(email: string, invitedById: number) {
    const normalizedEmail = email.trim().toLowerCase();

    const userExists = await this.adminInvitesRepository.findUserByEmail(normalizedEmail);
    if (userExists) throw new BadRequestException('อีเมลนี้มีบัญชีในระบบอยู่แล้ว');

    const pendingInvite = await this.adminInvitesRepository.findPendingInviteByEmail(normalizedEmail);
    if (pendingInvite) throw new BadRequestException('อีเมลนี้มีคำเชิญที่ยังไม่หมดอายุอยู่แล้ว');

    const token = generateSecureToken();
    const expiresHours = Number(this.config.get<string>('ADMIN_INVITE_EXPIRES_HOURS', '48'));
    const expiresAt = new Date(Date.now() + expiresHours * 60 * 60 * 1000);

    const invite = await this.adminInvitesRepository.create(normalizedEmail, hashToken(token), invitedById, expiresAt);

    const adminFrontendUrl = this.config.get<string>('gateway.adminFrontendUrl')!;
    const acceptUrl = `${adminFrontendUrl}/invite/accept?token=${token}`;

    // Intentionally not swallowed: the admin needs to know immediately if delivery failed.
    await this.mail.sendAdminInvite(normalizedEmail, acceptUrl, expiresAt);

    this.logger.log(`Admin invite sent: ${normalizedEmail}`);
    return invite;
  }

  async listInvites() {
    return this.adminInvitesRepository.findAll();
  }

  async revokeInvite(id: number) {
    const invite = await this.adminInvitesRepository.findById(id);
    if (!invite) throw new NotFoundException('ไม่พบคำเชิญ');
    if (invite.status !== 'pending') throw new BadRequestException('คำเชิญนี้ไม่สามารถยกเลิกได้');

    await this.adminInvitesRepository.revoke(id);
    this.logger.log(`Admin invite revoked: ${invite.email}`);
    return { message: 'ยกเลิกคำเชิญเรียบร้อยแล้ว' };
  }
}
