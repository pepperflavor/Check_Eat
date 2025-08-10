import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

export class DeleteFoodDto {
  @IsString()
  @ApiProperty({ description: '음식 아이디'})
  foo_id: string;
}
