import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class FavoritStoreDto {
  @ApiProperty({ example: '2', description: '가게 아이디, sto_id' })
  @IsString()
  sto_id: string;
}
