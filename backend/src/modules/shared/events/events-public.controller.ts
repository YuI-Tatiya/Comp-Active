import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { OptionalJwtAuthGuard } from '../../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { Viewer } from './event-visibility.util';

@ApiTags('Events')
@Controller('api/events')
export class EventsPublicController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * GET /api/events - ดูงานทั้งหมดที่เปิดสาธารณะ (Public — login แล้วเห็นงาน restricted ที่ตัวเองมีสิทธิ์ด้วย)
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดูงานทั้งหมด (เฉพาะที่มีกิจกรรมย่อยอนุมัติแล้วและมีสิทธิ์เห็น)' })
  async findAll(@CurrentUser() viewer: Viewer | null) {
    return this.eventsService.findAllPublic(viewer);
  }

  /**
   * GET /api/events/:id/public - ดูรายละเอียดงาน (Public)
   */
  @Get(':id/public')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดูรายละเอียดงาน (Public)' })
  async findOne(@Param('id') id: string, @CurrentUser() viewer: Viewer | null) {
    return this.eventsService.findByIdPublic(id, viewer);
  }
}
