import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNumber, IsString } from 'class-validator';

export class RegistFoodDto {
  @IsNumber()
  fod_id: number;

  revi_img?: string;

  @ApiProperty({
    example: '짜장면 존맛탱',
    description: '음식에 대한 평가 텍스트',
  })
  @IsString()
  revi_content?: string;

  @ApiProperty({example: '', description: '추천 단계 - 0: 추천함, 1: 보통, 2: 추천안함-이때는 텍스트 필수 '})
  @IsNumber()
  revi_reco_step : number
}
