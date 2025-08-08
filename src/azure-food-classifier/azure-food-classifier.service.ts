import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { foodClassifierModels } from './types/food-models';
import axios from 'axios';

@Injectable()
export class AzureFoodClassifierService {
  private endpoint: string;
  private predictionKey: string;

  constructor(private readonly config: ConfigService) {
    this.endpoint = this.config.get<string>(
      'AZURE_PREDICT_FOOD_NAME_ENDPOINT',
    )!;
    this.predictionKey = this.config.get<string>(
      'AZURE_PREDICT_FOOD_NAME_KEY1',
    )!;
  }

  async predictFromAllModels(file: Express.Multer.File) {
    const headers = {
      'Content-Type': 'application/octet-stream',
      'Prediction-Key': this.predictionKey,
    };

    const results = await Promise.allSettled(
      foodClassifierModels.map(async (model) => {
        const url = `${this.endpoint}customvision/v3.0/Prediction/${model.projectId}/classify/iterations/${model.iterationName}/image`;
        const res = await axios.post(url, file.buffer, { headers });
        return {
          model: model.name,
          predictions: res.data.predictions,
        };
      }),
    );

    const valid = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<any>).value);

    // ✅ 각 모델의 예측 결과 로그 출력
    for (const result of valid) {
      console.log(`\n🔍 모델: ${result.model}`);
      result.predictions.forEach((pred: any) => {
        console.log(
          `  - ${pred.tagName}: ${(pred.probability * 100).toFixed(2)}%`,
        );
      });
    }

    let best = { tagName: '', probability: 0, model: '' };
    for (const result of valid) {
      const top = result.predictions.sort(
        (a, b) => b.probability - a.probability,
      )[0];
      if (top.probability > best.probability) {
        best = { ...top, model: result.model };
      }
    }

    if (best.probability < 0.2) {
      console.warn('⚠️ 모든 모델이 확률 0.2 미만이므로 null 반환');
      return { food: null, confidence: best.probability, model: best.model };
    }

    return {
      food: best.tagName,
      confidence: best.probability,
      model: best.model,
    };
  }
}
