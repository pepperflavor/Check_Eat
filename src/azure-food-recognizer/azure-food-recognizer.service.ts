// azure-food-recognizer/azure-food-recognizer.service.ts
import {
  Injectable,
  ForbiddenException,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AzureOpenAI } from 'openai';
import { AzureFoodClassifierService } from '../azure-food-classifier/azure-food-classifier.service';
import { FoodStorageService } from '../azure-storage/food-storage.service';
import { PrismaClient } from '@prisma/client';
import { CacheService } from 'src/cache/cache.service';
import { v4 as uuidv4 } from 'uuid';
import { TranslateService } from 'src/translate/translate.service';
import { PrismaService } from 'src/prisma.service';
import { Candidate, LlmResult } from './types/llm-types';

@Injectable()
export class AzureFoodRecognizerService {
  private readonly threshold: number;
  private readonly container: string;
  private readonly cacheTtlSec: number;

  // 4o-mini
  private miniClient: AzureOpenAI;
  private miniDeployment: string;
  private miniModel: string;

  // 4o
  private fourOClient: AzureOpenAI;
  private fourODeployment: string;

  constructor(
    private readonly config: ConfigService,
    private readonly classifier: AzureFoodClassifierService,
    private readonly storage: FoodStorageService,
    private readonly cache: CacheService,
    private readonly translate: TranslateService,
    private readonly prisma: PrismaService,
  ) {
    this.threshold = Number(
      this.config.get('FOOD_CONF_THRESHOLD') ??
        this.config.get('AZURE_FOOD_THRESHOLD') ??
        0.7,
    );

    this.container = this.config.get<string>('FOOD_CONTAINER', 'foods');
    this.cacheTtlSec = Number(this.config.get('FOOD_IMAGE_CACHE_TTL') ?? 600);

    // ---- GPT‑4o mini ----
    this.miniClient = new AzureOpenAI({
      endpoint: this.config.get<string>('AZURE_4MINI_OPENAI_ENDPOINT', ''),
      apiKey: this.config.get<string>('AZURE_4MINI_KEY', ''),
      apiVersion: this.config.get<string>('AZURE_4MINI_VERSION', ''),
      deployment: this.config.get<string>('AZURE_4MINI_DEPLOYMENT', ''),
    });
    this.miniDeployment = this.config.get<string>('AZURE_4MINI_DEPLOYMENT', '');
    this.miniModel = this.config.get<string>(
      'AZURE_4MINI_MODELNAME',
      'gpt-4o-mini',
    );

    // ---- GPT‑4o ----
    this.fourOClient = new AzureOpenAI({
      endpoint: this.config.get<string>('AZURE_4O_OPENAI_ENDPOINT', ''),
      apiKey: this.config.get<string>('AZURE_4O_OPENAI_KEY', ''),
      apiVersion: this.config.get<string>('AZURE_4O_API_VERSION', ''),
      deployment: this.config.get<string>('AZURE_4O_DEPLOYMENT', ''),
    });
    this.fourODeployment = this.config.get<string>('AZURE_4O_DEPLOYMENT', '');
  }

  /** 토큰에서 업주 권한/sa_id 확인 */
  private async assertOwner(saId: any) {
    const isExist = await this.prisma.sajang.findUnique({
      where: { sa_id: saId },
    });
    if (!isExist || !saId) {
      throw new ForbiddenException('업주 권한이 필요합니다.');
    }
    return { saId: Number(saId) };
  }

  // ===== Redis 캐시 헬퍼 =====

  private async putImageToCache(
    buffer: Buffer,
    mime: string,
    saId: number,
    predictedLabel: string,
  ): Promise<string> {
    const UUID = uuidv4();
    const key = `foodimg:${UUID}`;
    const value = JSON.stringify({
      buffer: buffer.toString('base64'),
      mime,
      saId,
      predictedLabel,
    });
    await this.cache.set(key, value, this.cacheTtlSec);
    return key;
  }

  // 캐싱해뒀던 이미지 갖고오기
  private async getImageFromCache(cacheId: string): Promise<{
    buffer: Buffer;
    mime: string;
    saId: number;
    predictedLabel?: string;
  } | null> {
    const key = cacheId.startsWith('foodimg:') ? cacheId : `foodimg:${cacheId}`;
    const raw = await this.cache.get(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      buffer: string;
      mime: string;
      saId: number;
      predictedLabel?: string;
    };
    return {
      buffer: Buffer.from(parsed.buffer, 'base64'),
      mime: parsed.mime,
      saId: parsed.saId,
      predictedLabel: parsed.predictedLabel,
    };
  }

  // 애저에 저장하고 캐시 삭제
  private async delImageCache(cacheId: string) {
    const key = cacheId.startsWith('foodimg:') ? cacheId : `foodimg:${cacheId}`;
    await this.cache.del(key);
  }

  //======================================

  /** 1~6단계: 이미지 추론만 수행 (저장은 프론트 '확인' 시) */
  async inferAndCache(file: Express.Multer.File, sa_id: any) {
    const { saId } = await this.assertOwner(sa_id);
    if (!file?.buffer?.length)
      throw new BadRequestException('file is required');

    // 1) Custom Vision로 음식명 추론
    const cv = await this.classifier.predictFromAllModels(file);
    if (cv.accepted) {
      const cacheId = await this.putImageToCache(
        file.buffer,
        file.mimetype || 'image/jpeg',
        saId,
        cv.label!,
      );
      return {
        status: 'ok' as const,
        source: 'cv' as const,
        label: cv.label!,
        confidence: cv.confidence,
        cacheId,
        expiresInSec: this.cacheTtlSec,
      };
    }

    // 2) 4o-mini
    const mini = await this.callLLM(
      this.miniClient,
      this.miniDeployment,
      this.miniModel,
      file,
    );
    if (mini.confidence >= this.threshold) {
      const cacheId = await this.putImageToCache(
        file.buffer,
        file.mimetype || 'image/jpeg',
        saId,
        mini.label,
      );
      return {
        status: 'ok' as const,
        source: '4o-mini' as const,
        label: mini.label,
        confidence: mini.confidence,
        cacheId,
        expiresInSec: this.cacheTtlSec,
      };
    }

    // 3) 4o
    const fourO = await this.callLLM(
      this.fourOClient,
      this.fourODeployment,
      'gpt-4o',
      file,
    );
    if (fourO.confidence >= this.threshold) {
      const cacheId = await this.putImageToCache(
        file.buffer,
        file.mimetype || 'image/jpeg',
        saId,
        fourO.label,
      );
      return {
        status: 'ok' as const,
        source: '4o' as const,
        label: fourO.label,
        confidence: fourO.confidence,
        cacheId,
        expiresInSec: this.cacheTtlSec,
      };
    }

    // 실패
    return { status: 'false' as const, message: '사진으로 음식명 추론 실패' };
  }

  /**
   * [엔드포인트2] 캐시된 이미지로 저장
   * - body: { cacheId, foodName }
   * - 토큰 saId와 캐시 saId 일치 검증 후 저장 + 캐시 삭제
   */
  // 기존: async saveFromCache(cacheId: string, foodName: string, reqUser: any)
  async saveFromCache(
    cacheId: string,
    sa_id: number,
    opts: { ok?: string; foodName?: string }, // ✅ 인터페이스 변경
  ) {
    const { ok, foodName } = opts;
    if (!cacheId) throw new BadRequestException('cacheId is required');

    const { saId } = await this.assertOwner(sa_id);

    const cached = await this.getImageFromCache(cacheId);
    if (!cached) throw new BadRequestException('cache expired or not found');
    if (cached.saId !== saId)
      throw new ForbiddenException('권한이 없습니다(소유자 불일치).');

    // ✅ 최종 저장할 이름 결정
    let finalName: string | undefined;
    if (typeof ok === 'string' && ok.toLowerCase() === 'ok') {
      finalName = cached.predictedLabel; // ok면 예측값 사용
    } else if (typeof foodName === 'string' && foodName.trim().length > 0) {
      finalName = foodName.trim(); // 아니면 사용자가 입력한 값
    }

    if (!finalName) {
      throw new BadRequestException(
        'either ok="ok" or foodName must be provided',
      );
    }

    // Blob + DB 저장
    const fileLike: Express.Multer.File = {
      fieldname: 'file',
      originalname: `${finalName}_${saId}.bin`,
      encoding: '7bit',
      mimetype: cached.mime,
      size: cached.buffer.length,
      buffer: cached.buffer,
      stream: undefined as any,
      destination: undefined as any,
      filename: undefined as any,
      path: undefined as any,
    };
    const result = await this.saveToStorageAndDB(finalName, saId, fileLike);

    await this.delImageCache(cacheId);
    return result;
  }

  // ================== 내부 유틸 ==================

  /** LLM 호출 (이미지 버퍼 → data URL) */
  private async callLLM(
    client: AzureOpenAI,
    deployment: string,
    modelName: string,
    file: Express.Multer.File,
  ): Promise<LlmResult> {
    const b64 = file.buffer.toString('base64');
    const dataUrl = `data:${file.mimetype || 'image/jpeg'};base64,${b64}`;

    const schema = {
      name: 'FoodGuess',
      schema: {
        type: 'object',
        properties: {
          primary: { type: 'string' },
          candidates: {
            type: 'array',
            maxItems: 3,
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                confidence: { type: 'number' },
                rationale: { type: 'string' },
              },
              required: ['name', 'confidence'],
              additionalProperties: false,
            },
          },
        },
        required: ['primary', 'candidates'],
        additionalProperties: false,
      },
      strict: true,
    };

    try {
      const resp = await client.chat.completions.create({
        messages: [
          {
            role: 'system',
            content:
              'You are a food image analyst. Return STRICT JSON per schema.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '사진 속 대표 음식명을 식별하고 JSON으로만 답해.',
              },
              { type: 'image_url', image_url: { url: dataUrl } },
              {
                type: 'text',
                text: '최대 3개 후보, 각 confidence(0~1), 근거 포함. 불확실하면 unknown.',
              },
            ] as any,
          },
        ],
        model: modelName, // (Azure는 deployment 기준이지만 명시해도 무해)
        temperature: 0.2,
        max_tokens: 1024,
        response_format: { type: 'json_schema', json_schema: schema } as any,
      });

      const content = resp.choices?.[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(content);
      const candidates: Candidate[] = parsed?.candidates ?? [];
      const confidence = candidates[0]?.confidence ?? 0;

      return {
        label: parsed?.primary ?? 'unknown',
        confidence,
        candidates,
        raw: resp,
      };
    } catch (e: any) {
      throw new HttpException(
        `Azure OpenAI 호출 실패(${deployment}): ${e?.response?.status || e?.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /** Storage 업로드 + Food 테이블 insert (파일명: {foodName}_{sa_id}.{ext}) */
  private async saveToStorageAndDB(
    foodName: string,
    saId: number,
    file: Express.Multer.File,
  ) {
    // 0) 사장 FK 사전 검증 (예외로 통일)
    const owner = await this.prisma.sajang.findUnique({
      where: { sa_id: saId },
    });
    if (!owner) {
      throw new BadRequestException(`Sajang(sa_id=${saId}) not found`);
    }

    let ext = (file.mimetype?.split('/')[1] || 'jpg').toLowerCase();
    if (ext === 'jpeg') ext = 'jpg';
    const customFileName = `${foodName}_${saId}.${ext}`;

    // 1) Blob 업로드
    const { url } = await this.storage.upload(
      { ...file, originalname: customFileName },
      this.container,
    );

    try {
      // 2) Food 생성
      const created = await this.prisma.food.create({
        data: {
          foo_name: foodName,
          foo_price: 0,
          foo_img: url,
          foo_sa_id: saId,
        },
        select: {
          foo_id: true,
          foo_name: true,
          foo_img: true,
          foo_sa_id: true,
        },
      });

      // 3) 음식명 번역 → EN/AR upsert (배열은 빈 배열로 초기화)
      try {
        const resp = await this.translate.translateMany(
          foodName,
          ['en', 'ar'],
          'ko',
        );
        const translations: Array<{ text: string; to: string }> =
          resp?.[0]?.translations ?? [];

        const enName =
          translations.find((t) => t.to === 'en')?.text?.trim() || null;
        const arName =
          translations.find((t) => t.to === 'ar')?.text?.trim() || null;

        await this.prisma.foodTranslateEN.upsert({
          where: { food_id: created.foo_id },
          update: { ...(enName ? { ft_en_name: enName } : {}) },
          create: {
            food_id: created.foo_id,
            ft_en_name: enName,
            ft_en_mt: [], // ✅ 안전하게 초기화
            ft_en_price: null,
          },
        });

        await this.prisma.foodTranslateAR.upsert({
          where: { food_id: created.foo_id },
          update: { ...(arName ? { ft_ar_name: arName } : {}) },
          create: {
            food_id: created.foo_id,
            ft_ar_name: arName,
            ft_ar_mt: [], // ✅ 안전하게 초기화
            ft_ar_price: null,
          },
        });
      } catch (trErr) {
        console.error(
          '[Food name translate failed]',
          trErr?.response?.data || trErr?.message,
        );
      }

      return { url, record: created };
    } catch (e) {
      // 4) DB 실패 시 Blob 보상 삭제
      try {
        await this.storage.delete(url, this.container);
      } catch {}
      throw e;
    }
  }

  //=================재료 추측 로직 시작

  // --- JSON 스키마로 LLM 호출하는 유틸 (텍스트 전용) ---
  private async callLLMJson(
    client: AzureOpenAI,
    modelName: string,
    systemPrompt: string,
    userPrompt: string,
    schema: any,
  ) {
    const resp = await client.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: modelName,
      temperature: 0.2,
      max_tokens: 800,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'RESP', schema, strict: true },
      } as any,
    });
    const content = resp.choices?.[0]?.message?.content ?? '{}';
    return JSON.parse(content);
  }

  // --- [새] 1) foo_id 기준 재료 추천 ---
  async predictMaterials(foo_id: number, sa_id: any) {
    const { saId } = await this.assertOwner(sa_id);

    // Food 소유 검증 + 이름 확보
    const food = await this.prisma.food.findUnique({
      where: { foo_id },
      select: { foo_id: true, foo_name: true, foo_sa_id: true },
    });
    if (!food) throw new BadRequestException('Food not found');
    if (food.foo_sa_id !== saId)
      throw new ForbiddenException('권한이 없습니다.');

    const systemPrompt = `You are a culinary expert. Output a concise list of common ingredients for the dish. Do not include quantities or steps.`;
    const userPrompt = `
    List the common ingredients for the following food: "${food.foo_name}"
    - Ingredients must be written **only in Korean** (no English, no parentheses, no translations, no quantities, no units)
    - Include between 5 and 20 items
    - Remove duplicates
    - Absolutely do not include translations in other languages
    - Example: ["단호박", "설탕", "소금", "버터"]
    `;

    //     `Dish name: "${food.foo_name}".
    // Return 8~16 generic ingredients (e.g., "rice", "soy sauce", "garlic").
    // Only JSON per schema.`;

    const schema = {
      type: 'object',
      properties: {
        ingredients: {
          type: 'array',
          items: { type: 'string' },
          minItems: 5,
          maxItems: 20,
        },
      },
      required: ['ingredients'],
      additionalProperties: false,
    };

    // 4o-mini → 필요 시 4o
    let parsed: { ingredients?: string[]; notes?: string } | null = null;
    try {
      parsed = await this.callLLMJson(
        this.miniClient,
        this.miniModel,
        systemPrompt,
        userPrompt,
        schema,
      );
    } catch {}
    if (!parsed?.ingredients?.length) {
      parsed = await this.callLLMJson(
        this.fourOClient,
        'gpt-4o',
        systemPrompt,
        userPrompt,
        schema,
      );
    }

    // 중복/공백 정리
    const ingredients = Array.from(
      new Set((parsed?.ingredients ?? []).map((s) => s.trim()).filter(Boolean)),
    );

    return {
      status: 'ok' as const,
      foo_id,
      foodName: food.foo_name,
      ingredients,
    };
  }

  // --------- 재료 배열 저장---
  async saveMaterials(foo_id: number, ingredients: string[], sa_id: number) {
    const { saId } = await this.assertOwner(sa_id);

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      throw new BadRequestException('ingredients must be a non-empty array');
    }
    const normalized = Array.from(
      new Set(ingredients.map((s) => s.trim()).filter(Boolean)),
    );

    // 소유 검증
    const food = await this.prisma.food.findUnique({
      where: { foo_id },
      select: { foo_id: true, foo_sa_id: true, foo_name: true },
    });
    if (!food) throw new BadRequestException('Food not found');
    if (food.foo_sa_id !== saId)
      throw new ForbiddenException('권한이 없습니다.');

    // 트랜잭션으로 업데이트 + 번역 upsert
    await this.prisma.$transaction(async (tx) => {
      await tx.food.update({
        where: { foo_id },
        data: { foo_material: normalized },
      });

      // 번역
      const toLangs = ['en', 'ar'] as const;
      const translated = await this.translate.translateArray(
        normalized,
        toLangs as any,
        'ko',
      );
      const enList =
        translated['en']?.map((s) => s.trim()).filter(Boolean) ?? [];
      const arList =
        translated['ar']?.map((s) => s.trim()).filter(Boolean) ?? [];

      await tx.foodTranslateEN.upsert({
        where: { food_id: foo_id },
        update: { ft_en_mt: enList },
        create: {
          food_id: foo_id,
          ft_en_name: null,
          ft_en_mt: enList,
          ft_en_price: null,
        },
      });

      await tx.foodTranslateAR.upsert({
        where: { food_id: foo_id },
        update: { ft_ar_mt: arList },
        create: {
          food_id: foo_id,
          ft_ar_name: null,
          ft_ar_mt: arList,
          ft_ar_price: null,
        },
      });
    });

    // ✅ DB에서 바로 재조회해서 확정값 리턴
    const confirmed = await this.prisma.food.findUnique({
      where: { foo_id },
      select: {
        foo_id: true,
        foo_name: true,
        foo_material: true,
        foo_sa_id: true,
      },
    });

    return {
      message: '음식 재료 저장 성공', // 이제 실제 DB에 저장된 값
      status: 'success',
      foo_id: foo_id,
    };
  }
}
