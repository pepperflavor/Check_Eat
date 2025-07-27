import { ApiProperty } from '@nestjs/swagger';
import {  IsString } from 'class-validator';

export class UpdateNickDto {
  @ApiProperty({ example: '버섯탕수육', description: '유저-닉네임 변경' })
  @IsString()
  nickname: string;
}
