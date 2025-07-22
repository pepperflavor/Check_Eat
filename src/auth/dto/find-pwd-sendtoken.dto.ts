import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class FindPWDSendTokenDto {
  @ApiProperty({
    example: 'test.example.com',
    description: '인증토큰 받을 이메일',
  })
  @IsEmail()
  email: string;

  @IsString()
  @ApiProperty({
    example: 'CuteBat',
    description: '로그인할때 사용하는 아이디',
  })
  log_id: string;

  @ApiProperty({
    example: 'ko',
    description: '유저가 사용하는 언어',
  })
  @IsString()
  language: string;
}