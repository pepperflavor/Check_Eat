import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class RegistLaterReviewDto {
  @ApiProperty({
    example: '2',
    description: '리뷰 작성할 수 있는 곳이라면 응답에 포함된 sto_id',
  })
  @IsNumber()
  sto_id: number;
}
