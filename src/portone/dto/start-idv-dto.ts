import { IsOptional, IsString } from 'class-validator';

export class StartIdvDto {
  @IsString()
  phoneNumber: string; // "01012345678"

  @IsString()
  @IsOptional()
  operator?: 'SKT' | 'KT' | 'LGT' | 'MVNO';

  @IsString()
  @IsOptional()
  method?: 'SMS' | 'APP'; // 기본 SMS
}
