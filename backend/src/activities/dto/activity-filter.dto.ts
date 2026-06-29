import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityStatus, ApprovalStatus } from '../../common/enums/status.enum';

export class ActivityFilterDto {
  @ApiPropertyOptional({ description: 'ค้นหาตามชื่อ' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'กรองตามหมวดหมู่' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ enum: ActivityStatus, description: 'กรองตามสถานะ' })
  @IsEnum(ActivityStatus)
  @IsOptional()
  status?: ActivityStatus;

  @ApiPropertyOptional({
    enum: ApprovalStatus,
    description: 'กรองตามสถานะการอนุมัติ',
  })
  @IsEnum(ApprovalStatus)
  @IsOptional()
  approvalStatus?: ApprovalStatus;
}
