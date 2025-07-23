import { ApiProperty } from '@nestjs/swagger';
import { IsDecimal, IsString } from 'class-validator';

export class UserLocationDto {
  //Latitude 위도, longitude 경도

  @ApiProperty({ example: '0.123235', description: '유저 현재 위치의 위도' })
  @IsString()
  user_la: string;

  @ApiProperty({ example: '0.123235', description: '유저 현재 위치의 경도' })
  @IsString()
  user_long: string;
}
