import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SearchStoreMyfilterDto {

  @ApiProperty({ example: '0.123235', description: '유저 현재 위치의 위도' })
  @IsString()
  user_la: string;

  @ApiProperty({ example: '0.123235', description: '유저 현재 위치의 경도' })
  @IsString()
  user_long: string;

  @ApiProperty({ example: '1000', description: '1km == 1000 으로 입력' })
  @IsString()
  radius: string;

  @ApiProperty({ example: 'ko', description: '로그인 안한 유저라면, 사용하는 언어 값 줘야함' })
  @IsString()
  lang?: string;
}
