import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateReviewDto {
  @ApiProperty({ example: '123', description: '리뷰 ID' })
  @IsString()
  review_id: string;

  @ApiProperty({ example: ['1', '2'], description: '음식 ID 목록' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  food_ids?: string[];

  @ApiProperty({ example: '0', description: '추천 단계 (0: 추천, 1: 보통, 2: 추천안함)' })
  @IsString()
  revi_reco_step: string;

  @ApiProperty({ example: '3', description: '비건 추천 레벨' })
  @IsOptional()
  @IsString()
  revi_reco_vegan?: string;

  @ApiProperty({ example: '짜장면 맛있음', description: '리뷰 내용' })
  @IsOptional()
  @IsString()
  revi_content?: string;
}