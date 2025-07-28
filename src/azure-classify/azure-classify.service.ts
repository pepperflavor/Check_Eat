import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';

@Injectable()
export class AzureClassifyService {
  private readonly logger = new Logger(AzureClassifyService.name);
  private readonly predictionUrl;
  private readonly predictionKey;

  constructor(private readonly config: ConfigService) {
    this.predictionUrl = this.config.get('');
    this.predictionKey = this.config.get('');
  }

  async classifyImageFromBuffer(buffer: Buffer): Promise<string> {
    try {
      const { data } = await axios.post(this.predictionUrl, buffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Prediction-Key': this.predictionKey,
        },
      });

      const predictions = data.predictions;
      const topPrediction = predictions[0];

      this.logger.log(
        `🍲 Predicted: ${topPrediction.tagName} (${topPrediction.probability})`,
      );

      return topPrediction.tagName;
    } catch (error) {
      this.logger.error('❌ Error classifying image', error);
      throw error;
    }
  }
}
