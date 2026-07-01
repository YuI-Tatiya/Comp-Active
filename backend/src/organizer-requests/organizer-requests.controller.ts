import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizerRequestsService } from './organizer-requests.service';
import { CreateOrganizerRequestDto } from './dto/create-organizer-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';

@ApiTags('Organizer Requests')
@Controller('api/organizer-requests')
export class OrganizerRequestsController {
  constructor(private readonly service: OrganizerRequestsService) {}

  @Post()
  @ApiOperation({ summary: 'ส่งคำขอเป็น Organizer (สาธารณะ)' })
  create(@Body() dto: CreateOrganizerRequestDto) {
    return this.service.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดูคำขอทั้งหมด (Admin)' })
  findAll(@Query('status') status?: string) {
    return this.service.findAll(status);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'อนุมัติคำขอ (Admin)' })
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.service.approve(id);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ปฏิเสธคำขอ (Admin)' })
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
  ) {
    return this.service.reject(id, reason);
  }
}
