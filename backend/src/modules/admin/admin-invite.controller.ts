import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminInvitesService } from './admin-invite.service';
import { CreateAdminInviteDto } from './dto/create-admin-invite.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminIpGuard } from '../../common/guards/admin-ip.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Admin Invites')
@Controller('api/admin/invites')
@UseGuards(AdminIpGuard, JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminInvitesController {
  constructor(private readonly service: AdminInvitesService) {}

  @Post()
  @ApiOperation({ summary: 'เชิญ Admin ใหม่ทางอีเมล' })
  create(@Body() dto: CreateAdminInviteDto, @CurrentUser('id') adminId: number) {
    return this.service.createInvite(dto.email, adminId);
  }

  @Get()
  @ApiOperation({ summary: 'ดูรายการคำเชิญ Admin ทั้งหมด' })
  findAll() {
    return this.service.listInvites();
  }

  @Patch(':id/revoke')
  @ApiOperation({ summary: 'ยกเลิกคำเชิญ Admin' })
  revoke(@Param('id', ParseIntPipe) id: number) {
    return this.service.revokeInvite(id);
  }
}
