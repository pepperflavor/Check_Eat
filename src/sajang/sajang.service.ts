import { Injectable } from '@nestjs/common';

@Injectable()
export class SajangService {
  async checkBusinessRegistration() {
    throw new Error('Method not implemented.');
  }

  // 사장 회원가입
  async createSajang(data) {}
}
