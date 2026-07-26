import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CertificatesService } from './certificate.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Certificates')
@Controller('api/certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  /**
   * POST /api/certificates/issue/:registrationId - ออกเกียรติบัตร (Organizer)
   */
  @Post('issue/:registrationId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ออกเกียรติบัตร (Organizer)' })
  async issue(@Param('registrationId', ParseIntPipe) registrationId: number) {
    return this.certificatesService.issue(registrationId);
  }

  /**
   * GET /api/certificates/my - ดูเกียรติบัตรของตัวเอง (Student)
   */
  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดูเกียรติบัตรของตัวเอง (Student)' })
  async findMy(@CurrentUser('id') studentId: number) {
    return this.certificatesService.findByStudent(studentId);
  }

  /**
   * GET /api/certificates/verify/:code - ตรวจสอบความถูกต้องของเกียรติบัตร (Public)
   */
  @Get('verify/:code')
  @ApiOperation({ summary: 'ตรวจสอบความถูกต้องของเกียรติบัตร (Public)' })
  async verify(@Param('code') code: string) {
    return this.certificatesService.verify(code);
  }

  /**
   * GET /api/certificates/:id - ดูรายละเอียด/ดาวน์โหลดเกียรติบัตร
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดูรายละเอียดเกียรติบัตร' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.certificatesService.findById(id);
  }
}
