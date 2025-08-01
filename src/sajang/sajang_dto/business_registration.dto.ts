// 사업자 등록증 데이터 DTO

import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class BusinessRegistrationDTO {
  @ApiProperty({
    example: '1234567890, - 이 기호 넣은채로 줘도됩니다이',
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
  p_nm: string; // 대표이름

  @ApiProperty({
    example: '1',
    description: '이전 페이지에서 회원가입 버튼 누르고 받은 sa_id',
  })
  @IsNumber()
  sa_id: number;

  // @ApiProperty({
  //   example: 'Bongchu Jjimdak <-봉추찜닭',
  //   description: '가게 이름 영문명',
  // })
  // @IsString()
  // sto_name_en?: string;

  //===== 여기까지 필수 데이터

  @ApiProperty({
    example: '2023-01-01',
    description:
      '외국인일 경우, 한글이름 (선택사항이지만 외국인 사장님이면 필수)',
  })
  @IsString()
  @IsOptional()
  p_nm2?: string; // 대표가 외국인이면 이것도 입력되어야 함

  @ApiProperty({
    example: '상호명, (주)테스트',
    description: '법인등록번호 (선택사항 이지만 회원가입시 입력받음)',
  })
  @IsString()
  @IsOptional()
  b_nm?: string; // 상호명

  @ApiProperty({})
  @IsString()
  b_sector?: string; // 주 업태명

  // 종목 -일반 음식점 ||  음식업 / 커피전문점
  // 카페 사업자 참고 - https://moneypin.biz/bizno/detail/6393100480/
  @IsOptional()
  @IsString()
  b_type?: string; // 주 종목

  @ApiProperty({ example: '', description: '사업장 주소 (선택사항)' })
  @IsString()
  b_adr?: string; // 사업장 주소

  // 전화번호
  @ApiProperty({ example: '010-1234-5678', description: '연락처' })
  @IsString()
  sto_phone?: String;

  // 표시해줄 가게명
  @ApiProperty({ example: 'BHC치킨', description: '가게 정보에 표기해줄 이름' })
  @IsString()
  sto_name?: string;

  @IsString()
  @ApiProperty({
    description: '사업자 등록증에 적혀있는 주소의 위도,string으로 보내주세요 ',
  })
  sto_latitude: string;

  @IsString()
  @ApiProperty({
    description: '사업자 등록증에 적혀있는 주소의 경도, string으로 보내주세요 ',
  })
  sto_longitude: string;
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
