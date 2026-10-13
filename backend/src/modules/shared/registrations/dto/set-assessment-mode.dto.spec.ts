import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SetAssessmentModeDto } from './set-assessment-mode.dto';

/** ทำซ้ำการตั้งค่าของ ValidationPipe ใน main.ts (transform + enableImplicitConversion) */
async function check(body: unknown) {
  const dto = plainToInstance(SetAssessmentModeDto, body, { enableImplicitConversion: true });
  return { dto, errors: await validate(dto, { whitelist: true, forbidNonWhitelisted: true }) };
}

describe('SetAssessmentModeDto', () => {
  it.each([true, false])('รับ boolean จริง (%s)', async (enabled) => {
    const { dto, errors } = await check({ enabled });
    expect(errors).toHaveLength(0);
    expect(dto.enabled).toBe(enabled);
  });

  // implicit conversion ของ Boolean("false") คือ true — สวิตช์ต้องไม่ถูกพลิกค่าเงียบๆ เมื่อ client ส่งสตริงมา
  it.each(['false', 'true', 'yes', 'no', '0', '1', '', 0, 1, null])('ปฏิเสธค่าที่ไม่ใช่ boolean จริง (%p)', async (enabled) => {
    const { errors } = await check({ enabled });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('ปฏิเสธเมื่อไม่ส่ง enabled', async () => {
    const { errors } = await check({});
    expect(errors.length).toBeGreaterThan(0);
  });
});
