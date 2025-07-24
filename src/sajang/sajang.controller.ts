import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { SajangService } from './sajang.service';
import { ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { BusinessRegistrationDTO } from './sajang_dto/business_registration.dto';

@Controller('sajang')
export class SajangController {
  constructor(private readonly sajangService: SajangService) {}

  // 음식 사진 찍으면 재료명 추출해 주기
  @Post('recommend-meterials')
  async recommendMeterials() {
    return await this.sajangService.recommendMeterials();
  }

  // 음식 등록
  @Post('regist-food')
  async registFood() {
    return await this.sajangService.registFood();
  }

  // 음식 삭제
  @Post('delete-food')

  // 할랄 업장 인증
  @Post('regist-halal')
  async registHalal() {}

  // 사업자 등록증 등록
  @Post('regist-certification')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '사장님이 정보 수정후 취합해서 요청보내기',
    description: '사업자 등록 진위여부 - 국세청으로 요청보내는 곳',
  })
  async registCertification(@Req() req, @Body() body:BusinessRegistrationDTO) {
    // 사장님은 토큰에 사장 아이디 들어있음
    const sajangID = req.user.sa_id;
    const result = await this.sajangService.checkBusinessRegistration(sajangID, body);
    return result;
  }

  // 사업자 등록증 진위 여부 확인, post 로만 제공
  @Post('check-business-registration')
  async checkBusinessRegistration() {}

  @Post('delete-store')
  @ApiOperation({ summary: '가게 삭제', description: '가게삭제' })
  @UseGuards(JwtAuthGuard)
  async deleteStore(@Req() req) {
    const sa_id = req.user.sa_id;
    const result = await this.sajangService.editStoreState(sa_id, 2);
    return result;
  }
}
