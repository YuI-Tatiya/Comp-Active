import { Controller, Get, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { ActivityFilterDto } from './dto/activity-filter.dto';
import { OptionalJwtAuthGuard } from '../../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { Viewer } from '../events/event-visibility.util';

@ApiTags('Activities')
@Controller('api/activities')
export class ActivitiesPublicController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  /**
   * GET /api/activities - ดูกิจกรรมทั้งหมดที่ approved (Public — login แล้วเห็นกิจกรรม restricted ที่ตัวเองมีสิทธิ์ด้วย)
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดูกิจกรรมทั้งหมด (เฉพาะที่อนุมัติแล้วและมีสิทธิ์เห็น)' })
  async findAll(@Query() filterDto: ActivityFilterDto, @CurrentUser() viewer: Viewer | null) {
    return this.activitiesService.findAllApproved(filterDto, viewer);
  }

  @Get('stats/platform')
  @ApiOperation({ summary: 'ดูสถิติรวมของแพลตฟอร์ม (Public)' })
  async getPlatformStats() {
    return this.activitiesService.getPlatformStats();
  }

  /**
   * GET /api/activities/:id - ดูรายละเอียดกิจกรรม (Public — 404 เดียวกันทั้งไม่พบจริงและไม่มีสิทธิ์เห็น)
   */
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดูรายละเอียดกิจกรรม' })
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() viewer: Viewer | null) {
    return this.activitiesService.findById(id, viewer);
  }
}
