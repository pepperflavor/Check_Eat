import { HttpStatus, Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { SignInDTO } from './user_dto/sign-in.dto';
import * as bcrypt from 'bcrypt';
import { CreateUserDTO } from './user_dto/create-user.dto';
import { ConfigService } from '@nestjs/config';
import { randomNickMaker } from './randomNick';
import Decimal from 'decimal.js';
import { throwError } from 'rxjs';

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

  //======  메인 페이지 기능 시작
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

  //===== 유저 마이페이지 관련 시작
  // 닉네임 변경

  // 유저 마이페이지에서 자기 정보 업데이트시 db에 정보 저장
  async updateUserMypage() {}
}
