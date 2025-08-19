import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateFoodDataDto {
  @IsNumber()
  @ApiProperty({ description: '가게 ID' })
  sto_id: number;

  @IsNumber()
  @ApiProperty({ description: '음식 ID' })
  foo_id: number;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: '음식 이름' })
  foo_name?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: '음식 가격' })
  foo_price?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiProperty({ description: '재료들' })
  foo_material?: string[];

  @IsNumber()
  @IsOptional()
  @ApiProperty({ description: '추론된 비건 단계' })
  foo_vegan?: number;
}
