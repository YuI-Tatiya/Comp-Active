import { IsInt, Min, Max, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEvaluationDto {
  @ApiProperty({ description: 'ID ของการลงทะเบียน' })
  @IsInt()
  @IsNotEmpty()
  registrationId: number;

  @ApiProperty({ description: 'คะแนนการทำงานเป็นทีม (0-1)', example: 1 })
  @IsInt()
  @Min(0)
  @Max(1)
  teamwork: number;

  @ApiProperty({ description: 'คะแนนภาวะผู้นำ (0-1)', example: 1 })
  @IsInt()
  @Min(0)
  @Max(1)
  leadership: number;

  @ApiProperty({ description: 'คะแนนการสื่อสาร (0-1)', example: 1 })
  @IsInt()
  @Min(0)
  @Max(1)
  communication: number;

  @ApiProperty({ description: 'คะแนนการแก้ปัญหา (0-1)', example: 1 })
  @IsInt()
  @Min(0)
  @Max(1)
  problemSolving: number;

  @ApiProperty({ description: 'คะแนนการปรับตัว (0-1)', example: 1 })
  @IsInt()
  @Min(0)
  @Max(1)
  adaptability: number;

  @ApiProperty({ description: 'ความคิดเห็นเพิ่มเติม', required: false })
  @IsString()
  @IsOptional()
  comment?: string;
}
