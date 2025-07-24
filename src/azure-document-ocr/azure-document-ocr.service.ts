import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import DocumentIntelligence, {
  getLongRunningPoller,
  isUnexpected,
} from '@azure-rest/ai-document-intelligence';

@Injectable()
export class AzureDocumentOcrService {
  private readonly key: string;
  private readonly endpoint: string;
  private readonly modelId: string;

  constructor(private readonly config: ConfigService) {
    this.key = this.config.get<string>('OCR_KEY_SECOND') ?? '';
    this.endpoint = this.config.get<string>('OCR_ENDPOINT') ?? '';
    this.modelId = this.config.get<string>('CUSTOM_MODEL_ID_2') ?? '';
  }

  async analyzeImageUrl(imageUrl: string) {
    try {
      const client = DocumentIntelligence(this.endpoint, { key: this.key });
      const response = await client
        .path('/documentModels/{modelId}:analyze', this.modelId)
        .post({
          contentType: 'application/json',
          body: { urlSource: imageUrl },
        });

      if (isUnexpected(response)) {
        console.error('[OCR] 분석 실패');
        throw new InternalServerErrorException(response.body.error);
      }

      const document = await this.pollAndParse(client, response);
      return this.buildResult(document);
    } catch (error) {
      console.error('[Azure OCR] 분석 실패:', error);
      throw new InternalServerErrorException('Azure OCR 분석에 실패했습니다.');
    }
  }

  private async pollAndParse(
    client: ReturnType<typeof DocumentIntelligence>,
    response: any,
  ) {
    const poller = getLongRunningPoller(client, response);
    const pollResult: any = await poller.pollUntilDone();
    const result = pollResult.body.analyzeResult;
    const document = result?.documents?.[0];
    if (!document) {
      throw new Error('분석 결과에서 문서를 찾을 수 없습니다.');
    }
    return document;
  }

  // OCR 분석 결과 가공하는 함수
  private buildResult(document: any) {
    const fields = document.fields ?? {};
    const keysToExtract = [
      'b_no', // 등록번호
      'b_nm', // 법인명
      'p_nm', // 대표자
      'start_dt', // 개업일
      'b_adr', // 사업장 주소
      'corp_no', // 법인등록번호
      'b_sector', // 업태
      'b_type', // 종목
    ];

    const result: Record<string, string> = {};

    for (const key of keysToExtract) {
      const field = fields[key];
      if (field?.valueString) {
        result[key] = field.valueString;
      } else {
        result[key] = ''; 
      }
    }

    return result;
  }
}
