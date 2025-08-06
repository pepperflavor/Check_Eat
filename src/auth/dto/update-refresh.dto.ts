import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateRefreshDto {
  @ApiProperty({ example: 'eatVeg', description: '로그인할때 쓰는 아이디' })
  @IsString()
  log_Id: string;

  @ApiProperty({ description: '리프레시 토큰' })
  @IsString()
  refreshToken: string;
}
