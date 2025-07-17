import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class SendEmailTokenDTO {
  @ApiProperty({ example: 'example@test.com', description: '토큰 받을 이메일' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'ko', description: '사용자가 선택한 언어' })
  @IsString()
  language: string;
}
