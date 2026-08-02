import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, IsInt, Min, Max, IsOptional } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Student portal integration' })
  @IsString()
  @MaxLength(100)
  label: string;

  @ApiPropertyOptional({ example: 60, description: 'Requests per minute, default 60' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  rateLimit?: number;
}
