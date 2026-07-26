import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ExtendValidityDto } from './dto/extend-validity.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Users')
@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/users/me - ดูโปรไฟล์ตัวเอง
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดูโปรไฟล์ตัวเอง' })
  async getMyProfile(@CurrentUser('id') userId: number) {
    return this.usersService.findById(userId);
  }

  /**
   * PATCH /api/users/me - อัพเดทโปรไฟล์ตัวเอง
   */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'อัพเดทโปรไฟล์' })
  async updateMyProfile(
    @CurrentUser('id') userId: number,
    @Body() updateDto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(userId, updateDto);
  }

  /**
   * GET /api/users - ดูรายชื่อผู้ใช้ทั้งหมด (Admin)
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดูรายชื่อผู้ใช้ทั้งหมด (Admin)' })
  async findAll() {
    return this.usersService.findAll();
  }

  /**
   * PATCH /api/users/:id/role - เปลี่ยน Role (Admin)
   */
  @Patch(':id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'เปลี่ยน Role ผู้ใช้ (Admin)' })
  async changeRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: UserRole,
  ) {
    return this.usersService.changeRole(id, role);
  }

  /**
   * PATCH /api/users/:id/block - บล็อกผู้ใช้ (Admin)
   */
  @Patch(':id/block')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'บล็อกผู้ใช้ (Admin)' })
  async blockUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.blockUser(id);
  }

  /**
   * PATCH /api/users/:id/unblock - ปลดบล็อกผู้ใช้ (Admin)
   */
  @Patch(':id/unblock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ปลดบล็อกผู้ใช้ (Admin)' })
  async unblockUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.unblockUser(id);
  }

  /**
   * PATCH /api/users/:id/extend - ต่ออายุบัญชี Organizer (Admin)
   */
  @Patch(':id/extend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ต่ออายุบัญชี Organizer (Admin)' })
  async extendValidity(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ExtendValidityDto,
  ) {
    return this.usersService.extendValidity(id, dto.validDays);
  }

  /**
   * POST /api/users/generate-password - สร้างรหัสผ่านให้ organizer (Admin)
   */
  @Post('generate-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'สร้างรหัสผ่านให้ผู้ใช้ (Admin)' })
  async generatePassword(@Body('email') email: string) {
    return this.usersService.generatePassword(email);
  }

  /**
   * DELETE /api/users/:id - ลบผู้ใช้ (Admin)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ลบผู้ใช้ (Admin)' })
  async deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') adminId: number,
  ) {
    await this.usersService.deleteUser(id, adminId);
    return { message: 'ลบผู้ใช้สำเร็จ' };
  }
}
