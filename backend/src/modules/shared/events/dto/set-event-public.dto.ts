import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetEventPublicDto {
  @ApiProperty({ example: true, description: 'true = เผยแพร่, false = ไม่เผยแพร่' })
  @IsBoolean()
  isPublic: boolean;
}
