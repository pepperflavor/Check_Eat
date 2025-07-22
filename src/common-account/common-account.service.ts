import { HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  SajangLoginToken,
  UserLoginToken,
} from 'src/common-account/types/token_type';
import { PrismaService } from 'src/prisma.service';
import * as bcrypt from 'bcrypt';
import { CacheService } from 'src/cache/cache.service';
import { ConfigService } from '@nestjs/config';

// 로그인, 회원가입시 공통 기능 부분 분리
@Injectable()
export class CommonAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private cache: CacheService,
  ) {}

  //  이메일 중복확인
  async isExistEmail(inputEmail: string) {
    const checkLogEmail = await this.prisma.loginData.findUnique({
      where: {
        ld_email: inputEmail,
      },
    });

    return checkLogEmail
      ? {
          message: '이미 가입된 이메일입니다',
          status: HttpStatus.CONFLICT,
        }
      : {
          message: '가입 가능한 이메일입니다',
          status: HttpStatus.OK,
        };
  }

  // 아이디 중복확인
  async isExistID(inputId: string) {
    const result = await this.prisma.loginData.findUnique({
      where: {
        ld_log_id: inputId,
      },
    });

    return result
      ? { message: '아이디가 존재합니다', status: HttpStatus.CONFLICT }
      : { message: '아이디가 존재하지 않습니다', status: HttpStatus.OK };

    // if (idData && user_grade == 0 && idData.ld_user_id !== null) {
    //   // 개인유저
    //   const isExistUserID = await this.prisma.user.findUnique({
    //     where: {
    //       user_id: idData.ld_user_id,
    //     },
    //     select: {
    //       user_id: true,
    //     },
    //   });

    //   return isExistUserID
    //     ? { message: '아이디가 존재합니다', status: HttpStatus.CONFLICT }
    //     : { message: '아이디가 존재하지 않습니다', status: HttpStatus.OK };
    // } else if (idData && user_grade == 1 && idData.ld_sajang_id !== null) {
    //   // 사장일때
    //   const isExistSajangID = await this.prisma.sajang.findUnique({
    //     where: {
    //       sa_id: idData.ld_sajang_id,
    //     },
    //     select: {
    //       sa_id: true,
    //     },
    //   });

    // }
  }

  // 로그인 시 데이터 조회, 토큰 생성 데이터
  async isExistLoginData(
    ld_id: string,
    ld_usergrade: number,
  ): Promise<UserLoginToken | SajangLoginToken> {
    if (ld_usergrade == 0) {
      const data = await this.prisma.loginData.findUnique({
        where: { ld_log_id: ld_id },
        include: {
          user: {
            select: {
              user_id: true,
              user_nick: true,
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
      return data! as UserLoginToken;
    } else if (ld_usergrade == 1) {
      const data = await this.prisma.loginData.findUnique({
        where: {
          ld_log_id: ld_id,
        },
        include: {
          sajang: {
            select: {
              sa_id: true,
              sa_certi_status: true,
              Store: {
                select: {
                  sto_id: true,
                },
              },
            },
          },
        },
      });

      return data! as SajangLoginToken;
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

  // 리프레시 토큰 업데이트
  async updateRefreshToken(ld_id, refreshToken: string) {
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

  async comparePassword(plainPWD: string, hashedPWD: string): Promise<boolean> {
    if (!hashedPWD || !hashedPWD.startsWith('$2')) {
      throw new Error('저장된 비밀번호 형식이 잘못되었습니다.');
    }
    return bcrypt.compare(plainPWD, hashedPWD);
  }

  // ===== 회원 상태 수정

  // 탈퇴
  async editState(ld_id: string, updateState: number) {
    const id = Number(ld_id);
    const result = await this.prisma.loginData.update({
      where: {
        ld_id: id,
      },
      data: {
        ld_status: updateState,
      },
    });
    return result;
  }

  // 비번 업데이트, 재설정
  async updatePwdCommon(ld_id: string, inputpwd: string) {
    const ID = Number(ld_id);
    const SALT = await this.config.get('BCRYPT_SALT_ROUNDS');
    const hashedPWD = await bcrypt.hash(inputpwd, SALT); // 비번 해시화

    const result = await this.prisma.loginData.update({
      where: {
        ld_id: ID,
      },
      data: {
        ld_pwd: hashedPWD,
      },
    });

    if (result == null || result == undefined) {
      throw new Error('비밀번호 재설정중 오류가 발생했습니다.');
    }

    return {
      message: '비밀번호 재설정 완료',
      status: 'success',
    };
  }

  //=========== 이메일 본인 인증 관련

  // 이메일 토큰 검증
  // type: 0 회원가입, 1: 아이디찾기, 2: 비밀번호 찾기
  async verifyEmailToken(email: string, inputCode: string, type: number) {
    const trimEmail = email.trim().toLowerCase();
    let key = '';

    if (type == 0) {
      key = `token-${trimEmail}`.trim();
    } else if (type == 1) {
      key = `find-id-${trimEmail}`;
    } else if (type == 2) {
      key = `find-pwd-${trimEmail}`;
    }

    if (key == '' || key == undefined || key == null) {
      throw new Error('레디트 키값을 설정하는 도중 오류가 발생했습니다.');
    }

    try {
      const savedCode = await this.cache.get(key);
      console.log(`저장되어있던 코드 : ${savedCode}`);
      console.log(`입력들어온 코드 : ${inputCode}`);

      if (!savedCode) {
        throw new UnauthorizedException(
          '인증 코드가 만료되었거나 존재하지 않습니다.',
        );
      }

      if (savedCode !== inputCode.trim()) {
        throw new UnauthorizedException(
          '인증 코드가 일치하지 않습니다. 다시 시도해주세요',
        );
      }

      await this.cache.del(key);

      // 유저 아이디 찾아서 보내줘야함
      const ID = await this.prisma.loginData.findUnique({
        where: {
          ld_email: email,
        },
        select: {
          ld_log_id: true,
        },
      });

      if (ID == null || ID == undefined) {
        throw new UnauthorizedException(
          '해당 이메일로 가입한 아이디가 없습니다.',
        );
      }

      return {
        message: '이메일 본인 인증 성공',
        status: 'success',
        log_id: ID,
      };
    } catch (error) {
      throw new Error('인증 코드 검증 중 문제가 발생했습니다.');
    }
  }
}
