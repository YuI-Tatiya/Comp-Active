import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as crypto from 'crypto';
import { EventsService } from '../shared/events/events.service';
import { CreateEventDto } from '../shared/events/dto/create-event.dto';
import { UpdateEventDto } from '../shared/events/dto/update-event.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Events')
@Controller('api/events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ORGANIZER, UserRole.ADMIN)
@ApiBearerAuth()
export class EventsOrganizerController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * GET /api/events/my - ดูงานที่ฉันสร้าง (Organizer)
   */
  @Get('my')
  @ApiOperation({ summary: 'ดูงานที่ฉันสร้าง (Organizer)' })
  async findMyEvents(@CurrentUser('id') userId: number) {
    return this.eventsService.findByOrganizer(userId);
  }

  /**
   * GET /api/events/:id - ดูรายละเอียดงาน (เจ้าของ / Admin)
   */
  @Get(':id')
  @ApiOperation({ summary: 'ดูรายละเอียดงาน (เจ้าของ / Admin)' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.findById(id);
  }

  /**
   * GET /api/events/:id/survey-results - ดูผลสรุปแบบสำรวจของงาน (เจ้าของ / Admin)
   */
  @Get(':id/survey-results')
  @ApiOperation({ summary: 'ดูผลสรุปแบบสำรวจของงาน (เจ้าของ / Admin)' })
  async getSurveyResults(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: UserRole,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.eventsService.getSurveyResults(id, userId, userRole);
  }

  /**
   * PATCH /api/events/:id - แก้ไขงาน (เจ้าของ / Admin)
   */
  @Patch(':id')
  @ApiOperation({ summary: 'แก้ไขงาน (เจ้าของ / Admin)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: UserRole,
    @Body() updateDto: UpdateEventDto,
  ) {
    return this.eventsService.update(userId, userRole, id, updateDto);
  }

  /**
   * POST /api/events - สร้างงานใหม่พร้อมกิจกรรมย่อย (Organizer / Admin)
   */
  @Post()
  @ApiOperation({ summary: 'สร้างงานใหม่พร้อมกิจกรรมย่อย (Organizer / Admin)' })
  async create(@CurrentUser('id') userId: number, @Body() createDto: CreateEventDto) {
    return this.eventsService.create(userId, createDto);
  }

  /**
   * POST /api/events/upload-attachment - อัปโหลดไฟล์แนบของกิจกรรม
   */
  @Post('upload-attachment')
  @ApiOperation({ summary: 'อัปโหลดไฟล์แนบของกิจกรรม (Organizer / Admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/uploads/attachments',
        filename: (req, file, cb) => {
          const uniqueSuffix = crypto.randomUUID();
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(pdf|docx?|pptx?|xlsx?|zip)$/i)) {
          return cb(new Error('ชนิดไฟล์ไม่รองรับ'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadAttachment(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file uploaded or invalid file format');
    }
    return {
      message: 'อัปโหลดไฟล์แนบสำเร็จ',
      attachmentUrl: `/uploads/attachments/${file.filename}`,
    };
  }
}
