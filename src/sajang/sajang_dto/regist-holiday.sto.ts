import { IsNumber, IsOptional, IsString } from 'class-validator';

export class HolidayDto {
  @IsNumber()
  @IsOptional()
  holi_weekday?: number;

  @IsString()
  @IsOptional()
  holi_break?: string;

  @IsString()
  @IsOptional()
  holi_runtime_sun?: string;

  @IsString()
  @IsOptional()
  holi_runtime_mon?: string;

  @IsString()
  @IsOptional()
  holi_runtime_tue?: string;

  @IsString()
  @IsOptional()
  holi_runtime_wed?: string; // 수요일 영업시간

  @IsString()
  @IsOptional()
  holi_runtime_thu?: string; // 목요일 영업시간

  @IsString()
  @IsOptional()
  holi_runtime_fri?: string; // 금요일 영업시간

  @IsString()
  @IsOptional()
  holi_runtime_sat?: string; // 토요일 영업시간

  @IsString()
  @IsOptional()
  holi_regular?: string[]; // 정기 휴일

  @IsString()
  @IsOptional()
  holi_public?: string[]; // 한국 공휴일들 중에 쉬는날

  @IsNumber()
  sto_id: number;
}
