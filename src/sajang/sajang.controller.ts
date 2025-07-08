import { Controller, Post } from '@nestjs/common';
import { SajangService } from './sajang.service';

@Controller('sajang')
export class SajangController {
  constructor(private readonly sajangService: SajangService) {}

  // 사업자 등록증 진위 여부 확인, post 로만 제공
  @Post('check-business-registration')
  async checkBusinessRegistration() {
    
  }
}
