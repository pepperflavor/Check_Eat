import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

// 로그인시 공통 기능 부분 분리
@Injectable()
export class LoginDataService {
  constructor(private readonly prisma: PrismaService) {}

  // 이메일 중복확인
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
  async isExistID(id: string) {
    const result = await this.prisma.loginData.findUnique({
      where: {
        ld_log_id: id,
      },
    });

    if (result) {
    }
  }
}
