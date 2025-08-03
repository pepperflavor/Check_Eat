import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class WriteLaterReviewDto {
    @ApiProperty({ example: 123, description: '리뷰 ID (나중에 작성으로 저장된)' })
    @IsNumber()
    review_id: number;
  
    @ApiProperty({ example: '이 가게 맛집이에요!', description: '리뷰 내용', required: false })
    @IsString()
    @IsOptional()
    revi_content?: string;
  
    @ApiProperty({ example: 1, description: '추천 단계 (0: 추천함, 1: 보통, 2: 추천안함)' })
    @IsNumber()
    revi_reco_step: number;
  
    @ApiProperty({ example: 3, description: '추천 비건 단계', required: false })
    @IsNumber()
    @IsOptional()
    revi_reco_vegan?: number;
  }