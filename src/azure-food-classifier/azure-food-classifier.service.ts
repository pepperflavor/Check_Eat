import {
    Injectable,
    BadRequestException,
    InternalServerErrorException,
  } from '@nestjs/common';
  import { ConfigService } from '@nestjs/config';
  import axios from 'axios';
  import { foodClassifierModels } from './types/food-models';
  
  type AzurePrediction = {
    tagName: string;
    probability: number;
  };
  
  type ModelResult = {
    model: string;
    predictions: AzurePrediction[];
  };
  
  @Injectable()
  export class AzureFoodClassifierService {
    private readonly endpoint: string;
    private readonly predictionKey: string;
    private readonly threshold: number;
  
    constructor(private readonly config: ConfigService) {
      this.endpoint = this.ensureTrailingSlash(
        this.config.get<string>('AZURE_PREDICT_FOOD_NAME_ENDPOINT')!,
      );
      this.predictionKey = this.config.get<string>(
        'AZURE_PREDICT_FOOD_NAME_KEY1',
      )!;
      this.threshold = parseFloat(
        this.config.get<string>('AZURE_FOOD_THRESHOLD') ?? '0.6',
      );
    }
  
    private ensureTrailingSlash(url: string) {
      return url.endsWith('/') ? url : url + '/';
    }
  
    async predictFromAllModels(file: Express.Multer.File) {
      if (!file?.buffer?.length) {
        throw new BadRequestException('image file is required');
      }
  
      const headers = {
        'Content-Type': 'application/octet-stream',
        'Prediction-Key': this.predictionKey,
      };
  
      const axiosOpts = {
        headers,
        timeout: 10_000,
        // 5xx도 본문을 보고 로깅하려고 직접 처리
        validateStatus: (s: number) => s >= 200 && s < 500,
        maxContentLength: Infinity as unknown as number,
        maxBodyLength: Infinity as unknown as number,
      };
  
      const calls = foodClassifierModels.map(async (model) => {
        const url =
          `${this.endpoint}customvision/v3.0/Prediction/${model.projectId}` +
          `/classify/iterations/${model.publishedName}/image`;
  
        const res = await axios.post(url, file.buffer, axiosOpts);
  
        if (res.status >= 400) {
          // 서버/권한/요청 오류 로깅
          console.error(`[${model.name}] ${res.status}`, res.data);
          throw new Error(`[${model.name}] ${res.status} ${res.statusText}`);
        }
  
        const predictions = Array.isArray(res.data?.predictions)
          ? res.data.predictions
          : [];
  
        const safePreds: AzurePrediction[] = predictions.map((p: any) => ({
          tagName: String(p?.tagName ?? 'unknown'),
          probability: Number(p?.probability ?? 0),
        }));
  
        return {
          model: model.name,
          predictions: safePreds,
        } as ModelResult;
      });
  
      const settled = await Promise.allSettled(calls);
      const valids: ModelResult[] = settled
        .filter((r) => r.status === 'fulfilled')
        .map((r) => (r as PromiseFulfilledResult<ModelResult>).value);
  
      if (valids.length === 0) {
        const reasons = settled
          .filter((r) => r.status === 'rejected')
          .map(
            (r) => (r as PromiseRejectedResult).reason?.toString?.() || 'unknown',
          );
        console.error('Azure prediction failed:', reasons);
        throw new InternalServerErrorException('Prediction failed');
      }
  
      // 디버그 로그(선택)
      for (const r of valids) {
        const sorted = [...r.predictions].sort(
          (a, b) => b.probability - a.probability,
        );
        const top = sorted[0];
        console.log(
          `\n🔍 모델: ${r.model} (top: ${
            top?.tagName ?? 'none'
          } ${(top?.probability ?? 0) * 100}% )`,
        );
      }
  
      // 각 모델의 top1 중 전체 best
      let best = { tagName: 'unknown', probability: 0, model: '' };
      for (const r of valids) {
        const top = [...r.predictions].sort(
          (a, b) => b.probability - a.probability,
        )[0];
        if (top && top.probability > best.probability) {
          best = { ...top, model: r.model };
        }
      }
  
      const accepted = best.probability >= this.threshold;
  
      // 후보 합치기(원하면 N개만)
      const mergedPredictions = valids
        .flatMap((r) => r.predictions.map((p) => ({ ...p, model: r.model })))
        .sort((a, b) => b.probability - a.probability);
  
      return {
        food: accepted ? best.tagName : null,
        confidence: best.probability,
        threshold: this.threshold,
        model: best.model,
        candidates: mergedPredictions.slice(0, 10),
      };
    }
  }