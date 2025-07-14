import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class CheckEmailToken {
  @ApiProperty({ example: 'example@test.com', description: '토큰 받을 이메일' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'ASDQ@123Aa', description: '토큰' })
  @IsString()
  token: string;
}
