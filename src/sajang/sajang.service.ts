import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { TranslateService } from 'src/translate/translate.service';
import { CreateSajangDTO } from './sajang_dto/create-sajang.dto';

@Injectable()
export class SajangService {
  constructor(
    private readonly prisma: PrismaService,
    private transServcice: TranslateService,
  ) {}

  async checkBusinessRegistration() {
    throw new Error('Method not implemented.');
  }
  // 사장 회원가입
  async createSajang(data: CreateSajangDTO) {}

  // OCR 관련
  // 음식 사진 찍으면 재료명 추출해주기
  async recommendMeterials() {}

  // 사진에서 추출한 음식명에서 재료 추출 -> 대화형 ai로 꺼내옴
  async extractIngredients(foodName: string) {
    // 대화형 AI를 사용하여 재료 추출
    // 예시로 간단한 문자열 분리 사용
    const materials = foodName.split(',').map((item) => item.trim());
    return materials;
  }

  // 음식 등록 -> 등록하면 이때 번역도 해서 db에 저장
  async registFood() {}
}

/*
사업자 등록증 진위여부 확인시 필요 데이터
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
      "b_adr": ""               // 사업장주소 (선택)
    }
  ]
}

*/

/*
선택한 필드
  status : succeeded 라면
 "analyzeResult" :{
  documents: [ {
    "fields": {
      "b_no" : {
        "valueString" : 추출한 텍스트
      },
}
}

    ]
 }
*/
