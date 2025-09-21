
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from 'src/prisma.service';
import { AzureFoodRecognizerService } from '../azure-food-recognizer.service';
import { CustomException } from 'src/common/errors/custom.exception';
import { ErrorCode } from 'src/common/errors/error-codes';
import { judgeVeganByRules } from '../utils/vegan';
import { reconcileVeganIds } from '../utils/vegan-reconcile';

@Processor('food-pipeline')
export class FoodPipelineProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly svc: AzureFoodRecognizerService,
  ) {}

  @Process({ name: 'finalize-food', concurrency: 3 })
  async finalizeFood(
    job: Job<{ cacheId: string; saId: number; ok?: string; foodName?: string }>,
  ) {
    const { cacheId, saId, ok, foodName } = job.data;
    const saved = await this.svc.saveFromCache(cacheId, saId, { ok, foodName });
    return saved;
  }

  // 비건 단계 추론 하기~
  @Process({ name: 'judge-vegan', concurrency: 5 })
  async judgeVegan(
    job: Job<{
      fooId: number;
      saId: number;
      ingredients: string[];
      persist?: boolean;
    }>,
  ) {
    const { fooId, saId, ingredients, persist } = job.data;

    const food = await this.prisma.food.findUnique({
      where: { foo_id: fooId },
      select: { foo_sa_id: true, foo_name: true },
    });

    if (!food)
      throw new CustomException(
        ErrorCode.DB_NOT_FOUND,
        `Food ${fooId} 음식 데이터가 없습니다.`,
      );

    // 내 규칙으로 판별한거
    const normalized = Array.from(
      new Set(ingredients.map((s) => String(s).trim()).filter(Boolean)),
    );
    const ruleVegId = judgeVeganByRules(normalized);

    const llm = await this.svc.judgeVeganByIngredients(ingredients, {
      fooId,
      saId,
      persistOnRetry: false,
    });

    const llmVegId = typeof llm?.veg_id === 'number' ? llm.veg_id : null;

    const finalVegId = reconcileVeganIds(ruleVegId, llmVegId);
    let stored: number | null = null;

    if (persist) {
      const exists =
        typeof finalVegId === 'number' && finalVegId > 0
          ? await this.prisma.vegan.findUnique({
              where: { veg_id: finalVegId },
              select: { veg_id: true },
            })
          : null;

      stored = exists ? finalVegId! : null;

      await this.prisma.food.update({
        where: { foo_id: fooId },
        data: { foo_vegan: stored },
      });
    }

    return {
      message: '비건 단계 판정 완료',
      status: 'success' as const,
      foo_id: fooId,
      vegan: {
        stored,
        rule: ruleVegId ?? null,
        llm: llmVegId ?? null,
        final: finalVegId ?? null,
      },
    };
  }
}
