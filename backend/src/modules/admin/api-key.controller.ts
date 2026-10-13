import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Developer Portal')
@Controller('api/developer-portal/keys')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  @ApiOperation({ summary: 'ออก API key ใหม่สำหรับ external developer (Admin) — ค่า rawKey แสดงครั้งเดียว' })
  create(@Body() dto: CreateApiKeyDto, @CurrentUser('id') adminId: number) {
    return this.apiKeyService.create(adminId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'ดู API key ทั้งหมด (Admin)' })
  findAll() {
    return this.apiKeyService.findAll();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'แก้ไข API key (Admin)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateApiKeyDto) {
    return this.apiKeyService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'เพิกถอน API key (Admin)' })
  revoke(@Param('id', ParseIntPipe) id: number) {
    return this.apiKeyService.revoke(id);
  }
}
