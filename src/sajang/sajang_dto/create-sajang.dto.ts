import {
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSajangDTO {
  @ApiProperty({ example: 'testUser01', description: '로그인할때 쓸 아이디' })
  @IsString()
  log_id: string;

  @ApiProperty({ example: 'qwerQWER1234', description: '비밀번호' })
  @IsString()
  log_pwd: string;

  @ApiProperty({ example: 'test@example.com', description: '이메일 주소' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '010~', description: '전화번호' })
  @IsString()
  phone: string;
}
