import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserAllDto {
  @IsOptional()
  @ApiProperty({ example: [1, 2, 3], description: '19가지 보편적인 알러지' })
  common_al?: any[];

  @ApiProperty({ example: '멍게', description: '개인적인 알러지' })
  @IsString()
  @IsOptional()
  personal_al?: string;
}
