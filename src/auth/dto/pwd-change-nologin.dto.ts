import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class ChagePwdNoLogin {
  @ApiProperty({
    example: 'test@example.com',
    description: '이메일',
  })
  @IsEmail()
  ld_email: string;

  @ApiProperty({
    example: 'qwe123!!',
    description: '바꿀 새 비밀번호',
  })
  @IsString()
  new_pwd: string;
}
