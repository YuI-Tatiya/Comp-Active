import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    studentId?: string;
    username?: string;
    validUntil?: Date | null;
  };
}
