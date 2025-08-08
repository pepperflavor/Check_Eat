import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ArrayMaxSize,
} from 'class-validator';

export class RegistFoodReviewDto {
  @ApiProperty({
    example: [1, 2, 3],
    description: '선택한 음식 ID 배열',
  })
  @IsArray()
  @IsNumber({}, { each: true })
  food_ids: any[];

  @ApiProperty({
    example: '가게 ID',
    description: '리뷰를 작성할 가게 ID',
  })
  @IsNumber()
  store_id: number;

  @ApiProperty({
    example: '짜장면 존맛탱',
    description: '음식에 대한 평가 텍스트',
  })
  @IsString()
  @IsOptional()
  revi_content?: string;

  @ApiProperty({
    example: '3',
    description: '이 음식을 추천하고 싶은 비건단계, 옵셔널',
  })
  @IsOptional()
  revi_reco_vegan: number;

  @ApiProperty({
    example: 0,
    description:
      '추천 단계 - 0: 추천함, 1: 보통, 2: 추천안함-이때는 텍스트 필수',
  })
  @IsNumber()
  revi_reco_step: number;

  @ApiProperty({
    example: 0,
    description: '리뷰 상태 - 0: 리뷰 완료, 1: 나중에 작성 예정',
  })
  @IsNumber()
  @IsOptional()
  revi_status?: number = 0;
}
