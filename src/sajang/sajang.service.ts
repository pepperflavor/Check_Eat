import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { TranslateService } from 'src/translate/translate.service';
import { CreateSajangDTO } from './sajang_dto/create-sajang.dto';
import { BusinessRegistrationDTO } from './sajang_dto/business_registration.dto';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class SajangService {
  constructor(
    private readonly prisma: PrismaService,
    private transServcice: TranslateService,
    private readonly config: ConfigService,
    @InjectQueue('check-business') private readonly checkQueue: Queue,
  ) {}

  // 사업자 등록진위여부, 재시도
  async checkBusinessRegistration(data: BusinessRegistrationDTO) {
    try {
      const result = await this.callAPI(data);

      return {
        message: '사업자 진위여부 확인 성공',
        status: 'success',
        result,
      };
    } catch (error) {
      console.log('IRS 서버 오류', error.message);

      // 10 초후 재시도
      await this.checkQueue.add(
        'retry-check',
        { data },
        {
          delay: 10_000, // 10초 후 재시도
          attempts: 5, // 최대 5번 시도
          backoff: {
            type: 'fixed',
            delay: 10_000, // 10초 간격으로 고정 재시도
          },
          removeOnComplete: true,
          removeOnFail: false, // 실패 로그 남기고 싶으면 false
        },
      );
      // sa_certifiaction 1 로

      return {
        message: 'IRS 서버오류로 인한 실패, 10초후 재시도',
        status: 'false',
      };
    }
  }

  // 사업자등록증 진위여부 API 호출부분
  private async callAPI(data: BusinessRegistrationDTO) {
    const IRS_URL = this.config.get<string>('IRS_URL'); // 국세청 앤드포인트
    const SERVICE_KEY = this.config.get<string>('IRS_SERVICE_KEY');

    const payload = {
      businesses: [
        {
          b_no: data.b_no.replace(/-/g, ''), // 하이픈 제거
          start_dt: data.start_dt.replace(/[^0-9]/g, ''), // YYYYMMDD
          p_nm: data.p_nm,
          // p_nm2: '',
          // b_nm: data.b_nm ?? '',
          // corp_no: data.corp_no?.replace(/-/g, '') ?? '',
          // b_sector: data.b_sector?.replace(/^업태\s*/, '') ?? '',
          // b_type: data.b_type?.replace(/^종목\s*/, '') ?? '',
          // b_adr: data.b_adr ?? '',
        },
      ],
    };

    console.log(
      '요청 URL:',
      `${IRS_URL}?serviceKey=${SERVICE_KEY}&returnType=JSON`,
    );
    console.log('요청 Payload:', JSON.stringify(payload, null, 2));

    const { data: response } = await axios.post(
      `${IRS_URL}?serviceKey=${SERVICE_KEY}&returnType=JSON`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
    );

    const result = response?.data?.[0];

    if (!result || result.valid !== '01') {
      throw new BadRequestException(
        result?.valid_msg || '유효하지 않은 사업자 등록 정보입니다.',
      );
    }

    return {
      message: '진위여부 확인 완료',
      status: 'success',
    };
  }

  // 사장 회원가입
  async createSajang(data: CreateSajangDTO) {}

  //===== OCR 관련
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

  // 가게 상태 변경
  async editStoreState(sa_id: number, updateState: number) {
    // 1. 사장 ID로 첫 번째 Store의 sto_id를 찾기
    // 일단 지금은 가게 하나만있다는 걸로 치자고
    const firstStore = await this.prisma.store.findFirst({
      where: { sto_sa_id: sa_id },
      orderBy: { sto_id: 'asc' },
      select: { sto_id: true },
    });

    if (!firstStore) {
      throw new Error('해당 사장님이 등록한 가게가 없습니다.');
    }

    // 2. 해당 Store의 sto_status 업데이트
    const updatedStore = await this.prisma.store.update({
      where: { sto_id: firstStore.sto_id },
      data: { sto_status: updateState },
    });

    return updatedStore;
  }
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
