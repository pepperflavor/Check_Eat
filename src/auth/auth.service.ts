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
import axios from 'axios';
import * as qs from 'qs';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

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


    if (isId.status !== 200 && isEmail.status !== 200) {
      throw new UnauthorizedException(
        '이미 존재하는 아이디 또는 이메일입니다.',
      );
    }

    const result = await this.userService.createUser(data);

   
    return result;
  }

  // 사장 회원가입
  async signUpSajang(data: CreateSajangDTO) {
    const result = await this.sajangService.createSajang(data);

    return result;
  }

  // 로그인
  async login(inputId: string) {
    // 가입한 유저인지 확인
    const data = await this.commonService.findById(inputId);
    if (!data) {
      throw new UnauthorizedException('로그인 정보가 존재하지 않습니다.');
    }

    const isWithdraw = await this.commonService.isWithdraw(inputId);

    if (isWithdraw == 2 || isWithdraw == undefined) {
      return {
        message: '탈퇴한 회원입니다.',
        status: 'false',
      };
    }
    // // 비밀번호 확인
    // const isMatch = await this.commonService.comparePassword(
    //   inputPwd,
    //   data.ld_pwd,
    // );

    // if (isMatch == false) {
    //   throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
    // }

    // 토큰 발급
    const tokenPayload = await this.generateToken(
      data.ld_log_id,
      data.ld_usergrade,
      data.ld_email,
      data.ld_lang,
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

    // console.log('액세스토큰 : ' + accessToken);
    // console.log('리프레시 토큰 : ' + refreshToken);
    // 리프레시 토큰 저장해주기~
    await this.commonService.updateRefreshToken(data.ld_id, refreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }

  // 로그인시 유저 유형별 토큰 발급 리프레시는 db 저장
  async generateToken(
    ld_id: string,
    ld_usergrade: number,
    ld_email: string,
    ld_lang: string,
  ) {
    let payload: any = {
      sub: ld_id,
      role: ld_usergrade,
      email: ld_email,
      lang: ld_lang,
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
    
      const sajang = (await this.commonService.isExistLoginData(
        ld_id,
        ld_usergrade,
      )) as SajangLoginToken;

 
      payload = {
        ...payload,
        sa_id: sajang.ld_sajang_id,
        sto_id: sajang.sajang?.Store?.[0].sto_id ?? null, // 일단 처음 등록한 가게로
      };

      return payload;
    }
  }

  // 엑세스, 리프레시 발급 로직 분리 필요
  // 리프레시 새로 발급
  async refreshToken(inputId: string, refreshToken: string) {
    const user = await this.commonService.findById(inputId);

    if (!user || !user.ld_refresh_token) {
      throw new UnauthorizedException('리프레시 토큰이 존재하지 않습니다.');
    }

    // db에 저장돼 있던 로큰이랑 비교
    if (user.ld_refresh_token !== refreshToken) {
      throw new UnauthorizedException('리프레시 토큰이 일치하지 않습니다.');
    }

    try {
      // 유효성 검사
      // 리프레시 만료되면 리턴
      /*
      {
        name: 'TokenExpiredError',
        message: 'jwt expired',
        expiredAt: ...
      }
      */
      const decoded = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.config.get<string>('JWT_RFRESH_SECRET'),
      });

      const newPayload = await this.generateToken(
        user.ld_log_id,
        user.ld_usergrade,
        user.ld_email,
        user.ld_lang,
      );

      const newAccessToken = await this.jwtService.signAsync(newPayload, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRATION_TIME'),
      });

      // 여기에 요청들어오면 무조건 새 refresh token 발급
      const newRefreshToken = await this.jwtService.signAsync(
        { sub: user.ld_id },
        {
          secret: this.config.get<string>('JWT_RFRESH_SECRET'),
          expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRATION_TIME'),
        },
      );

      await this.commonService.updateRefreshToken(user.ld_id, newRefreshToken);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException(
        '리프레시 토큰이 유효하지 않습니다. 다시 로그인해주세요.',
      );
    }
  }

  // 이메일 본인 인증하기
  async identityEmail(inputEmail: string, token: string) {
    const isValid = await this.commonService.isExistEmail(inputEmail);
  }

  // 사용자 언어에 맞게 이메일 인증 코드 발송
  // 아이디, 비밀번호 찾기도 여기에서 분기해서 이메일 발송해줌
  async requestEmailVerification(
    email: string,
    type: number,
    language: string,
  ) {
    // # MEMO
    // type : 0 == 회원가입시 이메일인증
    // type : 1 == 아이디찾기
    // type : 2  == 비밀번호 찾기

    this.logger.log('이메일 코드발송 시작');
    const trimEmail = email.trim().toLowerCase();

    // 레디스 키값 설정
    if (type == 0) {
      const key = `token-${trimEmail}`;

      try {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.logger.log(`이메일 인증 코드 ${code}`);

        await this.cacheService.set(key, code, 300);
        const savedCode = await this.cacheService.get(key);
        this.logger.log(`저장된 코드: ${savedCode}`);

        await this.emailService.sendVerificationCode(email, code, language, 0);
      } catch (error) {
        this.logger.error('이메일 인증 코드 생성 실패', error);
        throw new Error('인증코드 생성중 오류가 발생했습니다.');
      }
    } else if (type == 1) {
      // 아이디 찾기 일때 이메일 발송
      const key = `find-id-${trimEmail}`;

      try {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();

        await this.cacheService.set(key, code, 300);
        const savedCode = await this.cacheService.get(key);
        this.logger.log(`저장된 코드: type 1  ===  ${savedCode}`);

        await this.emailService.sendVerificationCode(email, code, language, 1);
      } catch (error) {
        throw new Error('인증코드 발송중 오류가 발생했습니다.');
      }
    } else if (type == 2) {
      const key = `find-pwd-${trimEmail}`;

      try {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        await this.cacheService.set(key, code, 300);
        const savedCode = await this.cacheService.get(key);
        this.logger.log(`저장된 코드: type 2  ===  ${savedCode}`);

        await this.emailService.sendVerificationCode(email, code, language, 2);
      } catch (error) {
        this.logger.error('비밀번호 찾기 인증코드 발송 실패 ', error);
        this.logger.error(` type : ${type}`);
        throw new Error('인증코드 발송중 오류가 발생했습니다.');
      }
    }
  }

  // 로그인 한상태에서 비번변경
  async updatePwd(ld_id: string, inputpwd: string) {
    const result = await this.commonService.updatePwdCommon(ld_id, inputpwd);
    return result;
  }

  // 탈퇴 - 상태 변경
  async deleteAccount(ld_id: string) {
    // 숫자로 가공은 들고 들어가서함
    const result = await this.commonService.editState(ld_id, 2);

    if (!result || result == null || result == undefined) {
      return {
        message: '회원 탈퇴 실패',
        status: 'false',
      };
    }
    return {
      message: '회원 탈퇴 처리 완료',
      status: 'success',
    };
  }

  async noLoginChangePwd(email: string, pwd: string) {
    return await this.commonService.newPwdCommon(email, pwd);
  }

  // LocalStrategy에서 사용할 사용자 검증 메서드
  async validateUser(username: string, password: string): Promise<any> {
    const data = await this.commonService.findById(username);

    if (!data?.ld_log_id) {
      throw new UnauthorizedException('유저가 존재하지 않습니다');
    }

    const isMatch = await this.commonService.comparePassword(
      password,
      data.ld_pwd,
    );

    if (!isMatch) {
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다');
    }

    return data;
  }

  //====== 애플 로그인 관련
  /** Apple client_secret(JWT) 생성 */
  private generateAppleClientSecret(): string {
    const teamId = this.config.get<string>('APPLE_TEAM_ID');
    const clientId = this.config.get<string>('APPLE_CLIENT_ID');
    const keyId = this.config.get<string>('APPLE_KEY_ID');
    const privateKey = this.config.get<string>('APPLE_PRIVATE_KEY');

    if (!privateKey) {
      throw new Error('APPLE_PRIVATE_KEY is not defined in the configuration');
    }
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    const claims = {
      iss: teamId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 15777000, // 6개월
      aud: 'https://appleid.apple.com',
      sub: clientId,
    };

    return jwt.sign(claims, privateKey, {
      algorithm: 'ES256',
      keyid: keyId,
    });
  }

  /** Apple Token API 호출 */
  private async getAppleToken(code: string) {
    const clientSecret = this.generateAppleClientSecret();

    const body = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.get<string>('APPLE_REDIRECT_URI'),
      client_id: this.config.get<string>('APPLE_CLIENT_ID'),
      client_secret: clientSecret,
    };

    try {
      const res = await axios.post(
        'https://appleid.apple.com/auth/token',
        qs.stringify(body),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      return res.data;
    } catch (err) {
      this.logger.error('Apple Token API 호출 실패', err.response?.data || err);
      throw new UnauthorizedException('Apple 로그인 토큰 발급 실패');
    }
  }

  /** Apple ID Token 검증 */
  private async verifyAppleIdToken(idToken: string) {
    const client = jwksClient({
      jwksUri: 'https://appleid.apple.com/auth/keys',
    });

    const decodedHeader = jwt.decode(idToken, { complete: true }) as {
      header?: { kid?: string };
    } | null;

    if (!decodedHeader?.header?.kid) {
      throw new UnauthorizedException('Apple ID Token 디코딩 실패');
    }

    const { kid } = decodedHeader.header!;
    const key = await client.getSigningKey(kid);

    const publicKey = key.getPublicKey();

    try {
      const payload: any = jwt.verify(idToken, publicKey);
      return payload; // { sub, email, email_verified, ... }
    } catch (err) {
      this.logger.error('Apple ID Token 검증 실패', err);
      throw new UnauthorizedException('Apple 로그인 검증 실패');
    }
  }

  /** 실제 애플 로그인 처리 */
  async handleAppleLogin(code: string) {
    // 1. Apple에서 토큰 받기
    const tokenData = await this.getAppleToken(code);

    // 2. ID 토큰 검증 후 유저 정보 추출
    const appleUser = await this.verifyAppleIdToken(tokenData.id_token);

    // 3. DB에서 해당 Apple sub(email)로 사용자 조회
    const existingUser = await this.commonService.findByEmail(appleUser.email);

    let userAccount;

    if (!existingUser) {
      // 신규 가입 처리 (Apple은 이름을 한 번만 주므로 기본값 설정 필요)
      const newUser: CreateUserDTO = {
        log_Id: appleUser.sub,
        email: appleUser.email,
        log_pwd: null,
        ld_lang: 'ko',
        appleType: 1,
        vegan: null,
        isHalal: 0,
      };
      userAccount = await this.userService.createUser(newUser);
    } else {
      userAccount = existingUser;
    }

    if (!userAccount) {
      throw new UnauthorizedException('애플 유저 생성 실패');
    }

    // 4. JWT 토큰 발급
    const payload = await this.generateToken(
      (userAccount as any).ld_log_id,
      (userAccount as any).ld_usergrade,
      (userAccount as any).ld_email,
      (userAccount as any).ld_lang,
    );

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRATION_TIME'),
    });

    const refreshToken = await this.jwtService.signAsync(
      { sub: userAccount.ld_id },
      {
        secret: this.config.get<string>('JWT_RFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRATION_TIME'),
      },
    );

    await this.commonService.updateRefreshToken(
      userAccount.ld_id,
      refreshToken,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        email: appleUser.email,
        sub: appleUser.sub,
      },
    };
  }

  // 유저 정보 업데이트 후 새토큰 발급
  async getAccessToken(payload: any) {
    return this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRATION_TIME'),
    });
  }
}
