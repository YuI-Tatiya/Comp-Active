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
        subject: 'ยืนยันตัวตนสำหรับการเปลี่ยนแปลงข้อมูลส่วนตัว - Comp Active',
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #4CAF50;">การยืนยันตัวตน Comp Active</h2>
            <p>สวัสดีครับ,</p>
            <p>คุณได้ทำการร้องขอเพื่อเปลี่ยนแปลงข้อมูลส่วนตัวของบัญชี <b>${email}</b></p>
            <p>โปรดใช้รหัส OTP ด้านล่างนี้เพื่อยืนยันตัวตน:</p>
            <div style="background-color: #f4f4f4; padding: 15px; margin: 20px 0; text-align: center; border-radius: 8px;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333;">${otp}</span>
            </div>
            <p>รหัสนี้มีอายุการใช้งาน <b>15 นาที</b></p>
            <p>หากคุณไม่ได้เป็นผู้ร้องขอ โปรดเพิกเฉยต่ออีเมลฉบับนี้ หรือทำการเปลี่ยนรหัสผ่านเพื่อความปลอดภัย</p>
            <br/>
            <p style="font-size: 12px; color: #888;">ขอบคุณครับ<br/>ทีมงาน Comp Active (College of Computing)</p>
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

  // Intentionally does NOT catch-and-swallow — email is the only channel that delivers
  // the generated username/password, so the caller needs to know if delivery failed.
  async sendOrganizerApproved(
    email: string,
    name: string,
    username: string,
    password: string,
    validUntil: Date,
  ) {
    const formattedExpiry = validUntil.toLocaleDateString('th-TH', { dateStyle: 'long' });

    await this.mailerService.sendMail({
      to: email,
      subject: 'คำขอเป็น Organizer ได้รับการอนุมัติแล้ว - Comp Active',
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
          <div style="background:linear-gradient(135deg,#4299e1,#2b6cb0);padding:36px 32px;border-radius:16px 16px 0 0;">
            <p style="margin:0;font-size:26px;font-weight:800;letter-spacing:-0.02em;">
              <span style="color:#ffffff;">Comp </span><span style="color:#dbeafe;">Active</span>
            </p>
            <p style="color:#e0f2fe;margin:8px 0 0;">คำขอเป็น Organizer ของคุณได้รับการอนุมัติแล้ว</p>
          </div>
          <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
            <p>สวัสดีคุณ <strong>${name}</strong>,</p>
            <p>ทีมงาน Comp Active ได้ทำการอนุมัติบัญชี Organizer ของคุณเรียบร้อยแล้ว คุณสามารถเข้าสู่ระบบและเริ่มสร้างกิจกรรมได้ทันที</p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:24px 0;">
              <p style="margin:0 0 12px;font-size:13px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">ข้อมูลเข้าสู่ระบบ</p>
              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:14px;width:120px;">Username</td>
                  <td style="padding:6px 0;font-weight:600;font-size:14px;font-family:monospace;">${username}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:14px;">รหัสผ่าน</td>
                  <td style="padding:6px 0;">
                    <span style="font-family:monospace;font-size:18px;font-weight:700;background:#ebf8ff;color:#2b6cb0;padding:4px 12px;border-radius:6px;letter-spacing:.1em;">${password}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:14px;">ใช้งานได้ถึง</td>
                  <td style="padding:6px 0;font-weight:600;font-size:14px;">${formattedExpiry}</td>
                </tr>
              </table>
            </div>
            <p style="color:#ef4444;font-size:13px;">กรุณาเปลี่ยนรหัสผ่านหลังเข้าสู่ระบบครั้งแรก และเก็บ Username นี้ไว้สำหรับเข้าสู่ระบบครั้งถัดไป</p>
            <p style="font-size:12px;color:#94a3b8;margin-top:32px;">ขอบคุณครับ<br/>ทีมงาน Comp Active · College of Computing</p>
          </div>
        </div>
      `,
    });
    this.logger.log(`Organizer approved email sent to ${email}`);
  }

  async sendAdminNewOrganizerRequest(
    adminEmail: string,
    applicantName: string,
    applicantEmail: string,
    department: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: adminEmail,
        subject: '🔔 มีคำขอเป็น Organizer ใหม่ - Comp Active',
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
            <div style="background:linear-gradient(135deg,#1f4066,#16304d);padding:32px;border-radius:16px 16px 0 0;">
              <h1 style="color:#fff;margin:0;font-size:22px;">🔔 คำขอเป็น Organizer ใหม่</h1>
              <p style="color:#7fa8c9;margin:8px 0 0;font-size:14px;">Comp Active Admin Notification</p>
            </div>
            <div style="background:#fff;padding:32px;border:1px solid #dce6f2;border-top:none;border-radius:0 0 16px 16px;">
              <p style="margin:0 0 20px;">มีผู้ยื่นคำขอเป็น Organizer ใหม่เข้ามาในระบบ กรุณาตรวจสอบและดำเนินการ</p>
              <div style="background:#f7f9fc;border:1px solid #dce6f2;border-radius:12px;padding:20px;margin-bottom:24px;">
                <p style="margin:0 0 12px;font-size:12px;color:#5f7691;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">ข้อมูลผู้ยื่นคำขอ</p>
                <table style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="padding:5px 0;color:#5f7691;font-size:14px;width:120px;">ชื่อ</td>
                    <td style="padding:5px 0;font-weight:600;font-size:14px;color:#14263c;">${applicantName}</td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;color:#5f7691;font-size:14px;">อีเมล</td>
                    <td style="padding:5px 0;font-size:14px;color:#14263c;">${applicantEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;color:#5f7691;font-size:14px;">หน่วยงาน</td>
                    <td style="padding:5px 0;font-size:14px;color:#14263c;">${department}</td>
                  </tr>
                </table>
              </div>
              <a href="http://localhost:3000/admin/organizer-requests"
                 style="display:inline-block;background:linear-gradient(135deg,#1f4066,#3a72ad);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">
                ดูคำขอใน Admin Panel →
              </a>
              <p style="font-size:12px;color:#94a3b8;margin-top:28px;">ขอบคุณครับ<br/>ระบบอัตโนมัติ Comp Active · College of Computing</p>
            </div>
          </div>
        `,
      });
      this.logger.log(`Admin notification sent to ${adminEmail} for new organizer request from ${applicantEmail}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send admin notification: ${msg}`);
    }
  }

  async sendOrganizerRejected(email: string, name: string, reason: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'ผลการพิจารณาคำขอเป็น Organizer - Comp Active',
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
            <div style="background:#1e293b;padding:36px 32px;border-radius:16px 16px 0 0;">
              <h1 style="color:#fff;margin:0;font-size:24px;">ผลการพิจารณาคำขอ</h1>
              <p style="color:#94a3b8;margin:8px 0 0;">Comp Active · College of Computing</p>
            </div>
            <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
              <p>สวัสดีคุณ <strong>${name}</strong>,</p>
              <p>ขอบคุณที่สนใจสมัครเป็น Organizer กับระบบ Comp Active อย่างไรก็ตาม ทีมงานขอแจ้งว่าคำขอของคุณยังไม่ผ่านการอนุมัติในขณะนี้</p>
              <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:12px;padding:20px;margin:24px 0;">
                <p style="margin:0 0 8px;font-size:13px;color:#dc2626;font-weight:600;">เหตุผล</p>
                <p style="margin:0;color:#7f1d1d;font-size:14px;">${reason}</p>
              </div>
              <p>หากต้องการสมัครใหม่หรือมีข้อสงสัย สามารถติดต่อทีมงานได้ที่อีเมล compactive@kku.ac.th</p>
              <p style="font-size:12px;color:#94a3b8;margin-top:32px;">ขอบคุณครับ<br/>ทีมงาน Comp Active · College of Computing</p>
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

  // Intentionally does NOT catch-and-swallow — the admin needs to know immediately
  // if the invite failed to send, since there's no other delivery channel for the link.
  async sendAdminInvite(email: string, acceptUrl: string, expiresAt: Date) {
    const formattedExpiry = expiresAt.toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });

    await this.mailerService.sendMail({
      to: email,
      subject: '📩 คำเชิญเข้าร่วมเป็น Admin - Comp Active',
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
          <div style="background:linear-gradient(135deg,#1f4066,#16304d);padding:36px 32px;border-radius:16px 16px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:24px;">📩 คำเชิญเข้าร่วมทีม Admin</h1>
            <p style="color:#7fa8c9;margin:8px 0 0;">Comp Active Admin Invitation</p>
          </div>
          <div style="background:#fff;padding:32px;border:1px solid #dce6f2;border-top:none;border-radius:0 0 16px 16px;">
            <p>คุณได้รับเชิญให้เข้าร่วมเป็นผู้ดูแลระบบ (Admin) ของ Comp Active</p>
            <p>กรุณากดปุ่มด้านล่างเพื่อตั้งรหัสผ่านและเปิดใช้งานบัญชีของคุณ:</p>
            <a href="${acceptUrl}"
               style="display:inline-block;background:linear-gradient(135deg,#1f4066,#3a72ad);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;margin:20px 0;">
              ตั้งรหัสผ่านและเปิดใช้งานบัญชี →
            </a>
            <p style="color:#ef4444;font-size:13px;">⚠️ ลิงก์นี้จะหมดอายุในวันที่ ${formattedExpiry}</p>
            <p style="font-size:12px;color:#94a3b8;margin-top:32px;">หากคุณไม่ได้เป็นผู้ร้องขอคำเชิญนี้ กรุณาเพิกเฉยต่ออีเมลฉบับนี้<br/>ทีมงาน Comp Active · College of Computing</p>
          </div>
        </div>
      `,
    });
    this.logger.log(`Admin invite email sent to ${email}`);
  }

  // ── นักศึกษา: แจ้งเตือนเกี่ยวกับการลงทะเบียนกิจกรรม ──────────────────────────
  // เจตนาไม่ throw เมื่อส่งไม่สำเร็จ — อีเมลเป็นช่องทางเสริม นักศึกษายังเห็นสถานะ
  // ได้ปกติผ่าน /student/my-registrations ต่อให้อีเมลส่งไม่ออก การกระทำหลัก
  // (ยืนยัน/ยกเลิก/จบกิจกรรม) จึงไม่ควรล้มเหลวตามอีเมล

  async sendRegistrationConfirmed(
    email: string,
    studentName: string,
    activityName: string,
    dateLabel: string,
    timeLabel: string,
    location: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `ยืนยันการลงทะเบียน "${activityName}" แล้ว - Comp Active`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
            <div style="background:linear-gradient(135deg,#22c55e,#15803d);padding:32px;border-radius:16px 16px 0 0;">
              <h1 style="color:#fff;margin:0;font-size:22px;">✅ ยืนยันการลงทะเบียนแล้ว</h1>
            </div>
            <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
              <p>สวัสดีคุณ <strong>${studentName}</strong>,</p>
              <p>การลงทะเบียนเข้าร่วมกิจกรรม <strong>${activityName}</strong> ของคุณได้รับการยืนยันแล้ว</p>
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:20px 0;">
                <p style="margin:0 0 6px;font-size:14px;color:#166534;">📅 วันที่: <strong>${dateLabel}</strong></p>
                <p style="margin:0 0 6px;font-size:14px;color:#166534;">🕐 เวลา: <strong>${timeLabel}</strong></p>
                <p style="margin:0;font-size:14px;color:#166534;">📍 สถานที่: <strong>${location}</strong></p>
              </div>
              <p style="font-size:13px;color:#64748b;">อย่าลืมมาเช็คอินในวันงานเพื่อรับคะแนน Soft Skills และสิทธิ์ทำแบบสำรวจหลังงาน</p>
              <p style="font-size:12px;color:#94a3b8;margin-top:28px;">ทีมงาน Comp Active · College of Computing</p>
            </div>
          </div>
        `,
      });
      this.logger.log(`Registration confirmed email sent to ${email}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send registration-confirmed email to ${email}: ${msg}`);
    }
  }

  async sendActivityCancelled(email: string, studentName: string, activityName: string, reason: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `กิจกรรม "${activityName}" ถูกยกเลิก - Comp Active`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
            <div style="background:#dc2626;padding:32px;border-radius:16px 16px 0 0;">
              <h1 style="color:#fff;margin:0;font-size:22px;">⚠️ กิจกรรมถูกยกเลิก</h1>
            </div>
            <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
              <p>สวัสดีคุณ <strong>${studentName}</strong>,</p>
              <p>ผู้จัดได้ยกเลิกกิจกรรม <strong>${activityName}</strong> ที่คุณลงทะเบียนไว้</p>
              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin:20px 0;">
                <p style="margin:0 0 8px;font-size:13px;color:#dc2626;font-weight:600;">เหตุผล</p>
                <p style="margin:0;color:#7f1d1d;font-size:14px;">${reason || 'ผู้จัดไม่ได้ระบุเหตุผล'}</p>
              </div>
              <p style="font-size:13px;color:#64748b;">คุณสามารถค้นหากิจกรรมอื่นที่เปิดรับสมัครอยู่ได้ที่หน้ากิจกรรมทั้งหมด</p>
              <p style="font-size:12px;color:#94a3b8;margin-top:28px;">ทีมงาน Comp Active · College of Computing</p>
            </div>
          </div>
        `,
      });
      this.logger.log(`Activity cancelled email sent to ${email}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send activity-cancelled email to ${email}: ${msg}`);
    }
  }

  async sendActivityCompleted(email: string, studentName: string, activityName: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `กิจกรรม "${activityName}" จบแล้ว - Comp Active`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
            <div style="background:linear-gradient(135deg,#4299e1,#2b6cb0);padding:32px;border-radius:16px 16px 0 0;">
              <h1 style="color:#fff;margin:0;font-size:22px;">🎉 ขอบคุณที่เข้าร่วมกิจกรรม</h1>
            </div>
            <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
              <p>สวัสดีคุณ <strong>${studentName}</strong>,</p>
              <p>กิจกรรม <strong>${activityName}</strong> ที่คุณเข้าร่วมได้จบลงแล้ว ระบบได้บันทึกคะแนน Soft Skills ให้คุณเรียบร้อยแล้ว</p>
              <p>หากงานนี้มีแบบสำรวจความคิดเห็น กรุณาเข้าไปตอบแบบสำรวจได้ที่หน้า "กิจกรรมของฉัน" เพื่อช่วยให้ผู้จัดพัฒนากิจกรรมครั้งต่อไป</p>
              <p style="font-size:12px;color:#94a3b8;margin-top:28px;">ทีมงาน Comp Active · College of Computing</p>
            </div>
          </div>
        `,
      });
      this.logger.log(`Activity completed email sent to ${email}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send activity-completed email to ${email}: ${msg}`);
    }
  }
}
