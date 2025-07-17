import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { TranslateService } from 'src/translate/translate.service';
import { CreateSajangDTO } from './sajang_dto/create-sajang.dto';

@Injectable()
export class SajangService {
  constructor(
    private readonly prisma: PrismaService,
    private transServcice: TranslateService,
  ) {}

  async checkBusinessRegistration() {
    throw new Error('Method not implemented.');
  }
  // 사장 회원가입
  async createSajang(data: CreateSajangDTO) {}

  // OCR 관련
  // 음식 사진 찍으면 재료명 추출해주기
  async recommendMeterials() {}

  // 사진에서 추출한 음식명에서 재료 추출 -> 대화형 ai로 꺼내옴
  async extractIngredients(foodName: string) {
    // 대화형 AI를 사용하여 재료 추출
    // 예시로 간단한 문자열 분리 사용
    const materials = foodName.split(',').map((item) => item.trim());
    return materials;
  }

  // 음식 등록 -> 등록하면 이때 번역도 해서 db에 저장
  async registFood() {}
}
