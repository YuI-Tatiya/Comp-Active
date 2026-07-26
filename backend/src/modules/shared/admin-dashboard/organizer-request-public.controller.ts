import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OrganizerRequestsService } from './organizer-request.service';
import { CreateOrganizerRequestDto } from './dto/create-organizer-request.dto';

@ApiTags('Organizer Requests')
@Controller('api/organizer-requests')
export class OrganizerRequestPublicController {
  constructor(private readonly service: OrganizerRequestsService) {}

  @Post()
  @ApiOperation({ summary: 'ส่งคำขอเป็น Organizer (สาธารณะ)' })
  create(@Body() dto: CreateOrganizerRequestDto) {
    return this.service.create(dto);
  }
}
