import {
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignInDTO {
  @ApiProperty({
    example: 'loveHALAL',
    description: '로그인을 위함 아이디, 유니크',
  })
  @IsString()
  log_id: string;

  @ApiProperty({
    example: 'mypassword123!!',
    description:
      '로그인을 위함 비밀번호, 영문, 숫자, 특수문자 중 2가지 이상 조합으로 8~16자',
  })
  @Min(8)
  @Max(16)
  @IsString()
  @Matches(
    /^(?!^[a-zA-Z]+$)(?!^[0-9]+$)(?!^[^a-zA-Z0-9]+$)[a-zA-Z0-9!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]{8,16}$/,
    {
      message:
        '비밀번호는 영문, 숫자, 특수문자 중 2가지 이상 조합으로 8~16자여야 합니다.',
    },
  )
  log_pwd: string;
}
