import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class FindIDDto {
  @ApiProperty({
    example: 'test.example.com',
    description: '인증토큰 받을 이메일',
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
