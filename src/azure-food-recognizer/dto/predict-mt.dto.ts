import { IsString } from 'class-validator';

export class PredictMtDto {
  @IsString()
  foo_id!: string; // 방금 생성된 Food의 PK
}
