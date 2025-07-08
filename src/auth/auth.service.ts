import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CacheService } from 'src/cache/cache.service';
import { EmailService } from 'src/email/email.service';
import { SajangService } from 'src/sajang/sajang.service';
import { CreateSajangDTO } from 'src/sajang/sajang_dto/create-sajang.dto';
import { UserService } from 'src/user/user.service';
import { CreateUserDTO } from 'src/user/user_dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private cacheService: CacheService,
    private userService: UserService,
    private sajangService: SajangService,
    private readonly emailService: EmailService,
  ) {}


  // 유저 회원가입
  async signUpUser(){

  }

  // 사장 회원가입
  async signUpSajang(){

  }
  
  // 유저 존재 여부 확인
  async validateUser(log_id: string, log_pwd: string) {
    const user = await this.userService.findById({ log_id, log_pwd });

    return user;
  }

  // 로그인시 유저 유형별 토큰 발급 리프레시는 db 저장
  async generateToken(ld_id, ld_usergrade, data) {
    if (ld_usergrade == 0) {
      const result = await this.userService.createUser(data as CreateUserDTO);
    } else if (ld_usergrade == 1) {
      const result = await this.sajangService.createSajang(
        data as CreateSajangDTO,
      );
    }
  }

  // 엑세스, 리프레시 발급 로직 분리 필요

  // 리프레시 재발급
  async newRefreshToken() {}

  // 유저 상태 업데이트 후 토큰 재발급
}
