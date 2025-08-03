import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class IsRegistStoreDto {
  @ApiProperty({
    example: '슈의 라면가게',
    description: '영수증에서 발췌된 가게명',
  })
  @IsString()
  sto_name: string;

  @ApiProperty({
    example: '서울특별시~',
    description: '영수증에서 발췌된 주소명',
  })
  @IsString()
  sto_address: string;
}
