import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class DetailStoreDto {
  @ApiProperty({
    example: 'number형, 1',
    description: '이전 페이지에서 sto_id로 받았던 id',
  })
  @IsNumber()
  sto_id: number;

  @ApiProperty({
    example: 'ko',
    description: '비회원일 경우 사용하는 언어 (회원은 무시됨)',
    required: false,
  })
  @IsOptional()
  @IsString()
  user_lang?: string;
}
