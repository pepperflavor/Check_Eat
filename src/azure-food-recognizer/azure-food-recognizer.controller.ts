import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AzureFoodRecognizerService } from './azure-food-recognizer.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfirmCachedDto } from './dto/confirm-cache.dto';
import type { Request } from 'express';
import { PredictMtDto } from './dto/predict-mt.dto';
import { SaveMtDto } from './dto/save-mt.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

// 테스트용
type ReqUser = Request & {
  user?: { usergrade: number; sa_id?: number; ld_sa_id?: number };
  headers?: Record<string, any>;
};

// LLM
@Controller('azure-food-recognizer')
export class AzureFoodRecognizerController {
  constructor(
    private readonly azureFoodRecognizerService: AzureFoodRecognizerService,
  ) {}

  // /** 테스트 편의: JWT 미적용 시 헤더로 임시 주입 (prod에선 제거 가능) */
  // private ensureUser(req: ReqUser) {
  //   if (!req.user) {
  //     const ug = Number(req.headers?.['x-usergrade']);
  //     const sa = Number(req.headers?.['x-sa-id']);
  //     if (!Number.isNaN(ug) && !Number.isNaN(sa)) {
  //       // @ts-ignore
  //       req.user = { usergrade: ug, sa_id: sa };
  //     }
  //   }
  // }

  // CUstom-vision, LLM에 추론요청 보내기
  @Post('infer-file')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async inferFile(
    @Req() req, //: ReqUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // this.ensureUser(req);
    if (!file) throw new BadRequestException('file is required');
    return this.azureFoodRecognizerService.inferAndCache(file, req.user);
  }

  // 추론한 음식명 확정 및 음식사진 저장하기,
  @Post('confirm-cached')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '추론 결과 확정 및 저장',
    description:
      'ok="ok"이면 추론값으로 저장, 아니면 foodName으로 저장. 저장 시 Food 생성 + 이미지 업로드 + 이름 번역(EN/AR) upsert',
  })
  async confirmCached(
    @Req() req, //: ReqUser,
    @Body() body: ConfirmCachedDto,
  ) {
    // this.ensureUser(req);
    const sa_id = Number(req.user.sa_id);
    if (!body?.cacheId) throw new BadRequestException('cacheId is required');

    return this.azureFoodRecognizerService.saveFromCache(body.cacheId, sa_id, {
      ok: body.ok,
      foodName: body.foodName,
    });
  }

  @Post('predict-mt')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '재료명 추측', description: '한글 재료 배열 반환' })
  @ApiResponse({ status: 200, description: '재료 배열 반환' })
  async predictMeterial(
    @Req() req,
    // : ReqUser
    @Body() body: PredictMtDto,
  ) {
    // this.ensureUser(req);
    const sa_id = Number(req.user.sa_id);
    const foo_id = Number(body.foo_id);

    return this.azureFoodRecognizerService.predictMaterials(foo_id, sa_id);
  }

  @Post('save-mt')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '재료 저장 및 번역',
    description:
      'ingredients(string[])를 저장하고, 영어/아랍어 번역 배열을 FoodTranslate 테이블에 upsert',
  })
  async saveMeterial(
    @Req() req, //: ReqUser
    @Body() body: SaveMtDto,
  ) {
    // this.ensureUser(req);
    const sa_id = Number(req.user.sa_id);
    const foo_id = Number(body.foo_id);
    return this.azureFoodRecognizerService.saveMaterials(
      foo_id,
      body.ingredients,
      sa_id,
    );
  }
}
