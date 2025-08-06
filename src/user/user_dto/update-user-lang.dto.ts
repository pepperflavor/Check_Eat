import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateUserLangDto {
  @ApiProperty({ example: 'ar', description: '사용하는 언어- ko | en | ar' })
  @IsString()
  new_lang: string;
}
