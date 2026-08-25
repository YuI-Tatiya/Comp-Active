import { Controller, Get, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SiteContentService } from '../shared/admin-dashboard/site-content.service';
import { UpsertSiteContentDto } from '../shared/admin-dashboard/dto/upsert-site-content.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Admin Dashboard')
@Controller('api/admin/site-content')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class SiteContentAdminController {
  constructor(private readonly siteContentService: SiteContentService) {}

  @Get()
  @ApiOperation({ summary: 'ดูเนื้อหา Landing Page ทั้งหมดพร้อมข้อมูลผู้แก้ไข (Admin)' })
  findAll() {
    return this.siteContentService.findAllWithMeta();
  }

  @Put(':key')
  @ApiOperation({ summary: 'แก้ไข/สร้างเนื้อหา Landing Page ตาม key (Admin)' })
  upsert(@Param('key') key: string, @Body() dto: UpsertSiteContentDto, @CurrentUser('id') adminId: number) {
    return this.siteContentService.upsert(key, dto, adminId);
  }

  @Delete(':key')
  @ApiOperation({ summary: 'ลบเนื้อหา Landing Page ตาม key (Admin)' })
  delete(@Param('key') key: string) {
    return this.siteContentService.delete(key);
  }
}
