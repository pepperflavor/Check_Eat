import { HttpStatus, Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { SignInDTO } from './user_dto/sign-in.dto';
import * as bcrypt from 'bcrypt';
import { CreateUserDTO } from './user_dto/create-user.dto';
import { ConfigService } from '@nestjs/config';
import { randomNickMaker } from './randomNick';
import Decimal from 'decimal.js';

import { SearchStoreByVeganDto } from './user_dto/search-store-by-vegan.dto';
import dayjs from 'dayjs';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async createUser(createDTO: CreateUserDTO) {
    const SALT = Number(await this.config.get('BCRYPT_SALT_ROUNDS'));

    console.log(SALT);

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
          user_vegan: vegan > 0 ? vegan : null,
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
    const today = dayjs().day();

    const runtimeKeyMap = {
      0: 'holi_runtime_sun',
      1: 'holi_runtime_mon',
      2: 'holi_runtime_tue',
      3: 'holi_runtime_wed',
      4: 'holi_runtime_thu',
      5: 'holi_runtime_fri',
      6: 'holi_runtime_sat',
    };
    const runtimeKey = runtimeKeyMap[today];

    const storeIds = stores.map((s) => s.sto_id);
    const holidays = await this.prisma.holiday.findMany({
      where: {
        Store: {
          some: {
            sto_id: { in: storeIds },
          },
        },
      },
      include: {
        Store: true,
      },
    });

    return stores.map((store) => {
      const holiday = holidays.find((h) =>
        h.Store.some((s) => s.sto_id === store.sto_id),
      );

      return {
        ...store,
        holi_weekday: today,
        today_runtime: holiday?.[runtimeKey] ?? null,
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
        sto_id, sto_name, sto_latitude, sto_longitude,
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
  async getStoreByName(lang: string, data) {
    const { sto_name, user_latitude, user_longitude } = data;
    const LA = new Decimal(user_latitude);
    const LONG = new Decimal(user_longitude);
    const radius = 2000;

    const stores = await this.prisma.$queryRawUnsafe<any[]>(
      `
      SELECT
        sto_id, sto_name, sto_latitude, sto_longitude,
        sto_type, sto_address, sto_halal, sto_status, sto_img,
        ST_Distance(
          geography(ST_MakePoint(sto_longitude, sto_latitude)),
          geography(ST_MakePoint($1, $2))
        ) AS distance
      FROM "Store"
      WHERE sto_status != 2
        AND sto_name ILIKE '%' || $3 || '%'
        AND ST_DWithin(
          geography(ST_MakePoint(sto_longitude, sto_latitude)),
          geography(ST_MakePoint($1, $2)),
          $4
        )
      ORDER BY distance ASC;
      `,
      LONG,
      LA,
      sto_name,
      radius,
    );

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
    const { vegan_level, user_la, user_long } = data;
    const LA = new Decimal(user_la);
    const LONG = new Decimal(user_long);
    const radius = 2000;

    const stores = await this.prisma.$queryRawUnsafe<any[]>(
      `
      SELECT
        s.sto_id, s.sto_name, s.sto_latitude, s.sto_longitude,
        s.sto_type, s.sto_img, s.sto_address, s.sto_halal,
        ST_Distance(
          geography(ST_MakePoint(s.sto_longitude, s.sto_latitude)),
          geography(ST_MakePoint($1, $2))
        ) AS distance
      FROM "Store" s
      WHERE ST_DWithin(
        geography(ST_MakePoint(s.sto_longitude, s.sto_latitude)),
        geography(ST_MakePoint($1, $2)),
        $3
      )
      AND EXISTS (
        SELECT 1 FROM "Food" f
        WHERE f.foo_sa_id = s.sto_sa_id AND f.foo_vegan = $4
      )
      ORDER BY distance ASC;
      `,
      LONG,
      LA,
      radius,
      vegan_level,
    );

    if (!stores || stores.length === 0) {
      return { message: '조건에 맞는 가게가 없습니다', status: 'success' };
    }

    return await this.mergeStoresWithHoliday(stores);
  }

  //========== 가게 상세 페이지
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
        sto_name_en: true,
        sto_img: true,
        sto_address: true,
        sto_type: true,
        sto_halal: true,
        sto_latitude: true,
        sto_longitude: true,
        Food: {
          where: {
            foo_status: { not: 2 },
          },
          select: {
            foo_img: true,
            foo_status: true,
            foo_material: true,
            CommonAl: {
              select: { coal_id: true },
            },
            ...(lang === 'ko' && {
              foo_name: true,
              foo_price: true,
            }),
            ...(lang === 'en' && {
              food_translate_en: {
                select: {
                  ft_en_name: true,
                  ft_en_mt: true,
                  ft_en_price: true,
                },
              },
            }),
            ...(lang === 'ar' && {
              food_translate_ar: {
                select: {
                  ft_ar_name: true,
                  ft_ar_mt: true,
                  ft_ar_price: true,
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
      let foo_material: string | undefined;
      let foo_price: string | undefined;
  
      if (lang === 'ko') {
        foo_name = (food as any).foo_name;
        foo_material = (food as any).foo_material;
        foo_price = (food as any).foo_price?.toString();
      } else if (lang === 'en') {
        foo_name = food.food_translate_en?.ft_en_name ?? undefined;
        foo_material = food.food_translate_en?.ft_en_mt ?? undefined;
        foo_price = food.food_translate_en?.ft_en_price ?? undefined;
      } else if (lang === 'ar') {
        foo_name = food.food_translate_ar?.ft_ar_name ?? undefined;
        foo_material = food.food_translate_ar?.ft_ar_mt ?? undefined;
        foo_price = food.food_translate_ar?.ft_ar_price ?? undefined;
      }
  
      // 알러지 필터링
      let foo_warning: string | undefined = undefined;
      let foo_warning_coal: number[] = [];
  
      if (
        userData.user_allergy &&
        foo_material?.includes(userData.user_allergy)
      ) {
        foo_warning = userData.user_allergy;
      }
  
      const coalIds = food.CommonAl?.map((coal) => coal.coal_id) || [];
      foo_warning_coal = coalIds.filter((id) =>
        userData.user_allergy_common?.includes(id),
      );
  
      return {
        foo_name,
        foo_material,
        foo_price,
        foo_img: food.foo_img,
        foo_status: food.foo_status,
        ...(foo_warning && { foo_warning }),
        ...(foo_warning_coal.length > 0 && { foo_warning_coal }),
      };
    });
  
    return {
      sto_name_en: store.sto_name_en,
      sto_img: store.sto_img,
      sto_address: store.sto_address,
      sto_type: store.sto_type,
      sto_halal: store.sto_halal,
      sto_latitude: store.sto_latitude,
      sto_longitude: store.sto_longitude,
      food_list: transformedFoods,
    };
  }

  //========================= 유저 마이페이지 관련 시작

  // 유저 마이페이지에서 자기 정보 업데이트시 db에 정보 저장, 토큰도 새로 발급해줘야함
  async updateUserMypage() {}

  // 닉네임 변경
  async updateNick(ld_id: number, newNick: string) {
    // ld_id : lodindata 테이블의 아이디
    const userID = await this.prisma.loginData.findUnique({
      where: {
        ld_id: ld_id,
      },
      select: {
        ld_user_id: true,
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

    return {
      message: '닉네임 변경 성공',
      status: 'success',
    };
  }

  // 내가 쓴 리뷰들 목록
  async myAllReviews(log_id) {
    // 유저 아이디
    const userID = await this.prisma.loginData.findUnique({
      where: {
        ld_log_id: log_id,
      },
    });

    // const reviews = await this.prisma.review.findMany({
    //   where:{
    //     user_id : userID
    //   }
    // })
  }
}
