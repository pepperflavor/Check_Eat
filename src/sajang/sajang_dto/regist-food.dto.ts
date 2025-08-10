import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RegistFoodDto {
  @ApiProperty({ description: '등록중인 음식 id' })
  @IsString()
  foo_id: string;

  @ApiProperty({ description: '가게에 등록될 메뉴명' })
  @IsString()
  foo_name: string;

  @ApiProperty({ description: '음식 가격' })
  @IsString()
  foo_price: string;

  @ApiProperty({ description: '추천 비건 단계' })
  @IsString()
  foo_vegan?: string;
}
