import { ApiOperation, ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class SearchFoodByNameDto {
  @IsNumber()
  @ApiProperty({ description: '음식이 속한 가게 id' })
  sto_id: number;

  @IsString()
  @ApiProperty({ description: '검색할 음식 이름' })
  foo_name: string;

  
}
