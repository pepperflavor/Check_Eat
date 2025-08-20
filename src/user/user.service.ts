import {
  HttpStatus,
  Injectable,
  HttpException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { SignInDTO } from './user_dto/sign-in.dto';
import * as bcrypt from 'bcrypt';
import { CreateUserDTO } from './user_dto/create-user.dto';
import { ConfigService } from '@nestjs/config';
import { randomNickMaker } from './randomNick';
import Decimal from 'decimal.js';

import { SearchStoreByVeganDto } from './user_dto/search-store-by-vegan.dto';
import dayjs from 'dayjs';
import { AuthService } from 'src/auth/auth.service';
import { SearchStoreByNameDto } from './user_dto/search-store-by-name.dto';

import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Seoul');

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  async createUser(createDTO: CreateUserDTO) {
    const SALT = Number(await this.config.get('BCRYPT_SALT_ROUNDS'));

    let {
      log_Id,
      log_pwd,
      email,
      nickname,
      allergy,
      commonAllergies = [],
      vegan = 0,
      isHalal = 0,
      ld_lang,
    } = createDTO;

    const hashedPWD = await bcrypt.hash(log_pwd, SALT);

    // 여기서 닉네임 랜덤인거 수정해주기
    if (nickname == '' || nickname == undefined || !nickname) {
      nickname = randomNickMaker(ld_lang); // 닉네임도 랜덤으로 돌리기
    }

    if (!nickname || nickname == '') {
      throw new Error('닉네임 생성중 오류가 발생했습니다.');
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. User 생성
      const user = await tx.user.create({
        data: {
          user_nick: nickname,
          user_allergy: allergy,
          user_vegan: vegan != null && vegan > 0 ? vegan : null,
          user_is_halal: isHalal,
          user_allergy_common:
            commonAllergies.length > 0
              ? {
                  connect: commonAllergies.map((coalID) => ({
                    coal_id: coalID,
                  })),
                }
              : undefined,
        },
      });

      // 2. LoginData 생성 및 User와 연결
      await tx.loginData.create({
        data: {
          ld_log_id: log_Id,
          ld_pwd: hashedPWD,
          ld_email: email,
          ld_usergrade: 0, // 0: 일반 유저
          ld_user_id: user.user_id, // 생성된 User와 관계 연결
          ld_lang: ld_lang,
        },
      });
    });

    return {
      message: '개인 유저 회원가입 성공',
      status: HttpStatus.CREATED,
    };
  }

  // 로그인/ 회원가입때 존재하는 아이디 인지 확인
  async findById(loginDataDto: SignInDTO) {
    // const plainPWD = loginDataDto.ld_pwd;

    const user = await this.prisma.loginData.findUnique({
      where: {
        ld_log_id: loginDataDto.log_id,
      },
    });

    if (!user) {
      throw new HttpException(
        '사용자 아이디가 존재하지 않습니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    return user;
  }

  //==================================  메인 기능 시작
  //============== 지도관련 기능 시작

  // 공용 함수 - 조회하는 요일에 일치하는 영업시간, 휴무일 리턴
  private async mergeStoresWithHoliday(stores: any[]): Promise<any[]> {
    const today = dayjs().tz().day();

    const runtimeKeyMap = {
      0: 'holi_runtime_sun',
      1: 'holi_runtime_mon',
      2: 'holi_runtime_tue',
      3: 'holi_runtime_wed',
      4: 'holi_runtime_thu',
      5: 'holi_runtime_fri',
      6: 'holi_runtime_sat',
    } as const;
    const runtimeKey = runtimeKeyMap[today];

    if (!stores || stores.length === 0) return [];

    const storeIds = stores.map((s) => s.sto_id);

    // ✅ 스키마 변경 반영: store_id 로 바로 찾기
    const holidays = await this.prisma.holiday.findMany({
      where: { store_id: { in: storeIds } },
      select: {
        store_id: true,
        holi_break: true,
        holi_regular: true,
        holi_public: true,
        holi_runtime_sun: true,
        holi_runtime_mon: true,
        holi_runtime_tue: true,
        holi_runtime_wed: true,
        holi_runtime_thu: true,
        holi_runtime_fri: true,
        holi_runtime_sat: true,
      },
    });

    const holidayMap = new Map<number, (typeof holidays)[number]>(
      holidays.filter((h) => h.store_id !== null).map((h) => [h.store_id!, h]),
    );

    return stores.map((store) => {
      const holiday = holidayMap.get(store.sto_id);

      return {
        ...store,
        holi_weekday: dayjs().tz('Asia/Seoul').day(),
        today_runtime: holiday ? ((holiday as any)[runtimeKey] ?? null) : null,
        holi_break: holiday?.holi_break ?? null,
        holi_regular: holiday?.holi_regular ?? null,
        holi_public: holiday?.holi_public ?? null,
      };
    });
  }

  // 유저 메인화면
  // // 첫 로딩시 자기 위치 기준 반경 2km 가게
  async mainPageStoresData(user_la: string, user_long: string, radius = 2000) {
    const LA = new Decimal(user_la);
    const LONG = new Decimal(user_long);

    const stores = await this.prisma.$queryRawUnsafe<any[]>(
      `
      SELECT
        sto_id, sto_name, sto_name_en, sto_latitude, sto_longitude,
        sto_type, sto_address, sto_halal, sto_status, sto_img,
        ST_Distance(
          geography(ST_MakePoint(sto_longitude, sto_latitude)),
          geography(ST_MakePoint($1, $2))
        ) AS distance
      FROM "Store"
      WHERE ST_DWithin(
        geography(ST_MakePoint(sto_longitude, sto_latitude)),
        geography(ST_MakePoint($1, $2)),
        $3
      )
      AND sto_status != 2
      ORDER BY distance ASC;
      `,
      LONG,
      LA,
      radius,
    );

    if (!stores || stores.length === 0) {
      return {
        message: `반경 ${radius}m 내의 위치한 가게가 없습니다`,
        status: 'success',
      };
    }

    return await this.mergeStoresWithHoliday(stores);
  }

  // 이름으로 가게 검색
  async getStoreByName(lang: string, data: SearchStoreByNameDto) {
    const { sto_name, user_la, user_long, radius } = data;
    const LA = new Decimal(user_la);
    const LONG = new Decimal(user_long);
    const Parseradius = Number(radius);

    // 입력값 정제: 앞뒤 공백 제거 및 안전성 확보
    const searchTerm = sto_name?.trim() || '';
    if (!searchTerm) {
      return {
        message: '검색어를 입력해주세요.',
        status: 'false',
      };
    }

    // 1차: sto_name(한국어 이름)에서 검색 (ILIKE로 대소문자 구분 없이)
    let stores = await this.prisma.$queryRawUnsafe<any[]>(
      `
      SELECT
        sto_id, sto_name, sto_name_en, sto_latitude, sto_longitude,
        sto_type, sto_address, sto_halal, sto_status, sto_img,
        ST_Distance(
          location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) AS distance
      FROM "Store"
      WHERE sto_status != 2
        AND ST_DWithin(
          location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $4
        )
        AND sto_name ILIKE '%' || $3 || '%'
      ORDER BY distance ASC
      LIMIT 50;
      `,
      LONG,
      LA,
      searchTerm,
      Parseradius,
    );

    // 2차: 1차에서 결과가 없으면 sto_name_en(영어 이름)에서 검색 (ILIKE로 대소문자 구분 없이)
    if (!stores || stores.length === 0) {
      stores = await this.prisma.$queryRawUnsafe<any[]>(
        `
        SELECT
          sto_id, sto_name, sto_name_en, sto_latitude, sto_longitude,
          sto_type, sto_address, sto_halal, sto_status, sto_img,
          ST_Distance(
            location,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          ) AS distance
        FROM "Store"
        WHERE sto_status != 2
          AND ST_DWithin(
            location,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            $4
          )
          AND sto_name_en ILIKE '%' || $3 || '%'
        ORDER BY distance ASC
        LIMIT 50;
        `,
        LONG,
        LA,
        searchTerm,
        Parseradius,
      );
    }

    if (!stores || stores.length === 0) {
      return {
        message: '해당 검색어에 대한 데이터가 없습니다.',
        status: 'false',
      };
    }

    return await this.mergeStoresWithHoliday(stores);
  }

  // 비건 단계별 검색
  async getStoreByVegan(data: SearchStoreByVeganDto) {
    const { vegan_level, user_la, user_long, radius } = data;
    const parseVegan = Number(vegan_level);
    const LA = new Decimal(user_la);
    const LONG = new Decimal(user_long);
    const Parseradius = Number(radius);

    const stores = await this.prisma.$queryRawUnsafe<any[]>(
      `
      SELECT
        s.sto_id, s.sto_name, s.sto_name_en, s.sto_latitude, s.sto_longitude,
        s.sto_type, s.sto_img, s.sto_address, s.sto_halal, s.sto_status,
        ST_Distance(
          s.location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) AS distance
      FROM "Store" s
      WHERE s.sto_status != 2
        AND ST_DWithin(
          s.location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
        AND EXISTS (
          SELECT 1
          FROM "Food" f
          WHERE f.foo_sa_id = s.sto_sa_id
            AND f.foo_vegan = $4
        )
      ORDER BY distance ASC
      LIMIT 50;
      `,
      LONG,       
      LA,          
      Parseradius, 
      parseVegan,  
    );

    if (!stores || stores.length === 0) {
      return { message: '조건에 맞는 가게가 없습니다', status: 'success' };
    }

    return await this.mergeStoresWithHoliday(stores);
  }

  //========== 가게 상세 페이지

  // 빈문자열, 공백제거
  private nonEmpty(s?: string | null): string | undefined {
    if (typeof s !== 'string') return undefined;
    const t = s.trim();
    return t.length > 0 ? t : undefined;
  }

  async detailStoreData(
    sto_id: number,
    lang: string,
    userData: {
      user_allergy?: string | null;
      user_allergy_common?: number[]; // CommonAl ID 목록
    },
  ) {
    const store = await this.prisma.store.findFirst({
      where: {
        sto_id,
        sto_status: { in: [0, 1] },
      },
      select: {
        sto_id: true,
        sto_name: true,
        sto_name_en: true,
        sto_img: true,
        sto_address: true,
        sto_type: true,
        sto_halal: true,
        sto_latitude: true,
        sto_longitude: true,
        sto_phone: true,
        holiday: {
          select: {
            holi_id: true,
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
        },
        Food: {
          where: {
            foo_status: { not: 2 },
          },
          select: {
            foo_id: true,
            foo_img: true,
            foo_vegan: true,
            foo_status: true,
            foo_material: true,
            foo_price: true, // ✅ 항상 Food 테이블의 foo_price 선택
            CommonAl: {
              select: { coal_id: true },
            },
            ...(lang === 'ko' && {
              foo_name: true,
            }),
            ...(lang === 'en' && {
              food_translate_en: {
                select: {
                  ft_en_name: true,
                  ft_en_mt: true,
                },
              },
            }),
            ...(lang === 'ar' && {
              foo_name: true, // 최종 fallback
              food_translate_ar: {
                select: {
                  ft_ar_name: true,
                  ft_ar_mt: true,
                },
              },
              food_translate_en: {
                select: {
                  ft_en_name: true,
                },
              },
            }),
          },
        },
      },
    });

    if (!store) return null;

    const transformedFoods = store.Food.map((food) => {
      // 언어별 필드 분기
      let foo_name: string | undefined;
      let foo_material: string[] | undefined;
      let foo_price: string | undefined;

      // ✅ 가격은 항상 Food 테이블의 foo_price 사용
      foo_price = (food as any).foo_price?.toString();

      if (lang === 'ko') {
        foo_name = (food as any).foo_name;
        foo_material = (food as any).foo_material;
      } else if (lang === 'en') {
        foo_name = food.food_translate_en?.ft_en_name ?? undefined;
        foo_material = food.food_translate_en?.ft_en_mt ?? undefined;
      } else if (lang === 'ar') {
        const arName = this.nonEmpty(food.food_translate_ar?.ft_ar_name);
        const enName = this.nonEmpty(
          (food as any).food_translate_en?.ft_en_name,
        );
        const koName = this.nonEmpty((food as any).foo_name);
        // ✅ 아랍어 → 영어 → 한글 순으로 fallback
        foo_name = arName ?? enName ?? koName;

        foo_material = food.food_translate_ar?.ft_ar_mt ?? undefined;
      }

      // 알러지 필터링, 언어별로 필터링 분기 추가
      let foo_warning: string | undefined = undefined;
      let foo_warning_coal: number[] = [];

      if (lang === 'ko') {
        if (
          userData.user_allergy &&
          Array.isArray(foo_material) &&
          foo_material.includes(userData.user_allergy)
        ) {
          foo_warning = userData.user_allergy;
        }
      } else if (lang === 'en') {
        const mt = food.food_translate_en?.ft_en_mt;
        if (
          (userData as any).user_allergy_en &&
          Array.isArray(mt) &&
          mt.includes((userData as any).user_allergy_en)
        ) {
          foo_warning = (userData as any).user_allergy_en;
        }
      } else if (lang === 'ar') {
        const mt = food.food_translate_ar?.ft_ar_mt;
        if (
          (userData as any).user_allergy_ar &&
          Array.isArray(mt) &&
          mt.includes((userData as any).user_allergy_ar)
        ) {
          foo_warning = (userData as any).user_allergy_ar;
        }
      }

      // 공통 알러지 필터
      const coalIds = food.CommonAl?.map((coal) => coal.coal_id) || [];
      foo_warning_coal = coalIds.filter((id) =>
        userData.user_allergy_common?.includes(id),
      );

      return {
        foo_id: food.foo_id,
        foo_name,
        foo_material,
        foo_price,
        foo_img: food.foo_img,
        foo_vegan: food.foo_vegan,
        foo_status: food.foo_status,
        CommonAl: food.CommonAl,
        ...(foo_warning && { foo_warning }),
        ...(foo_warning_coal.length > 0 && { foo_warning_coal }),
      };
    });

    // 오늘 날짜 계산
    const today = dayjs().tz().day();
    const runtimeKeyMap = {
      0: 'holi_runtime_sun',
      1: 'holi_runtime_mon',
      2: 'holi_runtime_tue',
      3: 'holi_runtime_wed',
      4: 'holi_runtime_thu',
      5: 'holi_runtime_fri',
      6: 'holi_runtime_sat',
    } as const;
    const todayKey = runtimeKeyMap[today];
    const h = store.holiday; // Holiday | null

    const todayRuntime = h ? ((h as any)[todayKey] ?? null) : null;

    return {
      sto_id: store.sto_id,
      sto_name: store.sto_name,
      sto_name_en: store.sto_name_en,
      sto_img: store.sto_img,
      sto_address: store.sto_address,
      sto_type: store.sto_type,
      sto_halal: store.sto_halal,
      sto_latitude: store.sto_latitude,
      sto_longitude: store.sto_longitude,
      sto_phone: store.sto_phone,
      food_list: transformedFoods,
      holiday: h
        ? {
            holi_weekday: dayjs().tz('Asia/Seoul').day(), // 오늘 요일(0~6)
            today: todayRuntime, // 예: "11:30~21:00"
            holi_break: h.holi_break,
            holi_regular: h.holi_regular,
            holi_public: h.holi_public,
            holi_runtime_sun: h.holi_runtime_sun,
            holi_runtime_mon: h.holi_runtime_mon,
            holi_runtime_tue: h.holi_runtime_tue,
            holi_runtime_wed: h.holi_runtime_wed,
            holi_runtime_thu: h.holi_runtime_thu,
            holi_runtime_fri: h.holi_runtime_fri,
            holi_runtime_sat: h.holi_runtime_sat,
          }
        : null,
    };
  }

  //========================= 유저 마이페이지 관련 시작

  // 유저 마이페이지에서 자기 정보 업데이트시 db에 정보 저장, 토큰도 새로 발급해줘야함

  // 알러지 수정
  async updateUserAllergy(
    ld_log_id: string,
    lang: string,
    coal?: number[] | null,
    personalAl?: string | null,
  ) {
    const user = await this.prisma.loginData.findUnique({
      where: { ld_log_id },
      select: { ld_user_id: true },
    });

    if (!user?.ld_user_id) {
      return {
        message: '[Usermypage] 해당 유저를 찾을 수 없습니다.',
        status: 'false',
      };
    }

    if (Array.isArray(coal)) {
      coal = coal.map((id) => Number(id));
    }

    const data: any = {};

    // 🟡 개별 알러지(문자열) 처리
    if (lang === 'en') {
      if (personalAl === null) {
        data.user_allergy_en = null;
      } else if (personalAl !== undefined) {
        data.user_allergy_en = personalAl;
      }
    } else if (lang === 'ar') {
      if (personalAl === null) {
        data.user_allergy_ar = null;
      } else if (personalAl !== undefined) {
        data.user_allergy_ar = personalAl;
      }
    } else if (lang === 'ko') {
      if (personalAl === null) {
        data.user_allergy = null;
      } else if (personalAl !== undefined) {
        data.user_allergy = personalAl;
      }
    }

    // 🟢 보편 알러지(숫자 배열) 처리
    if (coal === null) {
      // 모든 알러지 제거
      data.user_allergy_common = {
        set: [],
      };
    } else if (coal !== undefined) {
      // 전달된 값으로 교체
      data.user_allergy_common = {
        set: coal.map((coalID) => ({ coal_id: coalID })),
      };
    }

    const updatedUser = await this.prisma.user.update({
      where: { user_id: user.ld_user_id },
      data,
    });

    // 토큰 재발급
    const loginData = await this.prisma.loginData.findUnique({
      where: {
        ld_log_id,
      },
    });

    if (!loginData || loginData == null) {
      return {
        message: '[UserMypage] 데이터 업데이트 후 조회 실패',
        status: 'false',
      };
    }

    const tokenPayload = await this.authService.generateToken(
      loginData.ld_log_id,
      loginData.ld_usergrade,
      loginData.ld_email,
      loginData.ld_lang,
    );

    const accessToken = await this.authService.getAccessToken(tokenPayload);

    return {
      message: '[Usermypage] 알러지 정보가 업데이트되었습니다.',
      status: 'true',
      result: updatedUser,
      accessToken: accessToken,
    };
  }

  // 언어 변경
  async updateUserLang(ld_log_id: string, newLang: string) {
    const result = await this.prisma.loginData.update({
      where: {
        ld_log_id: ld_log_id,
      },
      data: {
        ld_lang: newLang,
      },
    });

    if (!result || result == null) {
      return {
        message: '[Usermypage] 해당 유저를 찾을 수 없습니다.',
        status: 'false',
      };
    }

    const tokenPayload = await this.authService.generateToken(
      result.ld_log_id,
      result.ld_usergrade,
      result.ld_email,
      result.ld_lang,
    );

    const accessToken = await this.authService.getAccessToken(tokenPayload);

    return {
      message: '[Usermypage] 사용하는 언어 업데이트 완료',
      status: 'success',
      accessToken: accessToken,
    };
  }

  // 닉네임 변경
  async updateNick(ld_id: string, newNick: string) {
    // ld_id : lodindata 테이블의 아이디
    const userID = await this.prisma.loginData.findUnique({
      where: {
        ld_log_id: ld_id,
      },
    });

    if (
      !userID?.ld_user_id ||
      userID.ld_user_id == null ||
      userID.ld_user_id == undefined
    ) {
      throw new Error('[updateNick] 해당하는 유저를 찾을 수 없습니다.');
    }

    const result = await this.prisma.user.update({
      where: {
        user_id: userID.ld_user_id,
      },
      data: {
        user_nick: newNick,
      },
    });

    if (!result) {
      throw new Error('[updateNick] 닉네임 변경 중 오류가 발생했습니다.');
    }

    const tokenPayload = await this.authService.generateToken(
      userID.ld_log_id,
      userID.ld_usergrade,
      userID.ld_email,
      userID.ld_lang,
    );

    const accessToken = await this.authService.getAccessToken(tokenPayload);

    return {
      message: '닉네임 변경 성공',
      status: 'success',
      accessToken: accessToken,
    };
  }

  // 내가 쓴 리뷰들 목록
  async myAllReviews(log_id: string, lang: string, page = 1, limit = 10) {
    // 1. 로그인 데이터 → 유저 ID 찾기
    const loginData = await this.prisma.loginData.findUnique({
      where: { ld_log_id: log_id },
      select: { ld_user_id: true },
    });

    if (!loginData?.ld_user_id) {
      throw new HttpException('유저를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }

    const skip = (page - 1) * limit;

    // 2. 총 리뷰 개수
    const totalCount = await this.prisma.review.count({
      where: { user_id: loginData.ld_user_id, revi_status: 0 },
    });

    // 3. 리뷰 목록 (페이징 적용)
    const reviews = await this.prisma.review.findMany({
      where: { user_id: loginData.ld_user_id, revi_status: 0 },
      orderBy: { revi_create: 'desc' },
      skip,
      take: limit,
      include: {
        store: {
          select: {
            sto_id: true,
            sto_name: true,
            sto_name_en: true,
            sto_img: true,
          },
        },
        foods: {
          select: {
            foo_id: true,
            foo_img: true,
            ...(lang === 'ko' && { foo_name: true }),
            ...(lang === 'en' && {
              food_translate_en: { select: { ft_en_name: true } },
            }),
            ...(lang === 'ar' && {
              foo_name: true,
              food_translate_ar: { select: { ft_ar_name: true } },
              food_translate_en: { select: { ft_en_name: true } },
            }),
          },
        },
        ReviewImage: { select: { revi_img_url: true } },
        ...(lang === 'en' && {
          review_translate_en: { select: { rt_content_en: true } },
        }),
        ...(lang === 'ar' && {
          review_translate_ar: { select: { rt_ar_content: true } },
        }),
      },
    });

    // 4. 언어별 변환
    const transformed = reviews.map((review) => {
      let revi_content = review.revi_content;
      if (lang === 'en') {
        revi_content = review.review_translate_en?.rt_content_en || '';
      } else if (lang === 'ar') {
        revi_content = review.review_translate_ar?.rt_ar_content || '';
      }

      const food_list = review.foods.map((f) => {
        let foo_name = f.foo_name;
        if (lang === 'en') {
          foo_name = f.food_translate_en?.ft_en_name || '';
        } else if (lang === 'ar') {
          const arName = this.nonEmpty(f.food_translate_ar?.ft_ar_name);
          const enName = this.nonEmpty(f.food_translate_en?.ft_en_name);
          const koName = this.nonEmpty(f.foo_name);
          // ✅ 아랍어 → 영어 → 한글
          foo_name = arName ?? enName ?? koName ?? '';
        }

        return {
          foo_id: f.foo_id,
          foo_img: f.foo_img,
          foo_name,
        };
      });

      return {
        revi_id: review.revi_id,
        revi_reco_step: review.revi_reco_step,
        revi_reco_vegan: review.revi_reco_vegan,
        revi_content,
        revi_create: review.revi_create,
        store: {
          sto_id: review.store.sto_id,
          sto_name:
            lang === 'en' ? review.store.sto_name_en : review.store.sto_name,
          sto_img: review.store.sto_img,
        },
        food_list,
        images: review.ReviewImage.map((img) => img.revi_img_url),
      };
    });

    return {
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      reviews: transformed,
    };
  }

  async myYetReviews(log_id: string, page = 1, limit = 10) {
    const loginData = await this.prisma.loginData.findUnique({
      where: { ld_log_id: log_id },
      select: { ld_user_id: true },
    });

    if (!loginData?.ld_user_id) {
      throw new HttpException('유저를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }

    const skip = (page - 1) * limit;

    // 2. 총 개수 구하기
    const totalCount = await this.prisma.review.count({
      where: {
        user_id: loginData.ld_user_id,
        revi_status: 1,
      },
    });

    // 3. 데이터 가져오기 (페이징 적용)
    const pending = await this.prisma.review.findMany({
      where: {
        user_id: loginData.ld_user_id,
        revi_status: 1,
      },
      skip,
      take: limit,
      orderBy: { revi_create: 'desc' },
      select: {
        revi_id: true,
        store: {
          select: {
            sto_id: true,
            sto_name: true,
            sto_name_en: true,
          },
        },
      },
    });

    return {
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      reviews: pending.map((p) => ({
        revi_id: p.revi_id,
        store: p.store,
      })),
    };
  }

  // 새로운 즐겨찾기 등록 (등록 시 순서값 자동 설정)
  async registFavoriteStore(log_id: string, sto_id: number) {
    const user = await this.prisma.loginData.findUnique({
      where: { ld_log_id: log_id },
      select: { ld_user_id: true },
    });

    if (!user?.ld_user_id) {
      throw new Error('유저를 찾을 수 없습니다.');
    }

    const existing = await this.prisma.favoriteStore.findUnique({
      where: {
        user_id_sto_id: {
          user_id: user.ld_user_id,
          sto_id,
        },
      },
    });

    if (existing) {
      return {
        message: '이미 즐겨찾기한 가게입니다.',
        status: 'duplicate',
      };
    }

    // 현재 등록된 즐겨찾기 개수를 바탕으로 order_index 부여
    const count = await this.prisma.favoriteStore.count({
      where: { user_id: user.ld_user_id },
    });

    await this.prisma.favoriteStore.create({
      data: {
        user_id: user.ld_user_id,
        sto_id,
        fav_order_index: count,
      },
    });

    return {
      message: '즐겨찾기 등록 완료',
      status: 'success',
    };
  }

  // 즐겨찾기 삭제
  async deleteFavoriteStore(log_id: string, sto_id: number) {
    const user = await this.prisma.loginData.findUnique({
      where: { ld_log_id: log_id },
      select: { ld_user_id: true },
    });

    if (!user?.ld_user_id) {
      throw new Error('유저를 찾을 수 없습니다.');
    }

    const target = await this.prisma.favoriteStore.findUnique({
      where: {
        user_id_sto_id: {
          user_id: user.ld_user_id,
          sto_id,
        },
      },
    });

    if (!target) {
      return {
        message: '즐겨찾기 목록에 없는 가게입니다.',
        status: 'not_found',
      };
    }

    await this.prisma.favoriteStore.delete({
      where: {
        user_id_sto_id: {
          user_id: user.ld_user_id,
          sto_id,
        },
      },
    });

    return {
      message: '즐겨찾기 삭제 완료',
      status: 'success',
    };
  }

  // 즐겨찾기한 가게목록 조회
  async getListFavoriteStore(log_id: string) {
    const user = await this.prisma.loginData.findUnique({
      where: { ld_log_id: log_id },
      select: { ld_user_id: true },
    });

    if (!user?.ld_user_id) {
      throw new Error('유저를 찾을 수 없습니다.');
    }

    const today = dayjs().tz().day();
    const runtimeKeyMap = {
      0: 'holi_runtime_sun',
      1: 'holi_runtime_mon',
      2: 'holi_runtime_tue',
      3: 'holi_runtime_wed',
      4: 'holi_runtime_thu',
      5: 'holi_runtime_fri',
      6: 'holi_runtime_sat',
    } as const;
    const runtimeKey = runtimeKeyMap[today];

    const favorites = await this.prisma.favoriteStore.findMany({
      where: {
        user_id: user.ld_user_id,
        // 삭제(2)된 가게 제외
        store: { sto_status: { not: 2 } },
      },
      orderBy: { fav_order_index: 'asc' },
      include: {
        store: {
          select: {
            sto_id: true,
            sto_name: true,
            sto_name_en: true,
            sto_img: true,
            sto_address: true,
            // 휴무/영업시간 1:1 관계라면 이렇게 선택
            holiday: {
              select: {
                holi_break: true,
                holi_regular: true,
                holi_public: true,
                holi_runtime_sun: true,
                holi_runtime_mon: true,
                holi_runtime_tue: true,
                holi_runtime_wed: true,
                holi_runtime_thu: true,
                holi_runtime_fri: true,
                holi_runtime_sat: true,
              },
            },
          },
        },
      },
    });

    const storesWithTodayRuntime = favorites.map((f) => {
      const store = f.store;
      const h = store.holiday as {
        holi_weekday: number;
        holi_break: string | null;
        holi_regular: string | null;
        holi_public: string | null;
        holi_runtime_sun?: string | null;
        holi_runtime_mon?: string | null;
        holi_runtime_tue?: string | null;
        holi_runtime_wed?: string | null;
        holi_runtime_thu?: string | null;
        holi_runtime_fri?: string | null;
        holi_runtime_sat?: string | null;
      } | null;

      const today_runtime = h ? ((h as any)[runtimeKey] ?? null) : null;

      return {
        sto_id: store.sto_id,
        sto_name: store.sto_name,
        sto_name_en: store.sto_name_en,
        sto_img: store.sto_img,
        sto_address: store.sto_address,

        today_runtime, // 오늘의 영업시간
        holi_weekday: dayjs().tz('Asia/Seoul').day(), // 오늘 요일
        holi_break: h?.holi_break ?? null,
        holi_regular: h?.holi_regular ?? null,
        holi_public: h?.holi_public ?? null,
      };
    });

    return {
      status: 'success',
      stores: storesWithTodayRuntime,
    };
  }
}
