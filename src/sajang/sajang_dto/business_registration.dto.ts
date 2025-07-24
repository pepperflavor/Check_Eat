// 사업자 등록증 데이터 DTO

import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class BusinessRegistrationDTO {
  @ApiProperty({
    example: '1234567890, -  -빼고 입력',
    description: '사업자 등록번호',
  })
  @IsString()
  b_no: string; // 사업자 등록번호

  @ApiProperty({
    example: 'YYYYMMDD, 형태로',
    description: '개업일',
  })
  @IsString()
  start_dt: string; // 개업일자

  @ApiProperty({ example: '홍길동', description: '대표자 성명' })
  @IsString()
  p_nm: string;

  @ApiProperty({
    example: '2023-01-01',
    description: '외국인일 경우, 한글이름 (선택사항)',
  })
  @IsString()
  p_nm2?: string;

  @ApiProperty({
    example: '1234567890123',
    description: '법인등록번호 (선택사항)',
  })
  @IsString()
  corp_no?: string;

  @ApiProperty({
    example: '상호명, (주)테스트',
    description: '법인등록번호 (선택사항 이지만 회원가입시 입력받음)',
  })
  @IsString()
  b_nm: string; // 상호명

  @IsString()
  b_sector: string; // 주 업태명

  // 종목 -일반 음식점 ||  음식업 / 커피전문점
  // 카페 사업자 참고 - https://moneypin.biz/bizno/detail/6393100480/
  b_type: string; // 주 업태명

  @ApiProperty({ example: '', description: '사업장 주소 (선택사항)' })
  @IsString()
  b_adr: string; // 사업장 주소
}

/*
{
  "businesses": [
    {
      "b_no": "1234567890",     // 사업자등록번호 (10자리, '-' 제거, 필수)
      "start_dt": "20200101",   // 개업일자 (YYYYMMDD, 필수)
      "p_nm": "홍길동",         // 대표자성명 (필수)
      "p_nm2": "",              // 외국인일 경우 한글명 (선택)
      "b_nm": "",               // 상호 (선택)
      "corp_no": "",            // 법인등록번호 (선택)
      "b_sector": "",           // 주업태명 (선택)
      "b_type": "",             // 주종목명 (선택)
      "b_adr": ""               // 사업장주소 (선택) // 응답값에는 없음
    }
  ]
}
*/
