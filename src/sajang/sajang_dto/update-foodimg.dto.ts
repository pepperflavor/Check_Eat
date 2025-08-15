// src/sajang/sajang_dto/update-food-img.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';

export class UpdateFoodImgDto {
  @IsNumber()
  @ApiProperty({ description: '음식 id' })
  foo_id: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({
    description: 'sto_id 음식이 해당 매장에 등록된게 맞는지 확인',
  })
  sto_id?: number; // 특정 매장 소속 확인이 필요하면 같이 받기(선택)
}
