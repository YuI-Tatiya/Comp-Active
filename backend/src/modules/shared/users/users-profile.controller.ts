import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('api/users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersProfileController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/users/me - ดูโปรไฟล์ตัวเอง (ทุก role ที่ login แล้ว)
   */
  @Get('me')
  @ApiOperation({ summary: 'ดูโปรไฟล์ตัวเอง' })
  async getMyProfile(@CurrentUser('id') userId: number) {
    return this.usersService.findById(userId);
  }

  /**
   * PATCH /api/users/me - อัพเดทโปรไฟล์ตัวเอง (ทุก role ที่ login แล้ว)
   */
  @Patch('me')
  @ApiOperation({ summary: 'อัพเดทโปรไฟล์' })
  async updateMyProfile(@CurrentUser('id') userId: number, @Body() updateDto: UpdateUserDto) {
    return this.usersService.updateProfile(userId, updateDto);
  }
}
