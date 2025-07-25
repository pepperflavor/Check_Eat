import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class FindAccountTokenVerifyDto {
  @ApiProperty({
    example: 'test.example.com',
    description: '인증토큰 받은 이메일',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'test.example.com',
    description: '이메일로 받은 토큰',
  })
  @IsString()
  token: string;
}
