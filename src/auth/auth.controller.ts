import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBody, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { CreateUserDTO } from 'src/user/user_dto/create-user.dto';
import { CreateSajangDTO } from 'src/sajang/sajang_dto/create-sajang.dto';
import { CommonLoginDTO } from './dto/common-login.dto';
import { JwtAuthGuard } from './jwt.guard';
import { CommonAccountService } from 'src/common-account/common-account.service';
import { CheckEmailToken } from './dto/email-token-check.dto';
import { SendEmailTokenDTO } from './dto/email-token-send.dto';
import { EmailUniqueDto } from './dto/email-unique.dto';
import { FindAccountTokenVerifyDto } from './dto/find-id.dto';
import { CurrentUser } from './decorator/current-user.decorator';
import { FindIDSendTokenDto } from './dto/find-id-sendtoken.dto';
import { UpdatePWDDto } from './dto/pwd-update.dto';
import { FindPWDSendTokenDto } from './dto/find-pwd-sendtoken.dto';

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
  async registerUser(@Body() body: CreateUserDTO) {
    return await this.authService.signUpUser(body);
  }

  // 사장 회원가입, 사업자 등록증 데이터를 받아야 해서 엔드포인트 분리함
  // sajang.service에 로직 분리
  @Post('signup/sajang')
  @ApiOperation({ summary: '사장님 회원가입', description: '사장님 회원가입' })
  @ApiBody({ type: CreateSajangDTO })
  async registerSajang(@Body() body: CreateSajangDTO) {
    return await this.authService.signUpSajang(body);
  }

  // 로그인
  // status 2 이면 로그인 안됨, 탈퇴한 회원
  @Post('login')
  @ApiOperation({ summary: '로그인', description: '로그인' })
  async signInCommon(@Body() body: CommonLoginDTO) {
    return await this.authService.login(body.ld_log_id, body.ld_pwd);
  }

  // 회원가입시 - 이메일 중복확인
  @ApiOperation({
    summary: '회원가입시 - 이메일 중복확인',
    description: '회원가입시 - 이메일 중복확인',
  })
  @Post('check-email-unique')
  async checkEmailUnique(@Body() body: EmailUniqueDto) {
    console.log(body.email);
    return await this.commonService.isExistEmail(body.email);
  }

  // 이메일로 토큰 발송
  @Post('send-email-token')
  @ApiOperation({
    summary: '이메일 본인인증 - 토큰발송',
    description: '이메일 본인인증 - 토큰발송',
  })
  async sendEmailToken(@Body() body: SendEmailTokenDTO) {
    return await this.authService.requestEmailVerification(
      body.email,
      0,
      body.language,
    );
  }

  // 이메일 본인인증 - 토큰검증하기
  @Post('check-email-token')
  @ApiOperation({
    summary: '회원가입시 이메일 본인인증 - 토큰 검증',
    description: '회원가입시 이메일 본인인증 - 토큰 검증',
  })
  async checkEmailToken(@Body() body: CheckEmailToken) {
    return await this.commonService.verifyEmailToken(body.email, body.token, 0);
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

  // 회원 탈퇴
  @ApiOperation({ summary: '회원 탈퇴', description: '회원 탈퇴' })
  @UseGuards(JwtAuthGuard)
  @Post('delete-account')
  async deleteUser(@Req() req) {
    const accountId = req.user.sub;
    return await this.authService.deleteAccount(accountId);
  }

  // 마이 페이지에서 비밀번호 바꾸기
  // 일단 애니로ㅎㅎㅎ
  @Post('change-pwd')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '헤더에 토큰, body에 바꿀 비밀번호 보내주면 됩니다.',
    description: '마이페이지에서 비밀번호 바꾸기',
  })
  async changePWDCommon(@CurrentUser() user: any, @Body() body: UpdatePWDDto) {
    const accountID = user.sub;
    return await this.authService.updatePwd(accountID, body.newPwd);
  }

  ///////======= 로그인하지 않은 상태
  // 아이디 찾기 시작
  @Post('find-id-sendtoken')
  @ApiOperation({
    summary: '이메일주소, 유저가 설정한 언어 같이 보내줘야함',
    description: '로그인 하지 않은 상태에서 아이디 찾기 - 토큰발송',
  })
  // 토큰에서 사용하는 언어 추출해서 변경해주기
  async findIDWithEmail(@Body() body: FindIDSendTokenDto) {
    // 이메일 가입한 이력이 있는 이메일인지 확인
    const isExistEmail = await this.commonService.isExistEmail(body.email);
    if (isExistEmail.status == HttpStatus.CONFLICT) {
      await this.authService.requestEmailVerification(
        body.email,
        1,
        body.language,
      );
    } else {
      return {
        message: '가입한 이력이 없는 이메일입니다.',
        status: 'false',
      };
    }
  }

  @Post('find-id-verify-token')
  @ApiOperation({
    summary: '토큰 받은 이메일, 이메일로 받은 검증 코드 보내주면 됌',
    description: '아이디 찾기로 발송한 토큰 검증',
  })
  async findIDVerifyToken(@Body() body: FindAccountTokenVerifyDto) {
    return await this.commonService.verifyEmailToken(body.email, body.token, 1);
  }

  // 비밀번호 찾기이자 변경
  // 이메일 토큰 발송
  @Post('change-pwd')
  @ApiOperation({
    summary: '비밀번호 찾기이자 변경을 위한 이메일 발송',
    description: '비밀번호 찾기를 위한 이메일 토큰발송',
  })
  async findPWDWithEmail(@Body() body: FindPWDSendTokenDto) {
    // 가입한 아이디가 맞는지 먼저 확인해주기
    const result = await this.commonService.isExistID(body.log_id);

    if (result.status == HttpStatus.OK) {
      return {
        message: '해당 아이디로 가입한 이력이 없습니다.',
        status: false,
      };
    }

    await this.authService.requestEmailVerification(
      body.email,
      2,
      body.language,
    );
  }

  @ApiOperation({
    summary: '비밀번호 찾기로 발송한 토큰 검증, 이메일, 인증코드 보내줘야함',
    description: '비밀번호 찾기를 위한 이메일 토큰검증',
  })
  @Post('find-pwd-verify-token')
  async findPWDVerifyToken(@Body() body: FindAccountTokenVerifyDto) {
    return await this.commonService.verifyEmailToken(body.email, body.token, 2);
  }
}
