import { IsInt } from 'class-validator';

export class CheckInSelfDto {
  @IsInt()
  activityId: number;
}
