import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CacheService } from 'src/cache/cache.service';
import { EmailService } from 'src/email/email.service';

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
  private readonly logger = new Logger(AuthService.name);
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
  async signUpUser(data: CreateUserDTO) {
    // 한번더 검증
    const isId = await this.commonService.isExistID(data.log_Id);
    const isEmail = await this.commonService.isExistEmail(data.email);

    if (isId && isEmail) {
      throw new UnauthorizedException(
        '이미 존재하는 아이디 또는 이메일입니다.',
      );
    }

    const result = await this.userService.createUser(data);

    console.log(result);
    return result;
  }

  // 사장 회원가입
  async signUpSajang() {}


  
  // 로그인
  async login(inputId: string, inputPwd: string) {
    // 가입한 유저인지 확인
    const data = await this.commonService.findById(inputId);

    if (!data) {
      throw new UnauthorizedException('로그인 정보가 존재하지 않습니다.');
    }

    // 비밀번호 확인
    const isMatch = await this.commonService.comparePassword(
      inputPwd,
      data.ld_pwd,
    );

    if (isMatch == false) {
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
    }

    // 토큰 발급
    const tokenPayload = await this.generateToken(
      data.ld_log_id,
      data.ld_usergrade,
      data.ld_email,
    );

    const accessToken = await this.jwtService.signAsync(tokenPayload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRATION_TIME'),
    });

    const refreshToken = await this.jwtService.signAsync(
      { sub: data.ld_id },
      {
        secret: this.config.get<string>('JWT_RFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRATION_TIME'),
      },
    );

    // 리프레시 토큰 저장해주기~
    await this.commonService.updateRefreshToken(data.ld_id, refreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }

  // 로그인시 유저 유형별 토큰 발급 리프레시는 db 저장
  async generateToken(ld_id: string, ld_usergrade: number, ld_email: string) {
    let payload: any = {
      sub: ld_id,
      role: ld_usergrade,
      email: ld_email,
    };

    if (ld_usergrade == 0) {
      const user = await this.commonService.isExistLoginData(
        ld_id,
        ld_usergrade,
      );

      console.log('유저 데이터 리턴 확인');
      console.log(user);

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
      const sajang = (await this.commonService.isExistLoginData(
        ld_id,
        ld_usergrade,
      )) as SajangLoginToken;

      console.log('데이터 리턴 확인');
      console.log(sajang);

      payload = {
        ...payload,
        sa_id: sajang.ld_sajang_id,
        sto_id: sajang.sajang?.Store?.[0].sto_id ?? null, // 일단 처음 등록한 가게로
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

  // 이메일 본인 인증하기
  async identityEmail(inputEmail: string, token: string) {
    const isValid = await this.commonService.isExistEmail(inputEmail);
  }

  // 사용자 언어에 맞게 이메일 인증 코드 발송
  async requestEmailVerification(email: string, language: string) {
    this.logger.log('이메일 인증 요청 시작');

    const trimEmail = email.trim().toLowerCase();
    const key = `token-${trimEmail}`;

    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      this.logger.log(`이메일 인증 코드 ${code}`);

      const savedCode = await this.cacheService.get(key);
      this.logger.log(`저장된 코드: ${savedCode}`);

      await this.cacheService.set(key, code, 300);

      await this.emailService.sendVerificationCode(email, code, language);
    } catch (error) {
      this.logger.error('이메일 인증 코드 생성 실패', error);
      throw new Error('인증코드 생성중 오류가 발생했습니다.');
    }
  }

  // LocalStrategy에서 사용할 사용자 검증 메서드
  async validateUser(username: string, password: string): Promise<any> {
    const data = await this.commonService.findById(username);

    if (!data) {
      return null;
    }

    const isMatch = await this.commonService.comparePassword(
      password,
      data.ld_pwd,
    );

    if (!isMatch) {
      return null;
    }

    return data;
  }
}
