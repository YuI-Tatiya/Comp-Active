import { IsInt, Min, Max, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEvaluationDto {
  @ApiProperty({ description: 'ID ของการลงทะเบียน' })
  @IsInt()
  @IsNotEmpty()
  registrationId: number;

  @ApiProperty({ description: 'คะแนนการสื่อสาร (0-1)', example: 1 })
  @IsInt()
  @Min(0)
  @Max(1)
  communication: number;

  @ApiProperty({ description: 'คะแนนการบริหารจัดการเวลา (0-1)', example: 1 })
  @IsInt()
  @Min(0)
  @Max(1)
  timeManagement: number;

  @ApiProperty({ description: 'คะแนนความยืดหยุ่นและปรับตัว (0-1)', example: 1 })
  @IsInt()
  @Min(0)
  @Max(1)
  flexibilityAdaptability: number;

  @ApiProperty({ description: 'คะแนนการทำงานร่วมกับผู้อื่น (0-1)', example: 1 })
  @IsInt()
  @Min(0)
  @Max(1)
  teamworkCollaboration: number;

  @ApiProperty({ description: 'คะแนนการคิดเชิงวิเคราะห์และเชิงวิพากษ์ (0-1)', example: 1 })
  @IsInt()
  @Min(0)
  @Max(1)
  analyticCriticalThinking: number;

  @ApiProperty({ description: 'คะแนนการตัดสินใจ (0-1)', example: 1 })
  @IsInt()
  @Min(0)
  @Max(1)
  decisionMaking: number;

  @ApiProperty({ description: 'คะแนนการคิดเชิงสร้างสรรค์ (0-1)', example: 1 })
  @IsInt()
  @Min(0)
  @Max(1)
  creativity: number;

  @ApiProperty({ description: 'คะแนนการแก้ไขปัญหาที่มีความซับซ้อน (0-1)', example: 1 })
  @IsInt()
  @Min(0)
  @Max(1)
  complexProblemSolving: number;

  @ApiProperty({ description: 'คะแนนการใฝ่เรียนรู้ตลอดเวลา (0-1)', example: 1 })
  @IsInt()
  @Min(0)
  @Max(1)
  curiosityLifelongLearning: number;

  @ApiProperty({ description: 'คะแนนการโน้มน้าวและต่อรอง (0-1)', example: 1 })
  @IsInt()
  @Min(0)
  @Max(1)
  negotiationPersuasion: number;

  @ApiProperty({ description: 'คะแนนภาวะผู้นำ (0-1)', example: 1 })
  @IsInt()
  @Min(0)
  @Max(1)
  leadership: number;

  @ApiProperty({ description: 'คะแนนทัศนคติเชิงบวก (0-1)', example: 1 })
  @IsInt()
  @Min(0)
  @Max(1)
  positiveAttitude: number;

  @ApiProperty({ description: 'ความคิดเห็นเพิ่มเติม', required: false })
  @IsString()
  @IsOptional()
  comment?: string;
}
