import { IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SetAssessmentModeDto {
  @ApiProperty({
    example: true,
    description: 'true = เปิดประเมินรอบด้าน (นักศึกษาประเมินตนเองและเพื่อนเมื่อกิจกรรมจบ), false = ผู้จัดประเมินฝั่งเดียว',
  })
  // ValidationPipe ใน main.ts เปิด enableImplicitConversion: สตริง "false" จะถูกแปลงเป็น true (Boolean("false"))
  // แล้วผ่าน @IsBoolean — สวิตช์จึงพลิกค่าเงียบๆ เมื่อ client ส่งสตริงมา ดึงค่าดิบกลับมาเพื่อให้ @IsBoolean ตรวจของจริง
  @Transform(({ obj }) => obj.enabled)
  @IsBoolean()
  enabled: boolean;
}
