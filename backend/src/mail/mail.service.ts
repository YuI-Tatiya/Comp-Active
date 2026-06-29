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
      this.logger.error(`Error sending email to ${email}: ${error.message}`);
      throw new Error('ไม่สามารถส่งอีเมลยืนยันได้ โปรดตรวจสอบการตั้งค่า SMTP');
    }
  }
}
