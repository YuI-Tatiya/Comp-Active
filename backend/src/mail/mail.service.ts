import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendVerificationOtp(email: string, otp: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'ยืนยันตัวตนสำหรับการเปลี่ยนแปลงข้อมูลส่วนตัว - CP Check',
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #4CAF50;">การยืนยันตัวตน CP Check</h2>
            <p>สวัสดีครับ,</p>
            <p>คุณได้ทำการร้องขอเพื่อเปลี่ยนแปลงข้อมูลส่วนตัวของบัญชี <b>${email}</b></p>
            <p>โปรดใช้รหัส OTP ด้านล่างนี้เพื่อยืนยันตัวตน:</p>
            <div style="background-color: #f4f4f4; padding: 15px; margin: 20px 0; text-align: center; border-radius: 8px;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333;">${otp}</span>
            </div>
            <p>รหัสนี้มีอายุการใช้งาน <b>15 นาที</b></p>
            <p>หากคุณไม่ได้เป็นผู้ร้องขอ โปรดเพิกเฉยต่ออีเมลฉบับนี้ หรือทำการเปลี่ยนรหัสผ่านเพื่อความปลอดภัย</p>
            <br/>
            <p style="font-size: 12px; color: #888;">ขอบคุณครับ<br/>ทีมงาน CP Check (College of Computing)</p>
          </div>
        `,
      });
      this.logger.log(`Verification OTP sent to ${email}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error sending email to ${email}: ${msg}`);
      throw new Error('ไม่สามารถส่งอีเมลยืนยันได้ โปรดตรวจสอบการตั้งค่า SMTP');
    }
  }

  async sendOrganizerApproved(email: string, name: string, password: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: '🎉 คำขอเป็น Organizer ได้รับการอนุมัติแล้ว - CP Check',
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
            <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:36px 32px;border-radius:16px 16px 0 0;">
              <h1 style="color:#fff;margin:0;font-size:24px;">🎉 ยินดีด้วย!</h1>
              <p style="color:#c7d2fe;margin:8px 0 0;">คำขอเป็น Organizer ของคุณได้รับการอนุมัติแล้ว</p>
            </div>
            <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
              <p>สวัสดีคุณ <strong>${name}</strong>,</p>
              <p>ทีมงาน CP Check ได้ทำการอนุมัติบัญชี Organizer ของคุณเรียบร้อยแล้ว คุณสามารถเข้าสู่ระบบและเริ่มสร้างกิจกรรมได้ทันที</p>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:24px 0;">
                <p style="margin:0 0 12px;font-size:13px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">ข้อมูลเข้าสู่ระบบ</p>
                <table style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-size:14px;width:100px;">อีเมล</td>
                    <td style="padding:6px 0;font-weight:600;font-size:14px;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-size:14px;">รหัสผ่าน</td>
                    <td style="padding:6px 0;">
                      <span style="font-family:monospace;font-size:18px;font-weight:700;background:#eef2ff;color:#4f46e5;padding:4px 12px;border-radius:6px;letter-spacing:.1em;">${password}</span>
                    </td>
                  </tr>
                </table>
              </div>
              <p style="color:#ef4444;font-size:13px;">⚠️ กรุณาเปลี่ยนรหัสผ่านหลังเข้าสู่ระบบครั้งแรก</p>
              <p style="font-size:12px;color:#94a3b8;margin-top:32px;">ขอบคุณครับ<br/>ทีมงาน CP Check · College of Computing</p>
            </div>
          </div>
        `,
      });
      this.logger.log(`Organizer approved email sent to ${email}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send approval email to ${email}: ${msg}`);
    }
  }

  async sendOrganizerRejected(email: string, name: string, reason: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'ผลการพิจารณาคำขอเป็น Organizer - CP Check',
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
            <div style="background:#1e293b;padding:36px 32px;border-radius:16px 16px 0 0;">
              <h1 style="color:#fff;margin:0;font-size:24px;">ผลการพิจารณาคำขอ</h1>
              <p style="color:#94a3b8;margin:8px 0 0;">CP Check · College of Computing</p>
            </div>
            <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
              <p>สวัสดีคุณ <strong>${name}</strong>,</p>
              <p>ขอบคุณที่สนใจสมัครเป็น Organizer กับระบบ CP Check อย่างไรก็ตาม ทีมงานขอแจ้งว่าคำขอของคุณยังไม่ผ่านการอนุมัติในขณะนี้</p>
              <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:12px;padding:20px;margin:24px 0;">
                <p style="margin:0 0 8px;font-size:13px;color:#dc2626;font-weight:600;">เหตุผล</p>
                <p style="margin:0;color:#7f1d1d;font-size:14px;">${reason}</p>
              </div>
              <p>หากต้องการสมัครใหม่หรือมีข้อสงสัย สามารถติดต่อทีมงานได้ที่อีเมล cpcheck@kku.ac.th</p>
              <p style="font-size:12px;color:#94a3b8;margin-top:32px;">ขอบคุณครับ<br/>ทีมงาน CP Check · College of Computing</p>
            </div>
          </div>
        `,
      });
      this.logger.log(`Organizer rejected email sent to ${email}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send rejection email to ${email}: ${msg}`);
    }
  }
}
