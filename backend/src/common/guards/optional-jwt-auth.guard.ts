import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * เหมือน JwtAuthGuard แต่ไม่บังคับต้อง login — ใช้กับ endpoint สาธารณะที่พฤติกรรมต่างกัน
 * ถ้ามี viewer login อยู่ (เช่น เช็คสิทธิ์ดูกิจกรรม restricted) โดยไม่ปิดกั้นผู้ที่ไม่ได้ login
 * @CurrentUser() คืนค่า null ได้อยู่แล้วถ้าไม่มี user จึงใช้ต่อจาก guard นี้ได้ทันที
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(err: unknown, user: TUser): TUser {
    return (user || null) as TUser;
  }
}
