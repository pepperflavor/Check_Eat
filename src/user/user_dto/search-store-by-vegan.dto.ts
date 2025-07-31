import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SearchStoreByVeganDto {
  @ApiProperty({
    example: '비건 정도',
    description: '숫자로 보내주면 됌 - 노션참조',
  })
  @IsString()
  vegan_level: number;

  @ApiProperty({ example: '0.123235', description: '유저 현재 위치의 위도' })
  @IsString()
  user_la: string;

  @ApiProperty({ example: '0.123235', description: '유저 현재 위치의 경도' })
  @IsString()
  user_long: string;
}
