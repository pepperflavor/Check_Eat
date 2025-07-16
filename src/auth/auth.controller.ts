import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBody, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { CreateUserDTO } from 'src/user/user_dto/create-user.dto';
import { CreateSajangDTO } from 'src/sajang/sajang_dto/create-sajang.dto';
import { CommonLoginDTO } from './dto/common-login.dto';
import { JwtAuthGuard } from './jwt.guard';
import { CommonAccountService } from 'src/common-account/common-account.service';
import { CheckEmailToken } from './dto/email-token-check.dto';
import { EmailService } from 'src/email/email.service';
import { SendEmailToken } from './dto/email-token-send.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly commonService: CommonAccountService,
  ) {}

  // 일반 유저 회원가입
  @Post('signup/user')
  @ApiOperation({
    summary: '개인 유저 회원가입',
    description: '개인 유저 회원가입',
  })
  @ApiBody({ type: CreateUserDTO })
  async registerUser(@Body() data: CreateUserDTO) {
    return await this.authService.signUpUser(data)
  }

  // 사장 회원가입, 사업자 등록증 데이터를 받아야 해서 엔드포인트 분리함
  // sajang.service에 로직 분리
  @Post('signup/sajang')
  @ApiOperation({ summary: '사장 회원가입', description: '사장 회원가입' })
  @ApiBody({ type: CreateSajangDTO })
  async registerSajang() {}

  // 로그인
  @Post('login')
  @ApiOperation({ summary: '로그인', description: '로그인' })
  async signInCommon(@Body() body: CommonLoginDTO) {
    await this.authService.login(body.ld_log_id, body.ld_pwd);
  }

  // 회원가입시 - 이메일 중복확인
  @ApiOperation({
    summary: '회원가입시 - 이메일 중복확인',
    description: '회원가입시 - 이메일 중복확인',
  })
  @Post('check-email-unique')
  async checkEmailUnique(@Body('email') email: string) {
    return await this.commonService.isExistEmail(email);
  }

  // 이메일로 토큰 발송
  @Post('send-email-token')
  @ApiOperation({
    summary: '이메일 본인인증 - 토큰발송',
    description: '이메일 본인인증 - 토큰발송',
  })
  async sendEmailToken(@Body() body: SendEmailToken) {
    return await this.authService.requestEmailVerification(body.email, body.language);
  }

  // 이메일 본인인증 - 토큰검증하기
  @Post('check-email-token')
  @ApiOperation({
    summary: '이메일 본인인증 - 토큰 검증',
    description: '이메일 본인인증 - 토큰 검증',
  })
  async checkEmailToken(@Body() body: CheckEmailToken) {
    return await this.commonService.verifyEmailToken(body.email, body.token);
  }

  // 회원가입 페이지 - 아이디 중복확인
  @Post('check-id-unique')
  @ApiOperation({
    summary: '회원가입시 - 아이디 중복확인',
    description: '회원가입시 - 아이디 중복확인',
  })
  async checkIDUnique(@Body('id') id: string) {
    return await this.commonService.isExistID(id);
  }

  // 리프레시 토큰 검증
  @Post('check-refresh-token')
  @ApiOperation({
    summary: '리프레시 토큰 검증',
    description: '리프레시 토큰 검증',
  })
  async checkRefreshToken() {}

  // 로그아웃
  @ApiOperation({ summary: '로그아웃', description: '로그아웃' })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout() {}

  // 탈퇴
  @ApiOperation({ summary: '회원 탈퇴', description: '회원 탈퇴' })
  @UseGuards(JwtAuthGuard)
  @Post('withdraw')
  async deleteUser() {}

  ///////  아이디 비번 까먹었을 때
  // 아이디 찾기
  @Post('find-id')
  @ApiOperation({ summary: '아이디 찾기', description: '아이디 찾기' })
  async findIDWithEmail(@Body() body) {
    // await this.authService.identityEmail()
  }

  // 비밀번호 찾기이자 변경
  async findPWDWithEmail() {}
}
