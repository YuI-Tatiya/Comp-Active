import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Registrations')
@Controller('api/registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  /**
   * POST /api/registrations - ลงทะเบียนเข้าร่วมกิจกรรม (Student)
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ลงทะเบียนเข้าร่วมกิจกรรม (Student)' })
  async create(
    @CurrentUser('id') studentId: number,
    @Body() createDto: CreateRegistrationDto,
  ) {
    return this.registrationsService.create(studentId, createDto.activityId);
  }

  /**
   * DELETE /api/registrations/:id - ยกเลิกการลงทะเบียน (Student)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ยกเลิกการลงทะเบียน (Student)' })
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') studentId: number,
  ) {
    await this.registrationsService.cancel(id, studentId);
    return { message: 'ยกเลิกการลงทะเบียนสำเร็จ' };
  }

  /**
   * GET /api/registrations/my - ดูประวัติการลงทะเบียน (Student)
   */
  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดูประวัติการลงทะเบียน (Student)' })
  async findMy(@CurrentUser('id') studentId: number) {
    return this.registrationsService.findByStudent(studentId);
  }

  /**
   * GET /api/registrations/activity/:id - ดูรายชื่อผู้สมัคร (Organizer)
   */
  @Get('activity/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดูรายชื่อผู้สมัครของกิจกรรม (Organizer)' })
  async findByActivity(@Param('id', ParseIntPipe) activityId: number) {
    return this.registrationsService.findByActivity(activityId);
  }

  /**
   * PATCH /api/registrations/:id/confirm - ยืนยันผู้เข้าร่วม (Organizer)
   */
  @Patch(':id/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ยืนยันผู้เข้าร่วม (Organizer)' })
  async confirm(@Param('id', ParseIntPipe) id: number) {
    return this.registrationsService.confirm(id);
  }

  /**
   * PATCH /api/registrations/:id/check-in - เช็คอิน (Organizer)
   */
  @Patch(':id/check-in')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'เช็คอินเข้าร่วมกิจกรรม (Organizer)' })
  async checkIn(@Param('id', ParseIntPipe) id: number) {
    return this.registrationsService.checkIn(id);
  }
}
