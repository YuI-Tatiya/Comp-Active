import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, IsInt, Min, Max, IsOptional, IsBoolean } from 'class-validator';

export class UpdateApiKeyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  rateLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
