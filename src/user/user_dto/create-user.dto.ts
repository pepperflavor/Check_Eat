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

// 개인 회원 가입 DTO
export class CreateUserDTO {
  @ApiProperty({
    example: 'loveHALAL',
    description: '가입을 위한 아이디, 유니크',
  })
  @IsString()
  log_Id: string;

  @ApiProperty({
    example: 'mypassword123!!',
    description:
      '로그인을 위함 비밀번호, 영문, 숫자, 특수문자 중 2가지 이상 조합으로 8~16자',
    required: false,
  })
  @IsString()
  @IsOptional()
  log_pwd?: string | null;

  @ApiProperty({ example: 'example@co.kr', description: '이메일, 유니크' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'ko', description: '유저가 사용하는 언어' })
  @IsString()
  ld_lang: string;

  @ApiProperty({
    example: '납작복숭아, 송충이털',
    description: '19가지 보편적인 원료 외 개인적으로 알러지 갖고있는 것',
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly allergy?: string;

  @ApiProperty({
    example: '가려먹는 냥곰이',
    description: '닉네임, 중복가능',
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly nickname?: string;

  @ApiProperty({
    example: '[1,2,3]',
    description:
      '19가지 보편적인 알러지중 해당하는 것들, 숫자 배열로 입력, 알러지 테이블 id 참고',
    required: false,
  })
  @IsOptional()
  @IsArray()
  readonly commonAllergies?: number[];

  @ApiProperty({
    example: '1',
    description: '비건이 아니라면 null, 비건이라면 해당하는 당계 숫자 입력',
  })
  @IsOptional()
  @IsInt()
  readonly vegan?: number | null;

  @ApiProperty({
    example: '1',
    description: '할랄 해당된다면 1, 입력안하면 디폴트 0 입력됨',
  })
  @IsOptional()
  @IsInt()
  readonly isHalal?: number;

  @ApiProperty({
    example: 0,
    description: '0: 일반회원, 1: 애플 로그인',
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  readonly appleType?: number;
}
