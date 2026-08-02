import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CertificatesService } from '../shared/volunteer-services/certificate.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Certificates')
@Controller('api/certificates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@ApiBearerAuth()
export class CertificatesStudentController {
  constructor(private readonly certificatesService: CertificatesService) {}

  /**
   * GET /api/certificates/my - ดูเกียรติบัตรของตัวเอง (Student)
   */
  @Get('my')
  @ApiOperation({ summary: 'ดูเกียรติบัตรของตัวเอง (Student)' })
  async findMy(@CurrentUser('id') studentId: number) {
    return this.certificatesService.findByStudent(studentId);
  }
}
