import { IsOptional, IsString } from 'class-validator';

export class ConfirmCachedDto {
  @IsString()
  cacheId!: string;

  @IsOptional()
  @IsString()
  foodName?: string; // 아니면 입력받은 음식이름 사용

  @IsOptional()
  @IsString()
  ok?: string; // 'ok'면 예측한 음식명 사용
}
