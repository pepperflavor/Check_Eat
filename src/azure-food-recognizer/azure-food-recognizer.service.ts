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
import { CacheService } from 'src/cache/cache.service';
import { v4 as uuidv4 } from 'uuid';
import { TranslateService } from 'src/translate/translate.service';
import { PrismaService } from 'src/prisma.service';
import { Candidate, LlmResult } from './types/llm-types';
import { VeganJudgeResult } from './types/vegan-judge-type';

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
  async inferAndCache(file: Express.Multer.File, sa_id: number) {
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
    // 항목 수/ 길이 제한
    const normalized = Array.from(
      new Set(
        ingredients
          .map((s) => String(s).trim())
          .filter(Boolean)
          .slice(0, 50) // 최대 50개
          .map((s) => (s.length > 50 ? s.slice(0, 50) : s)),
      ),
    );

    // 소유 검증
    const food = await this.prisma.food.findUnique({
      where: { foo_id },
      select: { foo_id: true, foo_sa_id: true, foo_name: true },
    });
    if (!food) throw new BadRequestException('Food not found');
    if (food.foo_sa_id !== saId)
      throw new ForbiddenException('권한이 없습니다.');

    // 1) 비건 단계 LLM 판정
    const veganJudgment = await this.classifyVeganByIngredientsLLM(normalized);
    let dbVegId: number | null = null;

    if (veganJudgment?.veg_id && veganJudgment.veg_id > 0) {
      const exists = await this.prisma.vegan.findUnique({
        where: { veg_id: veganJudgment.veg_id },
        select: { veg_id: true },
      });
      if (exists) {
        dbVegId = veganJudgment.veg_id;
      }
    }

    // 트랜잭션으로 업데이트 + 번역 upsert
    await this.prisma.$transaction(async (tx) => {
      await tx.food.update({
        where: { foo_id },
        data: { foo_material: normalized, foo_vegan: dbVegId },
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

    return {
      message: '음식 재료 저장 성공',
      status: 'success',
      foo_id,
      vegan: {
        judged: veganJudgment?.veg_id == 0 ? '비건이 아닙니다' : dbVegId,
        stored: dbVegId, // null이면 비건 아님으로 저장됨
      },
    };
  }

  //======  비건단계 추론

  // 비건 판별 프롬프트
  private veganSystemPrompt(): string {
    return `
        너는 전세계 식재료를 아는 분류 전문가다. 입력되는 "재료 목록(한글)"을 근거로
        다음 베지테리언 단계(veg_id)를 엄격하게 판정하라.
        
        단계 정의(veg_id):
        0 = 어느 베지테리언 단계도 아님(붉은고기/젤라틴/코치닐/벌꿀 등 비건 불가 재료 포함 시 0)
        1 = 폴로 베지테리언: 가금류 허용, 어패류/붉은고기 금지. 달걀/유제품 허용 가능.
        2 = 페스코 베지테리언: 어패류 허용, 가금류 금지. 달걀/유제품 허용 가능. 붉은고기 금지.
        3 = 락토 오보: 유제품 + 달걀 허용, 가금류/어패류/붉은고기 금지.
        4 = 오보: 달걀만 허용, 유제품/가금류/어패류/붉은고기 금지.
        5 = 락토: 유제품만 허용, 달걀/가금류/어패류/붉은고기 금지.
        6 = 비건: 동물성 유래 전부 금지(유제품/달걀/가금류/어패류/붉은고기/젤라틴/코치닐/벌꿀 등 금지).
        
        카테고리별 한글 키워드(부분일치 허용, 예: "닭다리" → "닭"):
        - red_meat: 소고기, 쇠고기, 돼지고기, 양고기, 사슴고기, 차돌박이, 삼겹살, 갈비, 불고기, 제육, 꼬리곰탕, 육수(소/돼지), 사골, 돈가스
        - poultry: 닭고기, 닭, 닭다리, 닭발, 닭육수, 오리, 오리고기, 칠면조
        - seafood: 생선, 고등어, 연어, 참치, 명태, 대구, 멸치, 새우, 오징어, 문어, 낙지, 홍합, 조개, 게, 전복, 굴, 어묵, 액젓, 젓갈, 까나리액젓, 멸치액젓, fish sauce
        - egg: 달걀, 계란, 메추리알, 마요네즈
        - dairy: 우유, 치즈, 버터, 크림, 생크림, 연유, 요거트, 유청, 아이스크림, 분유
        - nonvegan: 꿀, 벌꿀, 젤라틴, 코치닐, 카민, 사향, 어유
        
        분류 규칙(우선순위 높은 것부터 적용):
        1) red_meat 또는 nonvegan 재료가 1개라도 있으면 → veg_id = 0
        2) poultry 재료가 1개라도 있으면 → veg_id = 1
        3) seafood 재료가 1개라도 있으면 → veg_id = 2   (단, poultry가 있으면 1이 우선)
        4) dairy와 egg가 모두 존재 → veg_id = 3
        5) egg만 존재 → veg_id = 4
        6) dairy만 존재 → veg_id = 5
        7) 위 동물성 카테고리에 해당이 전혀 없으면 → veg_id = 6 (완전 비건)
        
        반드시 아래 JSON 스키마로만 엄격하게 출력하라.
          `;
  }

  // LLM JSON 스키마 (내부 유틸)
  private veganJudgeSchema() {
    return {
      type: 'object',
      properties: {
        veg_id: { type: 'integer', enum: [0, 1, 2, 3, 4, 5, 6] },
        matched: {
          type: 'object',
          additionalProperties: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        reasoning: { type: 'string' },
      },
      required: ['veg_id', 'matched', 'reasoning'],
      additionalProperties: false,
    };
  }

  private async classifyVeganByIngredientsLLM(
    ingredients: string[],
  ): Promise<VeganJudgeResult> {
    const list = Array.isArray(ingredients)
      ? ingredients.map((s) => String(s).trim()).filter(Boolean)
      : [];

    const schema = this.veganJudgeSchema();
    const userPrompt =
      `재료 목록(JSON 배열): ${JSON.stringify(list)}\n` +
      `위 정의/규칙을 적용해 veg_id를 하나로 결정하라.`;

    const call = async (client: AzureOpenAI, model: string) => {
      const resp = await client.chat.completions.create({
        messages: [
          { role: 'system', content: this.veganSystemPrompt() },
          { role: 'user', content: userPrompt },
        ],
        model,
        temperature: 0.0,
        max_tokens: 400,
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'VeganJudge', schema, strict: true },
        } as any,
      });
      const content = resp.choices?.[0]?.message?.content ?? '{}';
      return JSON.parse(content) as VeganJudgeResult;
    };

    try {
      return await call(this.miniClient, this.miniModel);
    } catch {
      try {
        return await call(this.fourOClient, 'gpt-4o');
      } catch {
        return { veg_id: 0, matched: {}, reasoning: 'LLM 판정 실패' };
      }
    }
  }

  public async judgeVeganByIngredients(
    ingredients: string[],
  ): Promise<VeganJudgeResult> {
    return this.classifyVeganByIngredientsLLM(ingredients);
  }
}
