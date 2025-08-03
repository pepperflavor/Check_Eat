import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class GetReviewOneMenuDto {
  @ApiProperty({
    example: '2',
    description: '영수증 인식에서 리턴받은 sto_id',
  })
  @IsNumber()
  sto_id: number;

  @ApiProperty({ example: 'en', description: '유저가 사용하는 언어' })
  @IsString()
  lang: string;

  @ApiProperty({ example: '10', description: 'foo_id를 보내주면 됩니다' })
  @IsNumber()
  foo_id: number;

  @ApiPropertyOptional({ example: 1, description: '페이지 번호 (기본: 1)' })
  @IsOptional()
  @IsNumber()
  page?: number;


  @ApiPropertyOptional({ example: 10, description: '페이지당 항목 수 (기본: 10)' })
  @IsOptional()
  @IsNumber()
  limit?: number;
}
