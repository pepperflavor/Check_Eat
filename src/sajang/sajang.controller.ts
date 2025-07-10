import { Controller, Post } from '@nestjs/common';
import { SajangService } from './sajang.service';

@Controller('sajang')
export class SajangController {
  constructor(private readonly sajangService: SajangService) {}

  // 음식 등록
  @Post('regist-food')
  async registFood() {}

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
  async checkBusinessRegistration() {
    
  }
}
