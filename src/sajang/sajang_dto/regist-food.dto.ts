import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsNotEmpty, Matches } from 'class-validator';

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

  @ApiProperty({ description: '추천 비건 단계 (1-7)', example: '1' })
  @IsNotEmpty({ message: '비건 단계는 필수입니다' })
  @IsString()
  @Matches(/^[1-7]$/, { message: '비건 단계는 1~7 사이의 값이어야 합니다' })
  foo_vegan: string;

  @ApiProperty({ description: '음식을 등록할 store id' })
  @IsNumber()
  sto_id: number;
}
