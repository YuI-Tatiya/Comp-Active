import { Controller, Post, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CertificatesService } from '../shared/volunteer-services/certificate.service';
import { IssueCertificateDto } from '../shared/volunteer-services/dto/issue-certificate.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Certificates')
@Controller('api/certificates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ORGANIZER, UserRole.ADMIN)
@ApiBearerAuth()
export class CertificatesOrganizerController {
  constructor(private readonly certificatesService: CertificatesService) {}

  /**
   * POST /api/certificates/issue/:registrationId - ออกเกียรติบัตร (Organizer)
   */
  @Post('issue/:registrationId')
  @ApiOperation({ summary: 'ออกเกียรติบัตร (Organizer)' })
  async issue(@Param('registrationId', ParseIntPipe) registrationId: number, @Body() dto: IssueCertificateDto) {
    return this.certificatesService.issue(registrationId, dto.volunteerHours);
  }
}
