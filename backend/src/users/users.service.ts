import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '../common/enums/role.enum';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * ดึงข้อมูลผู้ใช้ทั้งหมด (Admin)
   */
  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      select: ['id', 'name', 'email', 'role', 'studentId', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * ดึงข้อมูลผู้ใช้ตาม ID
   */
  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'name', 'email', 'role', 'studentId', 'googleId', 'createdAt'],
    });

    if (!user) {
      throw new NotFoundException(`ไม่พบผู้ใช้งาน ID: ${id}`);
    }

    return user;
  }

  /**
   * อัพเดทข้อมูลโปรไฟล์ตัวเอง
   */
  async updateProfile(userId: number, updateDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(userId);
    Object.assign(user, updateDto);
    const updatedUser = await this.userRepository.save(user);
    this.logger.log(`User profile updated: ${updatedUser.email}`);
    return updatedUser;
  }

  /**
   * เปลี่ยน Role ผู้ใช้ (Admin only)
   */
  async changeRole(userId: number, newRole: UserRole): Promise<User> {
    const user = await this.findById(userId);
    user.role = newRole;
    const updatedUser = await this.userRepository.save(user);
    this.logger.log(`User role changed: ${updatedUser.email} → ${newRole}`);
    return updatedUser;
  }

  /**
   * ลบผู้ใช้ (Admin only)
   */
  async deleteUser(userId: number, adminId: number): Promise<void> {
    if (userId === adminId) {
      throw new ForbiddenException('ไม่สามารถลบบัญชีตัวเองได้');
    }

    const user = await this.findById(userId);
    await this.userRepository.remove(user);
    this.logger.log(`User deleted: ${user.email} (by admin ID: ${adminId})`);
  }

  /**
   * นับจำนวนผู้ใช้ตาม Role
   */
  async countByRole(): Promise<{ role: string; count: number }[]> {
    return this.userRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .getRawMany();
  }

  /**
   * นับจำนวนผู้ใช้ทั้งหมด
   */
  async countAll(): Promise<number> {
    return this.userRepository.count();
  }
}
