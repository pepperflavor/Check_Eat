import { HttpStatus, Injectable } from '@nestjs/common';
import {
  SajangLoginToken,
  UserLoginToken,
} from 'src/common-account/types/token_type';
import { PrismaService } from 'src/prisma.service';

// 로그인, 회원가입시 공통 기능 부분 분리
@Injectable()
export class CommonAccountService {
  constructor(private readonly prisma: PrismaService) {}

  //  이메일 중복확인
  async isExistEmail(id: string, user_grade: number) {
    const checkLogEmail = await this.prisma.loginData.findUnique({
      where: {
        ld_log_id: id,
      },
    });

    if (
      checkLogEmail &&
      checkLogEmail.ld_usergrade == 0 &&
      checkLogEmail.ld_user_id !== null
    ) {
      // 개인유저
      const isExistUserEmail = await this.prisma.user.findUnique({
        where: {
          user_id: checkLogEmail.ld_user_id,
        },
        select: {
          user_email: true,
        },
      });

      return isExistUserEmail
        ? { message: '이메일이 존재합니다', status: HttpStatus.CONFLICT }
        : {
            message: '이메일이 존재하지 않습니다',
            status: HttpStatus.OK,
          };
    } else if (
      checkLogEmail &&
      checkLogEmail.ld_usergrade == 1 &&
      checkLogEmail.ld_sajang_id !== null
    ) {
      // 사장일때
      const isExistSajangEmail = await this.prisma.sajang.findUnique({
        where: {
          sa_id: checkLogEmail.ld_sajang_id,
        },
        select: {
          sa_email: true,
        },
      });

      return isExistSajangEmail
        ? { message: '이메일이 존재합니다', status: HttpStatus.CONFLICT }
        : {
            message: '이메일이 존재하지 않습니다',
            status: HttpStatus.OK,
          };
    }
  }

  // 아이디 중복확인
  async isExistID(id: string, user_grade: number) {
    const idData = await this.prisma.loginData.findUnique({
      where: {
        ld_log_id: id,
      },
    });

    if (idData && user_grade == 0 && idData.ld_user_id !== null) {
      // 개인유저
      const isExistUserID = await this.prisma.user.findUnique({
        where: {
          user_id: idData.ld_user_id,
        },
        select: {
          user_id: true,
        },
      });

      return isExistUserID
        ? { message: '아이디가 존재합니다', status: HttpStatus.CONFLICT }
        : { message: '아이디가 존재하지 않습니다', status: HttpStatus.OK };
    } else if (idData && user_grade == 1 && idData.ld_sajang_id !== null) {
      // 사장일때
      const isExistSajangID = await this.prisma.sajang.findUnique({
        where: {
          sa_id: idData.ld_sajang_id,
        },
        select: {
          sa_id: true,
        },
      });

      return isExistSajangID
        ? { message: '아이디가 존재합니다', status: HttpStatus.CONFLICT }
        : { message: '아이디가 존재하지 않습니다', status: HttpStatus.OK };
    }
  }

  // 로그인 시 데이터 조회, 토큰 생성 데이터
  async isExistLoginData(
    ld_id: string,
    ld_usergrade: number,
  ): Promise<UserLoginToken | SajangLoginToken> {
    if (ld_usergrade == 0) {
      const data = await this.prisma.loginData.findUnique({
        where: {
          ld_log_id: ld_id,
        },
        include: {
          user: {
            select: {
              user_id: true,
              user_nick: true,
              user_email: true,
              user_allergy: true,
              user_vegan: true,
              user_is_halal: true,
              user_allergy_common: {
                select: {
                  coal_id: true,
                  coal_name: true,
                },
              },
            },
          },
        },
      });
      return data!;
    } else if (ld_usergrade == 1) {
      const data = await this.prisma.loginData.findUnique({
        where: {
          ld_log_id: ld_id,
        },
        include: {
          sajang: {
            select: {
              sa_id: true,
              sa_email: true,
              sa_certi_status: true,
            },
          },
        },
      });

      return data!;
    }
    throw new Error('유저데이터 조회안됨');
  }

  // 비밀번호 재설정

  // 아이디 잊었을때

  // 아이디 비번으로 로그인
  async findById(inputId: string) {
    const isExist = await this.prisma.loginData.findUnique({
      where: {
        ld_log_id: inputId,
      },
    });

    return isExist;
  }

  async updateRefreshToken(ld_id, refreshToken) {
    const result = await this.prisma.loginData.update({
      where: {
        ld_id: ld_id,
      },
      data: {
        ld_refresh_token: refreshToken,
      },
    });
    return result;
  }
}
