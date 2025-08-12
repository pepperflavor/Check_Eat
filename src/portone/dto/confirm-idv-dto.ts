import { IsOptional, IsString } from 'class-validator';

export class ConfirmIdvDto {
  @IsString()
  id: string; // iv_id (identityVerificationId)

  @IsString()
  @IsOptional()
  otp?: string; // SMS일 때만
}
