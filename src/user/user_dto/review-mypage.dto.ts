import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class MyReviewsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}