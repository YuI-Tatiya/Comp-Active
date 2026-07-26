import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SiteContentService } from './site-content.service';

@ApiTags('Admin Dashboard')
@Controller('api/site-content')
export class SiteContentPublicController {
  constructor(private readonly siteContentService: SiteContentService) {}

  @Get()
  @ApiOperation({ summary: 'ดูเนื้อหาหน้า Landing Page ทั้งหมด (Public)' })
  findAll() {
    return this.siteContentService.findAllPublic();
  }
}
