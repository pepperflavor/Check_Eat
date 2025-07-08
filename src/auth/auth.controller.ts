import { Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBody, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { CreateUserDTO } from 'src/user/user_dto/create-user.dto';
import { CreateSajangDTO } from 'src/sajang/sajang_dto/create-sajang.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 일반 유저 회원가입
  @ApiOperation({summary: '개인 유저 회원가입', description: '개인 유저 회원가입'})
  @ApiBody({ type: CreateUserDTO})
  @Post('signup/user')
  async registerUser() {}

  // 사장 회원가입, 사업자 등록증 데이터를 받아야 해서 엔드포인트 분리함
  // sajang.service에 로직 분리
  @Post('signup/sajang')
  @ApiOperation({summary: '사장 회원가입', description: '사장 회원가입'})
  @ApiBody({ type: CreateSajangDTO })
  async registerSajang() {}

  // 이메일 중복확인
  async checkEmailUnique() {
    
  }

  // 이메일 본인인증, 토큰인증
  async checkEmailToken() {}

  // 아이디 중복확인
  async checkIDUnique() {}

  // 리프레시 토큰 검증
  async checkRefreshToken() {}

  // 아이디 찾기
  async findIDWithEmail() {}

  // 비밀번호 찾기이자 변경
  async findPWDWithEmail() {}
}
