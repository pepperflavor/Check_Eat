import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class FoodSeedService {
  private readonly logger = new Logger(FoodSeedService.name);
  private readonly apiKey;
  private readonly perPage = 100; // 한 번에 가져올 개수
  private readonly maxCount = 3000; // 가져올 총 레시피 수

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.apiKey = this.config.get('METERIAL_SEED_KEY');
  }

  // 특수문자 정제
  private cleanIngredientsText(input: string): string {
    return input
      .replace(/\[.*?\]/g, '') // [1인분]
      .replace(/•필수/g, '')
      .replace(/●/g, '')
      .replace(/주재료/g, '')
      .replace(/\(.*?\)/g, '') // (20g)
      .replace(/\n/g, ' ') // 줄바꿈 제거
      .trim();
  }
  //   @Cron('0 0 1 * *') // 매달 1일 00:00
  async seedRecipes() {
    this.logger.log('🔄 Starting recipe seed task...');

    const recipes: { name: string; ingredients: string[] }[] = [];

    for (let start = 1; start < this.maxCount; start += this.perPage) {
      const end = start + this.perPage - 1;
      const url = `https://openapi.foodsafetykorea.go.kr/api/${this.apiKey}/COOKRCP01/json/${start}/${end}`;

      try {
        const { data } = await axios.get(url);
        const rows = data.COOKRCP01?.row || [];

        for (const row of rows) {
          const name = row.RCP_NM?.trim();
          const rawIngredients = row.RCP_PARTS_DTLS || '';
          const cleaned = this.cleanIngredientsText(rawIngredients);
          const ingredients = cleaned
            .split(',')
            .map((i: string) => i.trim().split(' ')[0]) // "소갈비 600g" → "소갈비"
            .filter((i) => !!i && i.length > 1);

          if (name && ingredients.length > 0) {
            recipes.push({ name, ingredients });
          }
        }
      } catch (e) {
        this.logger.error(`❌ Error fetching from ${start} to ${end}`, e);
      }
    }

    // 기존 데이터 모두 삭제 후 덮어쓰기
    await this.prisma.foodMeterialSeed.deleteMany();
    await this.prisma.foodMeterialSeed.createMany({
      data: recipes.map((r) => ({
        foo_seed_name: r.name,
        foo_seed_ingredients: r.ingredients,
      })),
    });

    this.logger.log(`✅ Seeded ${recipes.length} recipes successfully.`);

    return {
      message: '재료, 시드데이터',
      status: 'success',
    };
  }
}
