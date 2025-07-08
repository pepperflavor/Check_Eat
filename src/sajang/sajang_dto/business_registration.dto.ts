// 사업자 등록증 데이터 DTO

import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class BusinessRegistrationDTO {
  @ApiProperty({
    example: '1234567890',
    description: '사업자 등록번호',
  })
  @IsString()
  business_registration_number: string;

  @ApiProperty({
    example: '서울특별시 강남구 테헤란로 123',
    description: '사업장 주소',
  })
  @IsString()
  business_address: string;

  @ApiProperty({
    example: '2023-01-01',
    description: '사업자 등록일',
  })
  @IsString()
  business_registration_date: string;
}
