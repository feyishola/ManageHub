import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartThreadDto {
  @ApiProperty({ description: 'The ID of the user to start a thread with' })
  @IsInt()
  @IsPositive()
  recipientId: number;
}
