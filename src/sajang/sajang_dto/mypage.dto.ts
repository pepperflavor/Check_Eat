import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class SajangStoDto {
  @Transform(({ value }) => {
    // 문자열이면 숫자로 변환, 숫자면 그대로 반환
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? value : parsed;
    }
    return value;
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @ApiProperty({ description: '정보 수정할 가게 아이디' })
  sto_id?: number;
}
