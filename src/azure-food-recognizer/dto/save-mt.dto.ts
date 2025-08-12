import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsNumber, IsString } from 'class-validator';

export class SaveMtDto {
  @IsNumber()
  foo_id!: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @ApiProperty({ description: '재료들을 입력한 배열' })
  ingredients!: string[]; // 프론트에서 확정/수정한 재료 배열
}
