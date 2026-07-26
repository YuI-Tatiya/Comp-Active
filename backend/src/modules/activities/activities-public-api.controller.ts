import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { ApiKeyThrottlerGuard } from '../../common/guards/api-key-throttler.guard';

/**
 * "Activity Newsfeed" — the public developer-facing surface for activities.
 * Lives in the owning domain module (not developer-portal) per the "controllers
 * segregated by domain access" convention; guarded by API key + per-key rate limit
 * instead of JWT, since callers are external integrations, not logged-in users.
 */
@ApiTags('Developer Portal')
@ApiSecurity('x-api-key')
@Controller('api/v1/activities')
@UseGuards(ApiKeyGuard, ApiKeyThrottlerGuard)
export class ActivitiesPublicApiController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Activity Newsfeed — กิจกรรมที่อนุมัติแล้วทั้งหมด (ต้องใช้ x-api-key)' })
  findAll() {
    return this.activitiesService.findAllForNewsfeed();
  }

  @Get(':id')
  @ApiOperation({ summary: 'รายละเอียดกิจกรรม (ต้องใช้ x-api-key)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.findByIdForNewsfeed(id);
  }
}
