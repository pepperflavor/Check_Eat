import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { TranslateService } from 'src/translate/translate.service';
import { CreateSajangDTO } from './sajang_dto/create-sajang.dto';
import { BusinessRegistrationDTO } from './sajang_dto/business_registration.dto';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as bcrypt from 'bcrypt';
import Decimal from 'decimal.js';
import { StoreStorageService } from 'src/azure-storage/store-storage.service';
import { RegistFoodInput } from './types/regist-food';

@Injectable()
export class SajangService {
  constructor(
    private readonly prisma: PrismaService,
    private transServcice: TranslateService,
    private readonly config: ConfigService,
    private readonly storeStorageService: StoreStorageService,
    private readonly translate: TranslateService,
    @InjectQueue('check-business') private readonly checkQueue: Queue,
  ) {}

  private async assertOwner(saId: any) {
    const isExist = await this.prisma.sajang.findUnique({
      where: { sa_id: saId },
    });
    if (!isExist || !saId) {
      throw new ForbiddenException('업주 권한이 필요합니다.');
    }
    return { saId: Number(saId) };
  }

  // 사업자 등록진위여부, 재시도 포함
  async checkBusinessRegistration(data: BusinessRegistrationDTO) {
    try {
      const result = await this.callAPI(data);
      const saID = Number(data.sa_id);
      /*
    sa_certification Int? // 0: 인증 대기 중 || 회원가입 진행중, 1: 사업자 인증 받음, 2: 인증 재시도 필요함
    sa_certi_status Int @default(0) // 0: 인증 대기중, 1: 인증 완료, 2: 인증 실패 - 유저가 데이터 잘못입력함, 3: 서버문제로 실패 -> 내부적으로 재 인증해줘야 함
      */

      // 사업자 등록증 확인했는지 여부
      if (!result || result == null) {
        await this.prisma.sajang.update({
          where: {
            sa_id: saID,
          },
          data: {
            sa_certi_status: 2,
            sa_certification: 2,
          },
        });
        return {
          message: '사업자 등록증 재인증 필요',
          status: 'false',
        };
      }

      await this.prisma.sajang.update({
        where: {
          sa_id: saID,
        },
        data: {
          sa_certi_status: 1,
          sa_certification: 1,
        },
      });

      // 여기에서 가게 데이터 생성
      const storeData = {
        sa_id: data.sa_id,
        sto_name:
          data.sto_name && data.sto_name.length > 0 ? data.sto_name : data.b_nm,
        sto_name_en: data.sto_name_en,
        sto_address: data.b_adr,
        sto_phone: data.sto_phone,
        sto_latitude: new Decimal(data.sto_latitude),
        sto_longitude: new Decimal(data.sto_longitude),
      };

      await this.prisma.store.create({
        data: {
          sto_name: storeData.sto_name ?? '',
          sto_name_en: storeData.sto_name_en ?? storeData.sto_name ?? '',
          sto_address: storeData.sto_address ?? '',
          sto_phone: storeData.sto_phone ? String(storeData.sto_phone) : null,
          sto_latitude: parseFloat(storeData.sto_latitude.toFixed(6)),
          sto_longitude: parseFloat(storeData.sto_longitude.toFixed(6)),
          sto_sa_id: storeData.sa_id,
        },
      });

      return {
        message: '사업자 진위여부 확인 성공, store 데이터 생성',
        status: 'success',
        result,
      };
    } catch (error) {
      console.log('IRS 서버 오류', error.message);
      console.log('사업자 등록증 인증 시도를 등록합니다.');
      const saID = data.sa_id;

      await this.prisma.sajang.update({
        where: {
          sa_id: saID,
        },
        data: {
          sa_certification: 2, // 인증 재시도 필요
          sa_certi_status: 3, // 서버오류
        },
      });

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

      return {
        message: 'IRS 서버오류로 인한 실패',
        status: 'false',
      };
    }
  }

  // 사업자 등록 내부실행 후 실패시 db 변경함수
  async finalFalure(sa_id: number) {
    await this.prisma.sajang.update({
      where: {
        sa_id: sa_id,
      },
      data: {
        sa_certi_status: 3,
        sa_certification: 2,
      },
    });
  }

  //  사업자 등록 내부실행 후 성공시 db 변경함수
  async finalSuccess(sa_id: number) {
    await this.prisma.sajang.update({
      where: {
        sa_id: sa_id,
      },
      data: {
        sa_certi_status: 1,
        sa_certification: 1,
      },
    });
  }

  // 사업자등록증 진위여부 API 호출부분
  private async callAPI(data: BusinessRegistrationDTO) {
    const IRS_URL = this.config.get<string>('IRS_URL'); // 국세청 앤드포인트
    const SERVICE_KEY = this.config.get<string>('IRS_SERVICE_KEY');

    // 필수 필드 : b_no, p_nm, start_dt
    const payload = {
      businesses: [
        {
          b_no: data.b_no.replace(/-/g, ''), // 하이픈 제거, 사업자 등록번호
          start_dt: data.start_dt.replace(/[^0-9]/g, ''), // 시작일
          p_nm: data.p_nm, // 대표명
          p_nm2: data?.p_nm2, // 외국인일경우 대표이름
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
  // sa_id 리턴해주기
  // 여기에서 가게도 일단 등록해주기
  async createSajang(data: CreateSajangDTO) {
    const SALT = Number(await this.config.get('BCRYPT_SALT_ROUNDS'));

    let { log_id, log_pwd, email } = data;
    const hashedPWD = await bcrypt.hash(log_pwd, SALT);

    // 가입한 이력이 있는지 확인
    const existing = await this.prisma.loginData.findFirst({
      where: {
        OR: [{ ld_log_id: log_id }, { ld_email: email }],
      },
    });

    if (existing) {
      throw new ConflictException(
        '이미 사용 중인 로그인 아이디 또는 이메일입니다.',
      );
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const sajang = await tx.sajang.create({
          data: {
            sa_phone: data.phone,
            sa_certi_status: 0,
            sa_certification: 0,
          },
        });

        await tx.loginData.create({
          data: {
            ld_log_id: log_id,
            ld_pwd: hashedPWD,
            ld_email: email,
            ld_usergrade: 1,
            ld_sajang_id: sajang.sa_id,
          },
        });

        return sajang.sa_id;
      });

      return {
        message: '사장님 가입 성공',
        status: 'success',
        sa_id: result,
      };
    } catch (error) {
      throw new InternalServerErrorException('사장 생성중 오류 발생', error);
    }
  }

  //===== 음식 등록 나머지 로직
  // 음식 나머지 데이터 저장
  async registFood(sa_id: number, input: RegistFoodInput) {
    const { saId } = await this.assertOwner(sa_id); // 사장님 맞는지 확인

    const fooId = Number(input.foo_id);
    if (!fooId || Number.isNaN(fooId)) {
      throw new BadRequestException('foo_id가 유효하지 않습니다.');
    }

    // 실제 사장님이 등록하던 음식이 맞는지 검증
    const food = await this.prisma.food.findUnique({
      where: { foo_id: fooId },
      select: { foo_id: true, foo_sa_id: true, foo_name: true },
    });

    if (!food) throw new NotFoundException('해당 음식이 존재하지 않습니다.');
    if (food.foo_sa_id !== saId) {
      return {
        message: '본인 소유의 음식만 수정할 수 있습니다.',
        status: 'false',
      };
    }

    const updateData: any = {};
    let nameChanged = false;
    if (
      typeof input.foo_name === 'string' &&
      input.foo_name.trim().length > 0
    ) {
      const newName = input.foo_name.trim();
      if (newName !== food.foo_name) {
        updateData.foo_name = newName;
        nameChanged = true;
      }
    }

    // 가격
    if (input.foo_price !== undefined) {
      const priceNum =
        typeof input.foo_price === 'string'
          ? Number(input.foo_price)
          : Number(input.foo_price);
      if (Number.isNaN(priceNum) || priceNum < 0) {
        throw new BadRequestException('가격이 유효한 숫자가 아닙니다.');
      }
      updateData.foo_price = priceNum;
    }

    // 비건 단계
    if (input.foo_vegan !== undefined) {
      if (input.foo_vegan === null) {
        updateData.foo_vegan = null;
      } else {
        const veganId = Number(input.foo_vegan);
        if (Number.isNaN(veganId)) {
          throw new BadRequestException('비건 단계가 유효하지 않습니다.');
        }
        // FK 존재 확인(옵션)
        const vegan = await this.prisma.vegan.findUnique({
          where: { veg_id: veganId },
          select: { veg_id: true },
        });
        if (!vegan) {
          throw new BadRequestException('존재하지 않는 비건 단계입니다.');
        }
        updateData.foo_vegan = veganId;
      }
    }

    // 업데이트할 필드가 하나도 없으면 패스
    if (Object.keys(updateData).length === 0) {
      return {
        message: '[sajang] 변경할 데이터가 없습니다.',
        status: 'skip',
      };
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedFood = await tx.food.update({
        where: { foo_id: fooId },
        data: updateData,
        select: {
          foo_id: true,
          foo_name: true,
          foo_price: true,
          foo_vegan: true,
          foo_img: true,
        },
      });

      if (nameChanged && updatedFood.foo_name) {
        try {
          const resp = await this.translate.translateMany(
            updatedFood.foo_name,
            ['en', 'ar'],
            'ko',
          );
          const translations: Array<{ text: string; to: string }> =
            resp?.[0]?.translations ?? [];

          const enName =
            translations.find((t) => t.to === 'en')?.text?.trim() || null;
          const arName =
            translations.find((t) => t.to === 'ar')?.text?.trim() || null;

          await tx.foodTranslateEN.upsert({
            where: { food_id: fooId },
            update: { ...(enName ? { ft_en_name: enName } : {}) },
            create: {
              food_id: fooId,
              ft_en_name: enName,
              ft_en_mt: [], // 배열 필드는 안전하게 기본값
              ft_en_price: null,
            },
          });

          await tx.foodTranslateAR.upsert({
            where: { food_id: fooId },
            update: { ...(arName ? { ft_ar_name: arName } : {}) },
            create: {
              food_id: fooId,
              ft_ar_name: arName,
              ft_ar_mt: [],
              ft_ar_price: null,
            },
          });
        } catch (trErr) {
          // 번역 실패해도 업데이트는 성공시키고 로그만 남김
          console.error(
            '[registFood] name translate failed',
            trErr?.response?.data || trErr?.message,
          );
        }
      }

      return updatedFood;
    });

    return {
      message: '[sajang] 음식 데이터 등록 완료',
      status: 'success',
      food: updated,
    };
  }

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

    return {
      message: '업체 삭제 성공',
      status: 'success',
    };
  }

  //-------------  사장 마이페이지 입장

  async sajangEnterMypage(sa_id: number) {
    // 사장 존재 확인
    const sajang = await this.prisma.sajang.findUnique({
      where: { sa_id },
      select: {
        sa_id: true,
        sa_certification: true,
        sa_certi_status: true,
        Store: {
          select: { sto_id: true },
          orderBy: { sto_id: 'asc' },
        },
      },
    });
  
    if (!sajang) {
      return {
        message: '사장님 정보를 찾을 수 없습니다.',
        status: 'false',
      };
    }
  
    const storeIds = (sajang.Store ?? []).map((s) => s.sto_id);
  
    return {
      status: 'success',
      sa_id: sajang.sa_id,
      sa_certification: sajang.sa_certification, // 0/1/2
      sa_certi_status: sajang.sa_certi_status,   // 0/1/2/3
      store_ids: storeIds,                       // 예: [12, 34, 56]
    };
  }

  // 마이페이지에서 가게 간판 이미지 수정하기
  async updateStoreImg(ld_log_id: string, file: Express.Multer.File) {
    // 로그인 정보 조회 → 사장 ID → 첫 번째 가게 찾기
    const loginData = await this.prisma.loginData.findUnique({
      where: { ld_log_id },
      select: {
        sajang: {
          select: {
            Store: {
              orderBy: { sto_id: 'asc' },
              take: 1,
              select: {
                sto_id: true,
                sto_img: true,
              },
            },
          },
        },
      },
    });

    const targetStore = loginData?.sajang?.Store?.[0];

    if (!targetStore) {
      return {
        message: '사장님의 가게가 존재하지 않습니다.',
        status: 'false',
      };
    }

    const storeId = targetStore.sto_id;
    const existingImageUrl = targetStore.sto_img;

    // ✅ 기존 이미지 삭제 (기본값 "0" 이 아닌 경우만)
    if (existingImageUrl && existingImageUrl !== '0') {
      try {
        await this.storeStorageService.deleteStoreImage(existingImageUrl);
      } catch (err) {
        console.warn('기존 이미지 삭제 실패:', err.message);
      }
    }

    // 새로운 이미지 업로드
    const uploaded = await this.storeStorageService.uploadStoreImage(file);

    // DB에 반영
    await this.prisma.store.update({
      where: { sto_id: storeId },
      data: { sto_img: uploaded.url },
    });

    return {
      message: '가게 대표 이미지가 성공적으로 업데이트되었습니다.',
      imageUrl: uploaded.url,
      status: 'success',
    };
  }

  // 가게 정보 업데이트
  async updateStoreData(
    sa_id: number,
    body: {
      sto_id: number;
      sto_name?: string;
      sto_phone?: string;
      sto_name_en?: string;
    },
  ) {
    await this.assertOwner(sa_id);

    // 매장이 해당 사장의 소유인지 확인
    const target = await this.prisma.store.findUnique({
      where: { sto_id: body.sto_id },
      select: { sto_id: true, sto_sa_id: true },
    });
    if (!target) throw new BadRequestException('해당 매장을 찾을 수 없습니다.');
    if (target.sto_sa_id !== sa_id)
      throw new ForbiddenException('권한이 없습니다.');

    const data: Record<string, any> = {};
    if (body.sto_name !== undefined) data.sto_name = body.sto_name;
    if (body.sto_phone !== undefined) data.sto_phone = body.sto_phone;
    if (body.sto_name_en !== undefined) data.sto_name_en = body.sto_name_en;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('업데이트할 필드가 없습니다.');
    }

    const updated = await this.prisma.store.update({
      where: { sto_id: body.sto_id },
      data,
      select: {
        sto_id: true,
        sto_name: true,
        sto_phone: true,
        sto_name_en: true,
      },
    });

    return {
      message: '매장 정보가 업데이트되었습니다.',
      status: 'success',
      store: updated,
    };
  }

  // 음식 삭제
  // 나중에 음식 사진 삭제도 추가할지 논의 필요
  async deleteOneFood(sa_id: number, foo_id: number) {
    await this.assertOwner(sa_id);

    const food = await this.prisma.food.findUnique({
      where: { foo_id },
      select: { foo_id: true, foo_sa_id: true, foo_status: true },
    });
    if (!food) throw new BadRequestException('음식을 찾을 수 없습니다.');
    if (food.foo_sa_id !== sa_id)
      throw new ForbiddenException('권한이 없습니다.');

    if (food.foo_status === 2) {
      return { message: '이미 삭제된 음식입니다.', status: 'success', foo_id };
    }

    await this.prisma.food.update({
      where: { foo_id },
      data: { foo_status: 2 },
    });

    return {
      message: '음식이 삭제(비활성)되었습니다.',
      status: 'success',
      foo_id,
    };
  }

  //----------- 사장 홈 화면
  // sajang.service.ts
  async sajangHome(ld_log_id: string) {
    // 로그인 정보 → 사장 ID 찾기
    const login = await this.prisma.loginData.findUnique({
      where: { ld_log_id },
      select: {
        sajang: {
          select: {
            sa_id: true,
            Store: {
              orderBy: { sto_id: 'asc' }, // 여러 가게 중 첫 번째
              take: 1,
              select: {
                sto_id: true,
                sto_name: true,
                sto_halal: true,
                review: {
                  orderBy: { revi_create: 'desc' },
                  select: {
                    revi_id: true,
                    revi_content: true,
                    revi_reco_step: true,
                    revi_create: true,
                    ReviewImage: {
                      select: { revi_img_url: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!login || !login.sajang?.Store?.length) {
      return {
        message: '가게정보를 찾을 수 없습니다.',
        status: 'false',
      };
    }

    const store = login.sajang.Store[0];

    return {
      sto_id: store.sto_id,
      sto_name: store.sto_name,
      sto_halal: store.sto_halal,
      reviews: store.review.map((r) => ({
        revi_id: r.revi_id,
        content: r.revi_content,
        reco_step: r.revi_reco_step,
        created_at: r.revi_create,
        images: r.ReviewImage.map((img) => img.revi_img_url),
      })),
    };
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
