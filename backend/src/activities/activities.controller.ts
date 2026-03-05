import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ActivityFilterDto } from './dto/activity-filter.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/role.enum';

@ApiTags('Activities')
@Controller('api/activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  /**
   * GET /api/activities - ดูกิจกรรมทั้งหมดที่ approved (Public)
   */
  @Get()
  @ApiOperation({ summary: 'ดูกิจกรรมทั้งหมด (เฉพาะที่อนุมัติแล้ว)' })
  async findAll(@Query() filterDto: ActivityFilterDto) {
    return this.activitiesService.findAllApproved(filterDto);
  }

  /**
   * GET /api/activities/my - ดูกิจกรรมที่ฉันสร้าง (Organizer)
   */
  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดูกิจกรรมที่ฉันสร้าง (Organizer)' })
  async findMyActivities(@CurrentUser('id') userId: number) {
    return this.activitiesService.findByOrganizer(userId);
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดูกิจกรรมที่รอการอนุมัติ (Admin)' })
  async findPendingApproval() {
    return this.activitiesService.findPendingApproval();
  }

  /**
   * GET /api/activities/pending-cancel - ดูรายการรอยกเลิก (Admin)
   */
  @Get('pending-cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดูรายการรอยกเลิก (Admin)' })
  async findPendingCancellation() {
    return this.activitiesService.findPendingCancellation();
  }

  @Get('stats/platform')
  @ApiOperation({ summary: 'ดูสถิติรวมของแพลตฟอร์ม (Public)' })
  async getPlatformStats() {
    return this.activitiesService.getPlatformStats();
  }

  @Get('stats/organizer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดูสถิติของผู้จัดงาน (Organizer)' })
  async getOrganizerStats(@CurrentUser('id') userId: number) {
    return this.activitiesService.getOrganizerStats(userId);
  }

  /**
   * GET /api/activities/:id - ดูรายละเอียดกิจกรรม (Public)
   */
  @Get(':id')
  @ApiOperation({ summary: 'ดูรายละเอียดกิจกรรม' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.findById(id);
  }

  /**
   * POST /api/activities - สร้างกิจกรรมใหม่ (Organizer)
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'สร้างกิจกรรมใหม่ (Organizer / Admin)' })
  async create(
    @CurrentUser('id') userId: number,
    @Body() createDto: CreateActivityDto,
  ) {
    return this.activitiesService.create(userId, createDto);
  }

  /**
   * PATCH /api/activities/:id - แก้ไขกิจกรรม (Organizer owner / Admin)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'แก้ไขกิจกรรม (เจ้าของ / Admin)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: UserRole,
    @Body() updateDto: UpdateActivityDto,
  ) {
    return this.activitiesService.update(id, userId, userRole, updateDto);
  }

  /**
   * POST /api/activities/upload-image - อัปโหลดรูปภาพกิจกรรม
   */
  @Post('upload-image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'อัปโหลดรูปภาพกิจกรรม (Organizer / Admin)' })
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
        destination: './public/uploads/activities',
        filename: (req, file, cb) => {
          const uniqueSuffix = crypto.randomUUID();
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file uploaded or invalid file format');
    }
    // Return relative URL that will be saved in DB and served by static module
    return {
      message: 'อัปโหลดรูปภาพสำเร็จ',
      imageUrl: `/uploads/activities/${file.filename}`,
    };
  }

  /**
   * DELETE /api/activities/:id - ลบกิจกรรม
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ลบกิจกรรม (เจ้าของ / Admin)' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: UserRole,
  ) {
    await this.activitiesService.delete(id, userId, userRole);
    return { message: 'ลบกิจกรรมสำเร็จ' };
  }

  /**
   * PATCH /api/activities/:id/approve - อนุมัติกิจกรรม (Admin)
   */
  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'อนุมัติกิจกรรม (Admin)' })
  async approve(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.approve(id);
  }

  /**
   * PATCH /api/activities/:id/reject - ปฏิเสธกิจกรรม (Admin)
   */
  /**
   * PATCH /api/activities/:id/reject - ปฏิเสธกิจกรรม (Admin)
   */
  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ปฏิเสธกิจกรรม (Admin)' })
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
  ) {
    return this.activitiesService.reject(id, reason);
  }

  /**
   * POST /api/activities/:id/request-cancel - ร้องขอการยกเลิกกิจกรรม (Organizer)
   */
  @Post(':id/request-cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ร้องขอการยกเลิกกิจกรรม (Organizer)' })
  async requestCancellation(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Body('reason') reason: string,
  ) {
    return this.activitiesService.requestCancellation(id, userId, reason);
  }


  /**
   * PATCH /api/activities/:id/approve-cancel - อนุมัติการยกเลิกกิจกรรม (Admin)
   */
  @Patch(':id/approve-cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'อนุมัติการยกเลิกกิจกรรม (Admin)' })
  async approveCancellation(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.approveCancellation(id);
  }
}
