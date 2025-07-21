import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class UpdatePWDDto {

  @ApiProperty({
    example: 'Qwer!!1234',
    description: '새 비밀번호',
  })
  @IsString()
  pwd: string;
}
