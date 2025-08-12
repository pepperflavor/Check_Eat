import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';

export class SajangStoDto {
  @IsNumber()
  @IsOptional()
  @ApiProperty({ description: '정보 수정할 가게 아이디' })
  sto_id?: number;
}
