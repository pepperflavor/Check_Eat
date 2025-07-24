import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { SajangService } from './sajang.service';
import { ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@Controller('sajang')
export class SajangController {
  constructor(private readonly sajangService: SajangService) {}

  // 음식 사진 찍으면 재료명 추출해줌
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
  async registCertification() {
    const result = await this.sajangService.checkBusinessRegistration();
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
