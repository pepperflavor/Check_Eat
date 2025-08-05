import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';

@Injectable()
export class AzureClassifyService {
  private endpoint: string;
  private predictionKey: string;
  private projectId: string;
  private iterationName = 'Iteration 1'; // 또는 배포한 이름

  constructor(private readonly config: ConfigService) {
    this.endpoint = this.config.get('PREDICT_FOOD_NAME_ENDPOINT') as string;
    this.predictionKey = this.config.get<string>(
      'PREDICT_FOOD_NAME_KEY1',
    ) as string;
    this.projectId = this.config.get('AZURE_PROJECT_ID') as string;

    if (!this.endpoint || !this.predictionKey || !this.projectId) {
      throw new Error('Azure 환경변수가 누락되었습니다');
    }
  }

  async predictImage(file: Express.Multer.File) {
    const url = `${this.endpoint}customvision/v3.0/Prediction/${this.projectId}/classify/iterations/${this.iterationName}/image`;
  
    const headers = {
      'Content-Type': 'application/octet-stream',
      'Prediction-Key': this.predictionKey,
    };
  
    const response = await axios.post(url, file.buffer, { headers });
    return response.data.predictions;
  }
}
