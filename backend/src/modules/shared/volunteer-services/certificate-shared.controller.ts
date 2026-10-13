import { Controller, Get, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CertificatesService } from './certificate.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@ApiTags('Certificates')
@Controller('api/certificates')
export class CertificateSharedController {
  constructor(private readonly certificatesService: CertificatesService) {}

  /**
   * GET /api/certificates/verify/:code - ตรวจสอบความถูกต้องของเกียรติบัตร (Public)
   */
  @Get('verify/:code')
  @ApiOperation({ summary: 'ตรวจสอบความถูกต้องของเกียรติบัตร (Public)' })
  async verify(@Param('code') code: string) {
    return this.certificatesService.verify(code);
  }

  /**
   * GET /api/certificates/:id - ดูรายละเอียด/ดาวน์โหลดเกียรติบัตร (ผู้ใช้ที่ login แล้วทุก role)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดูรายละเอียดเกียรติบัตร' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.certificatesService.findById(id);
  }
}
