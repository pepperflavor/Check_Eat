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
    } = createDTO;

    const hashedPWD = await bcrypt.hash(log_pwd, SALT);

    // 여기서 닉네임 랜덤인거 수정해주기
    if (nickname == '' || nickname == undefined) {
      nickname = randomNickMaker(1, 'ko'); // 닉네임도 랜덤으로 돌리기
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

  //======  메인 기능 시작
  // 메인 지도화면 좌표 리턴
  async mainPageStoresData(user_la: string, user_long: string, radius: number) {
    // 현재 위도 경도 소수로 수정
    const LA = new Decimal(user_la);
    const LONG = new Decimal(user_long);

    const stores = await this.prisma.$queryRawUnsafe<any[]>(
      `
      SELECT
      sto_id, 
        sto_name, 
        sto_latitude, 
        sto_longitude,
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
      ORDER BY distance ASC;
    `,
      LONG,
      LA,
      radius,
    );

    if (stores.length == 0) {
      return {
        message: `반경 ${radius}km 내의 위치한 가게가 없습니다`,
        status: 'success',
      };
    } else if (stores.length > 0) {
      return stores;
    } else if (stores == null || stores == undefined) {
      throw new Error(
        '유저 위치 기반 주변 가게를 찾는 도중 에러가 발생했습니다.',
      );
    }
  }

  // 가게 이름으로 음식점 검색하기
  // 나중에 언어 별로 리턴해주게 수정해야함
  // 반경 2km 추가
  async getStoreByName(lang: string, data) {
    const { sto_name } = data;

    const result = await this.prisma.store.findMany({
      where: {
        sto_name: {
          contains: sto_name,
          mode: 'insensitive', // 대소문자 구분 없이
        },
        sto_status: {
          not: 2, // sto_status == 2이면 폐업한 곳임
        },
      },
      select: {
        sto_name: true,
        sto_img: true,
        sto_address: true,
        sto_halal: true,
        sto_latitude: true,
        sto_longitude: true,
        sto_phone: true,
        sto_type: true,
        holiday: {
          // 휴일정보 추가...?
        },
      },
    });

    if (!result || result == null || result == undefined) {
      return {
        message: '해당 검색어에 대한 데이터가 없습니다.',
        status: 'false',
      };
    }

    return result;
  }

  // 비건 단계 필터로 가게 찾기
  async getStoreByVegan(data: SearchStoreByVeganDto) {
    const { vegan_level, user_la, user_long } = data;

    const LA = new Decimal(user_la);
    const LONG = new Decimal(user_long);
    const radius = 2000;
    const today = dayjs().day(); // 0 일요일

    const stores = await this.prisma.$queryRawUnsafe<any[]>(
      `
      SELECT
        s.sto_id,
        s.sto_name,
        s.sto_latitude,
        s.sto_longitude,
        s.sto_sa_id,
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
        SELECT 1
        FROM "Food" f
        WHERE f.foo_sa_id = s.sto_sa_id
        AND f.foo_vegan = $4
      )
      ORDER BY distance ASC
      `,
      LONG,
      LA,
      radius,
      vegan_level,
    );

    if (!stores || stores.length === 0) {
      return { message: '조건에 맞는 가게가 없습니다', status: 'success' };
    }

    const storeIds = stores.map((s) => s.sto_id);

    // 가게별 Holiday 정보 가져오기
    const holidays = await this.prisma.holiday.findMany({
      where: {
        Store: {
          some: {
            sto_id: {
              in: storeIds,
            },
          },
        },
      },
      include: {
        Store: true,
      },
    });

    // 요일별 영업시간 키
    const runtimeKeyMap = {
      0: 'holi_runtime_sun',
      1: 'holi_runtime_mon',
      2: 'holi_runtime_tue',
      3: 'holi_runtime_wed',
      4: 'holi_runtime_thu',
      5: 'holi_runtime_fri',
      6: 'holi_runtime_sat',
    };

    // 가게별 Holiday 정보 병합
    const result = stores.map((store) => {
      const holiday = holidays.find((h) =>
        h.Store.some((s) => s.sto_id === store.sto_id),
      );

      const runtimeKey = runtimeKeyMap[today];
      const todayRuntime = holiday?.[runtimeKey] ?? null;

      return {
        ...store,
        holi_weekday: today,
        today_runtime: todayRuntime,
        holi_regular: holiday?.holi_regular ?? null,
        holi_public: holiday?.holi_public ?? null,
        holi_break: holiday?.holi_break ?? null,
      };
    });

    return result;
  }

  //===== 유저 마이페이지 관련 시작

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
