import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class updateStoreDataDto {
  @IsNumber()
  @ApiProperty({ description: '수정할 가게 id' })
  sto_id: number;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: '가게 상호명' })
  sto_name?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: '가게 연락처' })
  sto_phone?: string;

  @ApiProperty({ description: '가게 영어이름' })
  @IsString()
  @IsOptional()
  sto_name_en?: string;
}
