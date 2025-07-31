import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import DocumentIntelligence, {
  getLongRunningPoller,
  isUnexpected,
} from '@azure-rest/ai-document-intelligence';
import {
  AzureKeyCredential,
  DocumentAnalysisClient,
} from '@azure/ai-form-recognizer';

@Injectable()
export class AzureDocumentOcrService {
  private readonly key: string;
  private readonly endpoint: string;
  private readonly modelId: string;

  // 영수증 관련
  private readonly client: DocumentAnalysisClient;
  private readonly re_endpoint: string;
  private readonly re_key: string;

  constructor(private readonly config: ConfigService) {
    this.key = this.config.get<string>('OCR_KEY_SECOND') ?? '';
    this.endpoint = this.config.get<string>('OCR_ENDPOINT') ?? '';
    this.modelId = this.config.get<string>('CUSTOM_MODEL_ID_2') ?? '';
    this.re_endpoint = this.config.get<string>('RECEIPT_OCR_ENDPOINT') ?? '';
    this.re_key = this.config.get<string>('RECEIPT_OCR_KEY') ?? '';

    this.client = new DocumentAnalysisClient(
      this.re_endpoint,
      new AzureKeyCredential(this.re_key),
    );
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
      const raw = field?.valueString;
      if (raw) {
        // ' : ' 또는 ':' 기준으로 나눠서 오른쪽 값만 사용
        const parts = raw.split(':');
        result[key] =
          parts.length > 1 ? parts.slice(1).join(':').trim() : raw.trim();
      } else {
        result[key] = '';
      }
    }

    return result;
  }

  //======== 영수증 OCR 시작
  async analyzeReceiptFromBuffer(buffer: Buffer, mimetype: string) {
    try {
      const poller = await this.client.beginAnalyzeDocument(
        'prebuilt-receipt',
        buffer,
      );
      const result = await poller.pollUntilDone();
      const doc = result.documents?.[0];
      if (!doc) {
        throw new Error('영수증 분석 결과가 없습니다.');
      }

      const fields = doc.fields ?? {};

      // 가게 이름
      const merchantName =
        fields.MerchantName?.kind === 'string' ? fields.MerchantName.value : '';

      // 총합계
      const total =
        fields.Total?.kind === 'number' ? fields.Total.value : undefined;

      const address =
        fields.MerchantAddress?.kind === 'address'
          ? (fields.MerchantAddress?.value?.streetAddress ?? '')
          : '';

      // 메뉴들
      const items: { name: string; price?: number; quantity?: number }[] = [];

      if (fields.Items?.kind === 'array') {
        for (const itemField of fields.Items.values) {
          if (itemField?.kind === 'object') {
            const properties = itemField.properties ?? {};

            // Description 또는 Name 필드 우선 순위로 추출
            const name =
              properties.Description?.kind === 'string'
                ? properties.Description.value
                : properties.Name?.kind === 'string'
                  ? properties.Name.value
                  : undefined;

            const price =
              properties.TotalPrice?.kind === 'number'
                ? properties.TotalPrice.value
                : undefined;

            if (name) {
              items.push({
                name,
                price,
              });
            }
          }
        }
      }

      const response: any = {
        store: merchantName,
        menus: items,
        total,
      };

      if (address) {
        response.address = address;
      } else {
        response.address = '영수증에 주소가 표기되어있지 않습니다.';
      }

      return response;
    } catch (error) {
      console.error('[Azure Receipt OCR] 실패:', error);
      throw new InternalServerErrorException('영수증 분석에 실패했습니다.');
    }
  }
}
