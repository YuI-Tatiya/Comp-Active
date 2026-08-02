import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { ActivityFilterDto } from './dto/activity-filter.dto';

@ApiTags('Activities')
@Controller('api/activities')
export class ActivitiesPublicController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  /**
   * GET /api/activities - ดูกิจกรรมทั้งหมดที่ approved (Public)
   */
  @Get()
  @ApiOperation({ summary: 'ดูกิจกรรมทั้งหมด (เฉพาะที่อนุมัติแล้ว)' })
  async findAll(@Query() filterDto: ActivityFilterDto) {
    return this.activitiesService.findAllApproved(filterDto);
  }

  @Get('stats/platform')
  @ApiOperation({ summary: 'ดูสถิติรวมของแพลตฟอร์ม (Public)' })
  async getPlatformStats() {
    return this.activitiesService.getPlatformStats();
  }

  /**
   * GET /api/activities/:id - ดูรายละเอียดกิจกรรม (Public)
   */
  @Get(':id')
  @ApiOperation({ summary: 'ดูรายละเอียดกิจกรรม' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.findById(id);
  }
}
