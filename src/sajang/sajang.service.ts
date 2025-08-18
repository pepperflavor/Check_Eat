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
import { normalizeBusinessInput } from './util/normalizeBusiness';
import { SearchFoodByNameDto } from './sajang_dto/search-food-by-name.dto';
import { UpdateFoodDataDto } from './sajang_dto/update-food-data.dto';
import { AzureFoodRecognizerService } from 'src/azure-food-recognizer/azure-food-recognizer.service';
import { HolidayDto } from './sajang_dto/regist-holiday.sto';
import { FoodStorageService } from 'src/azure-storage/food-storage.service';
import { UpdateFoodImgDto } from './sajang_dto/update-foodimg.dto';

@Injectable()
export class SajangService {
  private readonly foodContainer: string;

  constructor(
    private readonly prisma: PrismaService,
    private transServcice: TranslateService,
    private readonly config: ConfigService,
    private readonly storeStorageService: StoreStorageService,
    private readonly translate: TranslateService,
    private readonly azureFoodRecognizerService: AzureFoodRecognizerService,
    private readonly foodStorageService: FoodStorageService,
    @InjectQueue('check-business') private readonly checkQueue: Queue,
  ) {
    this.foodContainer =
      this.config.get<string>('FOOD_CONTAINER_NAME') ?? 'foods';
  }

  private async assertOwner(saId: any) {
    const isExist = await this.prisma.sajang.findUnique({
      where: { sa_id: saId },
    });
    if (!isExist || !saId) {
      throw new ForbiddenException('업주 권한이 필요합니다.');
    }
    return { saId: Number(saId) };
  }

  /*
  sa_certification Int? // 0: 인증 대기 중 || 회원가입 진행중, 1: 사업자 인증 받음, 2: 인증 재시도 필요함
  sa_certi_status Int @default(0) // 0: 인증 대기중, 1: 인증 완료, 2: 인증 실패 - 유저가 데이터 잘못입력함, 3: 서버문제로 실패 -> 내부적으로 재 인증해줘야 함
  */
  // 사업자 등록진위여부, 재시도 포함
  async checkBusinessRegistration(data: BusinessRegistrationDTO) {
    // 재시도 jobId 등에 쓸 수 있도록 최소 전처리값을 try 바깥에서 준비
    const saID = Number(data.sa_id);
    const rawBsNo = String(data.b_no || '')
      .replace(/-/g, '')
      .trim();

    try {
      // 0) 국세청 API 진위 확인
      const result = await this.callAPI(data);

      // 정상 흐름에서 사용할 정규화(좌표/주소/이름 등)
      const { bsNo, bs_name, bs_type, bs_address, lat, lon } =
        normalizeBusinessInput(data);

      const created = await this.prisma.$transaction(async (tx) => {
        // 1) 사장 인증 상태 갱신
        await tx.sajang.update({
          where: { sa_id: saID },
          data: {
            sa_certi_status: 1,
            sa_certification: 1,
          },
        });

        // 2) 사업자번호 소유자 충돌 방지
        const existing = await tx.businessCerti.findUnique({
          where: { bs_no: bsNo },
          select: { bs_sa_id: true },
        });
        if (existing && existing.bs_sa_id !== saID) {
          throw new ConflictException(
            '이미 다른 사장에게 등록된 사업자번호입니다.',
          );
        }

        // 3) BusinessCerti upsert
        const cert = await tx.businessCerti.upsert({
          where: { bs_no: bsNo },
          update: {
            bs_name: bs_name || undefined,
            bs_type: bs_type || undefined,
            bs_address: bs_address || undefined,
            // 정책에 따라 bs_sa_id는 기존 주인이 있으면 변경하지 않는 것도 안전
            bs_sa_id: saID,
          },
          create: {
            bs_no: bsNo,
            bs_name: bs_name || '상호미기재',
            bs_type: bs_type || '업태미기재',
            bs_address: bs_address || '',
            bs_sa_id: saID,
          },
          select: { bs_id: true, bs_no: true },
        });

        // 4) Store upsert (복합 유니크로 멱등성 보장)
        const baseName = data.sto_name?.trim() || bs_name || '';
        const baseNameEn =
          data.sto_name_en?.trim() || data.sto_name || bs_name || '';

        const store = await tx.store.upsert({
          where: {
            uniq_store_owner_cert_name_geo: {
              sto_sa_id: saID,
              sto_bs_id: cert.bs_id,
              sto_name: baseName,
              sto_latitude: lat,
              sto_longitude: lon,
            },
          },
          update: {
            sto_phone: data.sto_phone ? String(data.sto_phone) : null,
          },
          create: {
            sto_name: baseName,
            sto_name_en: baseNameEn,
            sto_address: bs_address || '',
            sto_phone: data.sto_phone ? String(data.sto_phone) : null,
            sto_latitude: lat,
            sto_longitude: lon,
            sto_sa_id: saID,
            sto_bs_id: cert.bs_id,
          },
          select: { sto_id: true, sto_name: true, sto_bs_id: true },
        });

        return { cert, store };
      });

      return {
        message:
          '사업자 진위여부 확인 성공, BusinessCerti/Store 생성 또는 갱신',
        status: 'success',
        result,
        bs_no: created.cert.bs_no,
        sto_id: created.store.sto_id,
      };
    } catch (error) {
      console.log('IRS 서버 오류', (error as any)?.message);
      console.log('사업자 등록증 인증 시도를 등록합니다.');

      await this.prisma.sajang.update({
        where: { sa_id: saID },
        data: {
          sa_certification: 2, // 인증 재시도 필요
          sa_certi_status: 3, // 서버오류
        },
      });

      const axiosResp = (error as any)?.response;
      const axiosCode = (error as any)?.code;

      const isBadInput =
        error instanceof BadRequestException ||
        axiosResp?.status === 400 ||
        axiosResp?.status === 422;

      const isRetryable =
        axiosResp?.status >= 500 ||
        !axiosResp /* 네트워크 오류 */ ||
        ['ECONNABORTED', 'ENOTFOUND', 'ETIMEDOUT'].includes(String(axiosCode));

      if (isRetryable && !isBadInput) {
        await this.checkQueue.add(
          'retry-check',
          { data },
          {
            jobId: `check:${rawBsNo}`, // ← try 바깥에서 만든 rawBsNo 사용
            delay: 10_000,
            attempts: 5,
            backoff: { type: 'fixed', delay: 10_000 },
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
      }

      return {
        message: isBadInput ? '입력값 오류로 실패' : 'IRS 서버오류로 인한 실패',
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

    const requestUrl = `${IRS_URL}?serviceKey=${SERVICE_KEY}&returnType=JSON`;

    console.log('=== 국세청 API 요청 디버깅 ===');
    console.log('요청 URL:', requestUrl);
    console.log('요청 Payload:', JSON.stringify(payload, null, 2));
    console.log('IRS_URL:', IRS_URL);
    console.log('SERVICE_KEY 존재:', !!SERVICE_KEY);
    console.log('SERVICE_KEY 앞 10자:', SERVICE_KEY?.substring(0, 10));

    try {
      const { data: response } = await axios.post(requestUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 30000, // 30초 타임아웃
      });

      console.log('=== 국세청 API 응답 ===');
      console.log('전체 응답:', JSON.stringify(response, null, 2));
      console.log('응답 데이터:', response?.data);

      const result = response?.data?.[0];

      if (!result || result.valid !== '01') {
        console.log('=== 검증 실패 ===');
        console.log('result:', result);
        console.log('valid 값:', result?.valid);
        console.log('valid_msg:', result?.valid_msg);

        throw new BadRequestException(
          result?.valid_msg || '유효하지 않은 사업자 등록 정보입니다.',
        );
      }

      console.log('=== 검증 성공 ===');
      return {
        message: '진위여부 확인 완료',
        status: 'success',
      };
    } catch (axiosError: any) {
      console.log('=== axios 오류 상세 ===');
      console.log('오류 메시지:', axiosError.message);
      console.log('오류 코드:', axiosError.code);
      console.log('응답 상태:', axiosError.response?.status);
      console.log('응답 헤더:', axiosError.response?.headers);
      console.log('응답 데이터:', axiosError.response?.data);
      console.log('요청 설정:', axiosError.config?.url);

      throw axiosError;
    }
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

    const targetStore = await this.prisma.store.findUnique({
      where: { sto_id: Number(input.sto_id), sto_sa_id: saId },
      select: { sto_id: true },
    });
    if (!targetStore)
      throw new ForbiddenException('해당 사장님의 가게가 아닙니다.');

    // 실제 사장님이 등록하던 음식이 맞는지 검증
    const food = await this.prisma.food.findUnique({
      where: { foo_id: fooId },
      select: {
        foo_id: true,
        foo_sa_id: true,
        foo_name: true,
        foo_store_id: true,
      },
    });

    if (!food) throw new NotFoundException('해당 음식이 존재하지 않습니다.');
    if (food.foo_sa_id !== saId) {
      return {
        message: '본인 소유의 음식만 수정할 수 있습니다.',
        status: 'false',
      };
    }

    const updateData: any = {};
    // let nameChanged = false;
    // let finalName = food.foo_name ?? '';

    if (
      typeof input.foo_name === 'string' &&
      input.foo_name.trim().length > 0
    ) {
      updateData.foo_name = input.foo_name.trim();
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

    // 비건 단계 (필수값, 1-7 범위)
    const veganId = Number(input.foo_vegan);
    if (Number.isNaN(veganId) || veganId < 1 || veganId > 7) {
      throw new BadRequestException('비건 단계는 1~7 사이의 값이어야 합니다.');
    }
    
    // FK 존재 확인
    const vegan = await this.prisma.vegan.findUnique({
      where: { veg_id: veganId },
      select: { veg_id: true },
    });
    if (!vegan) {
      throw new BadRequestException('존재하지 않는 비건 단계입니다.');
    }
    // foo_vegan 필드 직접 업데이트가 안되므로 관계를 통해 업데이트
    updateData.foo_vegan_data = { connect: { veg_id: veganId } };

    const stoId = Number(input.sto_id);
    if (food.foo_store_id == null) {
      updateData.store = { connect: { sto_id: stoId } };
    } else if (food.foo_store_id !== input.sto_id) {
      throw new BadRequestException('이미 다른 매장에 연결된 메뉴입니다.'); // 정책에 따라 이동 허용으로 바꿀 수 있음
      // 이동 허용하려면:
      // data.store = { connect: { sto_id: stoId } };
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
          foo_store_id: true,
        },
      });

      if (updatedFood.foo_name && updatedFood.foo_name.trim().length > 0) {
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
            // create일때만 mt에 [] 넣음
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
      message: '업체 상태 변경 성공',
      status: 'success',
    };
  }

  //-------------  사장 마이페이지 관련

  // 마이페이지 입장
  async sajangEnterMypage(sa_id: number, email: string, sto_id?: number) {
    // 사장 존재 확인
    const sajang = await this.prisma.sajang.findUnique({
      where: { sa_id },
      select: {
        sa_id: true,
        sa_certification: true,
        sa_certi_status: true,
        Store: {
          select: { sto_id: true, sto_name: true, sto_img: true },
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
    let targetImg: string | null = null;

    if (sto_id !== undefined) {
      // sto_id 지정 → 해당 가게 이미지
      const target = sajang.Store.find((s) => s.sto_id === sto_id);
      targetImg = target?.sto_img ?? null;
    } else {
      // sto_id 미지정 → 첫 번째 가게 이미지 (없으면 null)
      targetImg =
        sajang.Store.length > 0 ? (sajang.Store[0].sto_img ?? null) : null;
    }

    return {
      status: 'success',
      sa_id: sajang.sa_id,
      sa_certification: sajang.sa_certification,
      sa_certi_status: sajang.sa_certi_status,
      email,
      sto_img: targetImg,
      stores: sajang.Store,
    };
  }

  // 가게 간판 이미지 수정 페이지 진입
  async getBoardImg(sa_id: number, sto_id?: number) {
    if (!sto_id) {
      const stores = await this.prisma.store.findMany({
        where: { sto_sa_id: sa_id },
        select: { sto_id: true, sto_img: true, sto_name: true },
        orderBy: { sto_id: 'asc' },
      });

      if (stores.length === 0) {
        throw new NotFoundException('해당 사장님 소유의 가게가 없습니다.');
      }
      if (stores.length > 1) {
        return {
          message: '여러 가게가 있어 선택이 필요합니다.',
          candidates: stores, // [{ sto_id, sto_img, sto_name }, ...]
        };
      }
      // 가게가 1개면 그 가게의 이미지 반환
      const only = stores[0];
      return { sto_id: only.sto_id, sto_img: only.sto_img ?? null };
    }
  }

  // 마이페이지에서 가게 간판 이미지 수정하기
  async updateStoreImg(
    sa_id: number,
    file: Express.Multer.File,
    sto_id?: number,
  ) {
    // 🔹 sto_id가 없으면 에러 반환
    if (typeof sto_id !== 'number') {
      return { message: '가게 ID(sto_id)가 필요합니다.', status: 'false' };
    }

    // 🔹 사장님의 가게인지 확인
    const targetStore = await this.prisma.store.findFirst({
      where: { sto_id, sto_sa_id: sa_id },
      select: { sto_id: true, sto_img: true },
    });

    if (!targetStore) {
      return { message: '사장님의 가게가 존재하지 않습니다.', status: 'false' };
    }

    const { sto_id: storeId, sto_img: existingImageUrl } = targetStore;

    // 🔹 기존 이미지 삭제
    if (existingImageUrl && existingImageUrl !== '0') {
      try {
        await this.storeStorageService.deleteStoreImage(existingImageUrl);
      } catch (err) {
        console.warn('기존 이미지 삭제 실패:', err.message);
      }
    }

    // 🔹 새 이미지 업로드
    const uploaded = await this.storeStorageService.uploadStoreImage(file);

    await this.prisma.store.update({
      where: { sto_id: storeId },
      data: { sto_img: uploaded.url },
    });

    return {
      message: '가게 대표 이미지가 성공적으로 업데이트되었습니다.',
      imageUrl: uploaded.url,
      status: 'success',
      sto_id: storeId,
    };
  }

  // 가게 정보 업데이트 페이지 진입
  async enterUpdateStoreData(
    sa_id: number,
    body: {
      sto_id?: number;
    },
  ) {
    await this.assertOwner(sa_id);

    // sto_id가 없으면 에러 반환
    if (!body.sto_id) {
      return {
        message: 'sto_id가 전달되어야 합니다',
        status: 'false',
      };
    }

    const targetStore = await this.prisma.store.findUnique({
      where: { sto_id: body.sto_id, sto_sa_id: sa_id },
      select: {
        sto_id: true,
        sto_name: true,
        sto_name_en: true,
        sto_address: true,
        sto_phone: true,
      },
    });

    if (!targetStore) {
      throw new NotFoundException(
        '해당 사장님의 가게가 아니거나 존재하지 않습니다.',
      );
    }

    return {
      status: 'success',
      store: {
        sto_id: targetStore.sto_id,
        sto_name: targetStore.sto_name,
        sto_name_en: targetStore.sto_name_en,
        sto_address: targetStore.sto_address,
        sto_phone: targetStore.sto_phone,
      },
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
      sto_address?: string;
      sto_latitude?: string;
      sto_longitude?: string;
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

    // 입력받은 값이 있는 필드만 업데이트 (null이나 빈 문자열로 덮어씌우지 않음)
    if (
      body.sto_name !== undefined &&
      body.sto_name !== null &&
      body.sto_name.trim() !== ''
    ) {
      data.sto_name = body.sto_name.trim();
    }
    if (body.sto_phone !== undefined && body.sto_phone !== null) {
      data.sto_phone =
        body.sto_phone.trim() === '' ? null : body.sto_phone.trim();
    }
    if (
      body.sto_name_en !== undefined &&
      body.sto_name_en !== null &&
      body.sto_name_en.trim() !== ''
    ) {
      data.sto_name_en = body.sto_name_en.trim();
    }
    if (
      body.sto_address !== undefined &&
      body.sto_address !== null &&
      body.sto_address.trim() !== ''
    ) {
      data.sto_address = body.sto_address.trim();
    }
    if (
      body.sto_latitude !== undefined &&
      body.sto_latitude !== null &&
      body.sto_latitude !== ''
    ) {
      const lat = parseFloat(body.sto_latitude);
      if (!isNaN(lat)) {
        data.sto_latitude = lat;
      }
    }
    if (
      body.sto_longitude !== undefined &&
      body.sto_longitude !== null &&
      body.sto_longitude !== ''
    ) {
      const lng = parseFloat(body.sto_longitude);
      if (!isNaN(lng)) {
        data.sto_longitude = lng;
      }
    }

    if (Object.keys(data).length === 0) {
      return {
        message: '업데이트할 유효한 필드가 없습니다.',
        status: 'false',
      };
    }

    const updated = await this.prisma.store.update({
      where: { sto_id: body.sto_id },
      data,
      select: {
        sto_id: true,
        sto_name: true,
        sto_phone: true,
        sto_name_en: true,
        sto_address: true,
        sto_latitude: true,
        sto_longitude: true,
      },
    });

    return {
      message: '매장 정보가 업데이트되었습니다.',
      status: 'success',
      store: updated,
    };
  }

  // 사장님 마이페이지 모달창
  async storeModal(sa_id: number) {
    return await this.prisma.store.findMany({
      where: {
        sto_sa_id: sa_id,
      },
      select: {
        sto_id: true,
        sto_name: true,
      },
    });
  }

  // 사업자 등록증 정보 업데이트
  async updateBusiness(sa_id: number, data: BusinessRegistrationDTO) {
    const saID = Number(sa_id);

    try {
      // 1) 사장 권한 확인
      await this.assertOwner(saID);

      // 2) 국세청 API 진위 확인
      const verificationResult = await this.callAPI(data);

      // 3) 정규화된 데이터 준비
      const { bsNo, bs_name, bs_type, bs_address, lat, lon } =
        normalizeBusinessInput(data);

      const updated = await this.prisma.$transaction(async (tx) => {
        // 4) 기존 사업자 등록증 정보 찾기
        const existingCert = await tx.businessCerti.findFirst({
          where: { bs_sa_id: saID },
          select: { bs_id: true, bs_no: true },
        });

        if (!existingCert) {
          throw new NotFoundException(
            '기존 사업자 등록증 정보를 찾을 수 없습니다.',
          );
        }

        // 5) 사업자번호가 변경되는 경우 중복 확인
        if (existingCert.bs_no !== bsNo) {
          const conflictCert = await tx.businessCerti.findUnique({
            where: { bs_no: bsNo },
            select: { bs_sa_id: true },
          });

          if (conflictCert && conflictCert.bs_sa_id !== saID) {
            throw new ConflictException(
              '이미 다른 사장에게 등록된 사업자번호입니다.',
            );
          }
        }

        // 6) BusinessCerti 업데이트
        const updatedCert = await tx.businessCerti.update({
          where: { bs_id: existingCert.bs_id },
          data: {
            bs_no: bsNo,
            bs_name: bs_name || undefined,
            bs_type: bs_type || undefined,
            bs_address: bs_address || undefined,
          },
          select: { bs_id: true, bs_no: true, bs_name: true },
        });

        // 7) 연결된 Store 정보도 업데이트
        if (data.sto_name || data.sto_phone) {
          const baseName = data.sto_name?.trim() || bs_name || '';
          const baseNameEn =
            data.sto_name_en?.trim() || data.sto_name || bs_name || '';

          await tx.store.updateMany({
            where: {
              sto_sa_id: saID,
              sto_bs_id: existingCert.bs_id,
            },
            data: {
              ...(baseName ? { sto_name: baseName } : {}),
              ...(baseNameEn ? { sto_name_en: baseNameEn } : {}),
              ...(bs_address ? { sto_address: bs_address } : {}),
              ...(data.sto_phone ? { sto_phone: String(data.sto_phone) } : {}),
              ...(lat !== undefined ? { sto_latitude: lat } : {}),
              ...(lon !== undefined ? { sto_longitude: lon } : {}),
            },
          });
        }

        return updatedCert;
      });

      return {
        message: '사업자 등록증 정보가 성공적으로 업데이트되었습니다.',
        status: 'success',
        result: verificationResult,
        updatedCert: updated,
      };
    } catch (error) {
      console.log('사업자 등록증 업데이트 오류:', (error as any)?.message);

      // 에러 타입에 따른 적절한 응답
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      return {
        message: '사업자 등록증 업데이트 중 오류가 발생했습니다.',
        status: 'false',
        error: (error as any)?.message,
      };
    }
  }

  //  사업자 등록증 업데이트 하기전 뿌려줄 데이터
  async enterUpdateBusiness(sa_id: number, sto_id?: number) {
    await this.assertOwner(sa_id);

    // 1) 사장 인증 상태 체크(둘 다 1이어야 조회 진행)
    const sajangStatus = await this.prisma.sajang.findUnique({
      where: { sa_id },
      select: { sa_certification: true, sa_certi_status: true },
    });
    if (!sajangStatus) {
      throw new ForbiddenException('업주 권한이 필요합니다.');
    }
    const { sa_certification, sa_certi_status } = sajangStatus;
    if (sa_certification !== 1 || sa_certi_status !== 1) {
      return {
        status: 'pending',
        message: '사업자 등록증 인증이 완료되지 않았습니다.',
        sa_certification,
        sa_certi_status,
      };
    }

    if (sto_id !== undefined) {
      // 단일 가게
      const store = await this.prisma.store.findFirst({
        where: { sto_id, sto_sa_id: sa_id },
        select: { sto_id: true, sto_name: true, sto_bs_id: true },
      });
      if (!store) {
        throw new NotFoundException(
          '해당 사장님의 가게가 아니거나 존재하지 않습니다.',
        );
      }

      if (!store.sto_bs_id) {
        return {
          status: 'success',
          message: '해당 가게는 아직 BusinessCerti와 연결되어 있지 않습니다.',
          store: { sto_id: store.sto_id, sto_name: store.sto_name },
          businessCerti: null,
        };
      }

      const cert = await this.prisma.businessCerti.findUnique({
        where: { bs_id: store.sto_bs_id },
        select: {
          bs_id: true,
          bs_no: true,
          bs_name: true,
          bs_type: true,
          bs_address: true,
          bs_sa_id: true,
          stores: {
            select: {
              sto_id: true,
              sto_name: true,
              sto_name_en: true,
              sto_address: true,
              sto_phone: true,
            },
            orderBy: { sto_id: 'asc' },
          },
        },
      });
      if (!cert || cert.bs_sa_id !== sa_id) {
        throw new ForbiddenException('이 사업자증 정보에 접근할 수 없습니다.');
      }

      return {
        status: 'success',
        store: { sto_id: store.sto_id, sto_name: store.sto_name },
        businessCerti: cert,
      };
    }

    // 목록 모드
    const certs = await this.prisma.businessCerti.findMany({
      where: { bs_sa_id: sa_id },
      select: {
        bs_id: true,
        bs_no: true,
        bs_name: true,
        bs_type: true,
        bs_address: true,
        stores: {
          select: {
            sto_id: true,
            sto_name: true,
            sto_name_en: true,
            sto_address: true,
            sto_phone: true,
          },
          orderBy: { sto_id: 'asc' },
        },
        _count: { select: { stores: true } },
      },
      orderBy: { bs_id: 'desc' },
    });

    return {
      status: 'success',
      count: certs.length,
      businessCertis: certs,
    };
  }

  // 음식 수정 페이지 진입시 뿌려줄 음식 데이터
  async getFoodListUpdatePage(sa_id: number, sto_id?: number) {
    // 0) 사장 존재/권한 검증
    await this.assertOwner(sa_id);

    // 1) 대상 매장 결정: sto_id가 없으면 사장의 첫 매장 사용
    const storeWhere =
      sto_id !== undefined
        ? { sto_id, sto_sa_id: sa_id }
        : { sto_sa_id: sa_id };

    const targetStore = await this.prisma.store.findFirst({
      where: storeWhere,
      ...(sto_id !== undefined ? {} : { orderBy: { sto_id: 'asc' } }),
      select: { sto_id: true, sto_name: true },
    });

    if (!targetStore) {
      throw new NotFoundException('해당 사장님의 매장을 찾을 수 없습니다.');
    }

    // 2) 해당 매장에 속한 음식들 조회 (삭제된 음식 제외: 0,1만 노출)
    const foods = await this.prisma.food.findMany({
      where: {
        foo_sa_id: sa_id,
        foo_status: { in: [0, 1] }, // 0: 정상, 1: 일시중지
        foo_store_id: targetStore.sto_id, // 매장 연결
      },
      orderBy: { foo_id: 'asc' },
      select: {
        foo_id: true,
        foo_name: true,
        foo_price: true,
        foo_img: true,
        foo_status: true,
        foo_vegan: true,
        foo_material: true,
        // 번역 필드
        food_translate_en: {
          select: { ft_en_name: true, ft_en_price: true, ft_en_mt: true },
        },
        food_translate_ar: {
          select: { ft_ar_name: true, ft_ar_price: true, ft_ar_mt: true },
        },
        // 알러지(공통) 선택 여부가 필요하면 주석 해제
        // CommonAl: { select: { coal_id: true, coal_name: true } },
      },
    });

    return {
      status: 'success',
      store: {
        sto_id: targetStore.sto_id,
        sto_name: targetStore.sto_name,
      },
      count: foods.length,
      foods,
    };
  }

  // 음식 수정 페이지
  // 음식 이름 검색
  async searchByFoodName(sa_id: number, data: SearchFoodByNameDto) {
    await this.assertOwner(sa_id);

    const stoId = data.sto_id;
    const keyword = data.foo_name.trim();
    const store = await this.prisma.store.findUnique({
      where: { sto_id: stoId },
      select: { sto_id: true, sto_sa_id: true },
    });

    // 소유 가게인지 확인
    if (!store) throw new BadRequestException('해당 매장을 찾을 수 없습니다.');
    if (store.sto_sa_id !== sa_id) {
      throw new ForbiddenException('해당 매장에 대한 권한이 없습니다.');
    }
    const foods = await this.prisma.food.findMany({
      where: {
        foo_sa_id: sa_id,
        foo_status: { in: [0, 1] },
        foo_name: { contains: keyword, mode: 'insensitive' },
        // Food–Store (1:N) 관계에서 해당 sto_id에 연결된 Food만
        foo_store_id: stoId,
      },
      select: {
        foo_id: true,
        foo_name: true,
        foo_material: true,
        foo_price: true,
        foo_img: true,
        foo_vegan: true,
      },
      orderBy: { foo_name: 'asc' },
    });

    return {
      status: 'success',
      count: foods.length,
      foods,
    };
  }

  // 음식 정보 수정
  async updateFoodData(sa_id: number, data: UpdateFoodDataDto) {
    await this.assertOwner(sa_id);

    const store = await this.prisma.store.findFirst({
      where: { sto_id: data.sto_id, sto_sa_id: sa_id },
      select: { sto_id: true },
    });

    if (!store) {
      throw new ForbiddenException('해당 가게에 대한 권한이 없습니다.');
    }

    const fooId = Number(data.foo_id);
    if (!fooId || Number.isNaN(fooId)) {
      throw new BadRequestException('유효하지 않은 foo_id 입니다.');
    }

    // 2) 해당 가게의 메뉴인지 확인 (가게-음식 M:N 연결 확인 + 소유자 일치 보조 확인)
    const food = await this.prisma.food.findUnique({
      where: { foo_id: fooId },
      select: { foo_id: true, foo_sa_id: true, foo_name: true },
    });
    if (!food) throw new NotFoundException('음식을 찾을 수 없습니다.');
    if (food.foo_sa_id !== sa_id) {
      throw new ForbiddenException('본인 소유의 음식만 수정할 수 있습니다.');
    }

    // 업데이트 데이터 구성하기
    const updateData: any = {};
    let nameChanged = false;
    let materialsChanged = false;

    if (typeof data.foo_name === 'string' && data.foo_name.trim().length > 0) {
      const newName = data.foo_name.trim();
      if (newName !== food.foo_name) {
        updateData.foo_name = newName;
        nameChanged = true;
      }
    }

    // 가격
    if (data.foo_price !== undefined) {
      const priceNum = Number(data.foo_price);
      if (Number.isNaN(priceNum) || priceNum < 0) {
        throw new BadRequestException('가격이 유효한 숫자가 아닙니다.');
      }
      updateData.foo_price = priceNum;
    }

    // 재료 (foo_material 또는 오타 foo_meterial 둘 다 지원)
    const incomingMaterials =
      (data as any).foo_material ?? (data as any).foo_meterial;
    if (incomingMaterials !== undefined) {
      if (!Array.isArray(incomingMaterials)) {
        throw new BadRequestException(
          'foo_material은 문자열 배열이어야 합니다.',
        );
      }
      const normalized = Array.from(
        new Set(
          incomingMaterials
            .map((s: string) => String(s).trim())
            .filter(Boolean),
        ),
      );
      updateData.foo_material = normalized;
      materialsChanged = true;
    }

    // 비건 단계 (1~6만 저장, 그 외/0/null/undefined => null 저장)
    if (data.foo_vegan !== undefined) {
      const v = Number(data.foo_vegan);
      if (!Number.isInteger(v) || v < 1 || v > 6) {
        updateData.foo_vegan = null;
      } else {
        // 존재하는 veg_id만 저장
        const exists = await this.prisma.vegan.findUnique({
          where: { veg_id: v },
          select: { veg_id: true },
        });
        updateData.foo_vegan = exists ? v : null;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return { message: '변경할 데이터가 없습니다.', status: 'skip' };
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedFood = await tx.food.update({
        where: { foo_id: fooId },
        data: updateData,
        select: {
          foo_id: true,
          foo_name: true,
          foo_price: true,
          foo_material: true,
          foo_img: true,
          foo_vegan: true,
        },
      });

      // 이름 변경 시: EN/AR 이름 번역 upsert
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
              ft_en_mt: [],
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
          console.error(
            '[manageFood] name translate failed',
            trErr?.response?.data || trErr?.message,
          );
        }
      }

      // 재료 변경 시: EN/AR 재료 번역 upsert
      if (materialsChanged && Array.isArray(updatedFood.foo_material)) {
        try {
          const translated = await this.translate.translateArray(
            updatedFood.foo_material,
            ['en', 'ar'] as any,
            'ko',
          );
          const enList =
            translated['en']?.map((s) => s.trim()).filter(Boolean) ?? [];
          const arList =
            translated['ar']?.map((s) => s.trim()).filter(Boolean) ?? [];

          await tx.foodTranslateEN.upsert({
            where: { food_id: fooId },
            update: { ft_en_mt: enList },
            create: {
              food_id: fooId,
              ft_en_name: null,
              ft_en_mt: enList,
              ft_en_price: null,
            },
          });

          await tx.foodTranslateAR.upsert({
            where: { food_id: fooId },
            update: { ft_ar_mt: arList },
            create: {
              food_id: fooId,
              ft_ar_name: null,
              ft_ar_mt: arList,
              ft_ar_price: null,
            },
          });
        } catch (trErr) {
          console.error(
            '[manageFood] materials translate failed',
            trErr?.response?.data || trErr?.message,
          );
        }
      }

      return updatedFood;
    });

    return {
      message: '음식 데이터가 업데이트되었습니다.',
      status: 'success',
      food: updated,
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

  // 휴일 데이터 등록
  async registHoliday(sa_id: number, data: HolidayDto) {
    await this.assertOwner(sa_id);

    const sto_id = Number(data?.sto_id);
    if (!sto_id || Number.isNaN(sto_id)) {
      throw new BadRequestException('유효한 sto_id가 필요합니다.');
    }

    // 본인 소유 매장인지 확인
    const store = await this.prisma.store.findUnique({
      where: { sto_id },
      select: { sto_id: true, sto_sa_id: true, sto_status: true },
    });
    if (!store) throw new NotFoundException('해당 매장을 찾을 수 없습니다.');
    if (store.sto_sa_id !== sa_id) {
      throw new ForbiddenException('해당 매장에 대한 권한이 없습니다.');
    }
    if (store.sto_status === 2) {
      throw new BadRequestException('영업 종료된 매장입니다.');
    }

    // 문자열로 들어와도 배열로 변환 처리
    const toNull = (v?: string) =>
      typeof v === 'string' && v.trim() !== '' ? v.trim() : null;

    const toStringOrEmpty = (v?: string) =>
      typeof v === 'string' ? v.trim() : '';

    const toArray = (v?: string[] | string) => {
      if (Array.isArray(v)) {
        return v.map((s) => String(s).trim()).filter(Boolean);
      }
      if (typeof v === 'string') {
        return v
          .split(/[,\n]/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return [];
    };

    // 기존 휴무일 존재여부
    const existing = await this.prisma.holiday.findUnique({
      where: { store_id: sto_id },
      select: { holi_id: true },
    });

    // 휴무일 없으면 생성
    if (!existing) {
      const createPayload = {
        holi_weekday:
          Number.isInteger(data?.holi_weekday) &&
          (data!.holi_weekday as number) >= 0
            ? (data!.holi_weekday as number)
            : 0,
        holi_break: toStringOrEmpty(data.holi_break),
        holi_runtime_sun: toNull(data.holi_runtime_sun),
        holi_runtime_mon: toNull(data.holi_runtime_mon),
        holi_runtime_tue: toNull(data.holi_runtime_tue),
        holi_runtime_wed: toNull(data.holi_runtime_wed),
        holi_runtime_thu: toNull(data.holi_runtime_thu),
        holi_runtime_fri: toNull(data.holi_runtime_fri),
        holi_runtime_sat: toNull(data.holi_runtime_sat),
        holi_regular: toArray(data.holi_regular as any),
        holi_public: toArray(data.holi_public as any),
        holi_sajang_id: sa_id,
        store_id: sto_id,
      };

      const saved = await this.prisma.holiday.create({
        data: createPayload,
        select: {
          holi_id: true,
          store_id: true,
          holi_weekday: true,
          holi_break: true,
          holi_runtime_sun: true,
          holi_runtime_mon: true,
          holi_runtime_tue: true,
          holi_runtime_wed: true,
          holi_runtime_thu: true,
          holi_runtime_fri: true,
          holi_runtime_sat: true,
          holi_regular: true,
          holi_public: true,
        },
      });

      return {
        message: '휴무/영업시간이 생성되었습니다.',
        status: 'success',
        holiday: saved,
      };
    }

    // 기존 데이터 있으면 업데이트
    const updateData: Record<string, any> = {};

    if (
      data.holi_weekday !== undefined &&
      Number.isInteger(data.holi_weekday)
    ) {
      updateData.holi_weekday = Number(data.holi_weekday);
    }

    if (data.holi_break !== undefined) {
      updateData.holi_break = toStringOrEmpty(data.holi_break);
    }

    if (data.holi_runtime_sun !== undefined)
      updateData.holi_runtime_sun = toNull(data.holi_runtime_sun);
    if (data.holi_runtime_mon !== undefined)
      updateData.holi_runtime_mon = toNull(data.holi_runtime_mon);
    if (data.holi_runtime_tue !== undefined)
      updateData.holi_runtime_tue = toNull(data.holi_runtime_tue);
    if (data.holi_runtime_wed !== undefined)
      updateData.holi_runtime_wed = toNull(data.holi_runtime_wed);
    if (data.holi_runtime_thu !== undefined)
      updateData.holi_runtime_thu = toNull(data.holi_runtime_thu);
    if (data.holi_runtime_fri !== undefined)
      updateData.holi_runtime_fri = toNull(data.holi_runtime_fri);
    if (data.holi_runtime_sat !== undefined)
      updateData.holi_runtime_sat = toNull(data.holi_runtime_sat);

    if (data.holi_regular !== undefined)
      updateData.holi_regular = toArray(data.holi_regular as any);
    if (data.holi_public !== undefined)
      updateData.holi_public = toArray(data.holi_public as any);

    if (Object.keys(updateData).length === 0) {
      return { message: '변경할 데이터가 없습니다.', status: 'skip' };
    }

    const saved = await this.prisma.holiday.update({
      where: { store_id: sto_id },
      data: updateData,
      select: {
        holi_id: true,
        store_id: true,
        holi_weekday: true,
        holi_break: true,
        holi_runtime_sun: true,
        holi_runtime_mon: true,
        holi_runtime_tue: true,
        holi_runtime_wed: true,
        holi_runtime_thu: true,
        holi_runtime_fri: true,
        holi_runtime_sat: true,
        holi_regular: true,
        holi_public: true,
      },
    });

    return {
      message: '휴무/영업시간이 업데이트되었습니다.',
      status: 'success',
      holiday: saved,
    };
  }

  // sajang.service.ts
  async updateFoodImg(
    sa_id: number,
    body: UpdateFoodImgDto,
    file: Express.Multer.File,
  ) {
    await this.assertOwner(sa_id);

    // 파일 검증
    if (!file)
      throw new BadRequestException('업로드할 이미지 파일이 필요합니다.');
    const MAX_MB = 5;
    if (file.size > MAX_MB * 1024 * 1024) {
      throw new BadRequestException(`이미지 용량은 최대 ${MAX_MB}MB입니다.`);
    }
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.mimetype)) {
      throw new BadRequestException('png/jpg/jpeg/webp 형식만 허용됩니다.');
    }

    const foo_id = Number(body.foo_id);
    if (!foo_id || Number.isNaN(foo_id)) {
      throw new BadRequestException('유효한 foo_id가 필요합니다.');
    }

    // 음식 소유 및 (선택) 매장 일치 검증
    const food = await this.prisma.food.findUnique({
      where: { foo_id },
      select: {
        foo_id: true,
        foo_sa_id: true,
        foo_img: true,
        foo_store_id: true,
      },
    });
    if (!food) throw new NotFoundException('해당 음식을 찾을 수 없습니다.');
    if (food.foo_sa_id !== sa_id) {
      throw new ForbiddenException('본인 소유의 음식만 수정할 수 있습니다.');
    }
    if (body.sto_id && food.foo_store_id !== body.sto_id) {
      throw new ForbiddenException('해당 매장의 메뉴가 아닙니다.');
    }

    // 기존 이미지 삭제(있으면)
    if (food.foo_img && food.foo_img !== '0') {
      try {
        await this.foodStorageService.delete(food.foo_img, this.foodContainer);
      } catch (err) {
        // 실패해도 계속 진행
        console.warn('[updateFoodImg] 기존 이미지 삭제 실패:', err?.message);
      }
    }

    // 새 이미지 업로드
    const uploaded = await this.foodStorageService.upload(
      file,
      this.foodContainer,
    );

    // DB 반영
    const updated = await this.prisma.food.update({
      where: { foo_id },
      data: { foo_img: uploaded.url },
      select: { foo_id: true, foo_img: true },
    });

    return {
      message: '음식 이미지가 성공적으로 업데이트되었습니다.',
      status: 'success',
      food: updated,
    };
  }

  //----------- 사장 홈 화면
  // sajang.service.ts
  //----------- 사장 홈 화면
  async sajangHome(ld_log_id: string, sto_id?: number) {
    const login = await this.prisma.loginData.findUnique({
      where: { ld_log_id },
      select: { sajang: { select: { sa_id: true } } },
    });
    const saId = login?.sajang?.sa_id;
    if (!saId)
      return { message: '가게정보를 찾을 수 없습니다.', status: 'false' };

    const where =
      typeof sto_id === 'number'
        ? { sto_id, sto_sa_id: saId }
        : { sto_sa_id: saId };

    const store = await this.prisma.store.findFirst({
      where,
      ...(typeof sto_id === 'number' ? {} : { orderBy: { sto_id: 'asc' } }),
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
            ReviewImage: { select: { revi_img_url: true } },
          },
        },
      },
    });

    if (!store)
      return { message: '가게정보를 찾을 수 없습니다.', status: 'false' };

    return {
      status: 'success',
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
