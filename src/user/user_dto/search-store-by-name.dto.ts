import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SearchStoreByNameDto {
  @ApiProperty({
    example: '봉추찜닭',
    description: '이름으로 가게 찾기',
  })
  @IsString()
  sto_name: string;

  //   sto_id: number;
}
