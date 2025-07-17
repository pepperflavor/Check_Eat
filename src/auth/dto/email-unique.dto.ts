import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class EmailUniqueDto {
  @IsEmail()
  @IsString()
  @ApiProperty({ example: 'test@example', description: '이메일 중복확인' })
  email: string;
}
