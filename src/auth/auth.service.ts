import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CacheService } from 'src/cache/cache.service';
import { EmailService } from 'src/email/email.service';
import { LoginDataService } from 'src/login-data/login-data.service';
import { SajangService } from 'src/sajang/sajang.service';
import { CreateSajangDTO } from 'src/sajang/sajang_dto/create-sajang.dto';
import { UserService } from 'src/user/user.service';
import { CreateUserDTO } from 'src/user/user_dto/create-user.dto';
import {
  SajangLoginToken,
  UserLoginToken,
} from '../common-account/types/token_type';
import { CommonAccountService } from 'src/common-account/common-account.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private cacheService: CacheService,
    private userService: UserService,
    private sajangService: SajangService,
    private readonly emailService: EmailService,
    private commonService: CommonAccountService,
  ) {}

  // 유저 회원가입
  async signUpUser() {}

  // 사장 회원가입
  async signUpSajang() {}

  async login(inputId: string) {
    const data = await this.commonService.findById(inputId);
    if (!data) {
      throw new UnauthorizedException('로그인 정보가 존재하지 않습니다.');
    }

    const tokenPayload = this.generateToken(data.ld_log_id, data.ld_usergrade);

    const accessToken = this.jwtService.signAsync(tokenPayload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRATION_TIME'),
    });

    const refreshToken = this.jwtService.signAsync({sub: data.ld_id}, {
      secret: this.config.get<string>('JWT_RFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRATION_TIME'),
    })

    await this.commonService.updateRefreshToken(data.ld_id, refreshToken)
  }

  // 유저 존재 여부 확인
  async validateUser(log_id: string, log_pwd: string) {
    const user = await this.userService.findById({ log_id, log_pwd });

    return user;
  }

  // 로그인시 유저 유형별 토큰 발급 리프레시는 db 저장
  async generateToken(ld_id: string, ld_usergrade: number) {
    let payload: any = {
      sub: ld_id,
      role: ld_usergrade,
    };

    if (ld_usergrade == 0) {
      const user = await this.commonService.isExistLoginData(
        ld_id,
        ld_usergrade,
      );

      // user 가 실제로 객체에 존재하는지 확인
      if (user && 'user' in user && user.user) {
        payload = {
          ...payload,
          user_vegan: user.user.user_vegan,
          user_halal: user.user.user_is_halal,
          user_allergy: user.user.user_allergy,
          user_allergy_common: user.user.user_allergy_common,
          user_nick: user.user.user_nick,
        };
      }

      return payload;
    } else if (ld_usergrade == 1) {
      const sajang = await this.commonService.isExistLoginData(
        ld_id,
        ld_usergrade,
      );

      payload = {
        ...payload,
        sa_id: sajang?.ld_sajang_id,
      };

      return payload;
    }
  }

  // 엑세스, 리프레시 발급 로직 분리 필요

  // 리프레시 발급
  async refreshToken(inputId: string, refreshToken: string) {
    const data = await this.commonService.findById(inputId);

    if (!data || data.ld_refresh_token) {
      throw new UnauthorizedException('리프레시 토큰이 존재하지 않습니다.');
    }

    // 새토큰 재발급 // 로그인 쪽으로 연결
  }

  // 유저 상태 업데이트 후 토큰 재발급
}
