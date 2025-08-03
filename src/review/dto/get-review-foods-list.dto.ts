import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class GetReviewFoodsPageDto {
  @ApiProperty({
    example: '2',
    description: '영수증 인식에서 리턴받은 sto_id',
  })
  @IsNumber()
  sto_id: number;
}
