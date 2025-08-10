import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import qs from 'qs';

@Injectable()
export class TranslateService {
  constructor(private readonly config: ConfigService) {}

  // 단어 번역
  async translateOneWord(inputText: string, to: string, from: string) {
    const URL = `${this.config.get('TRANSLATE_ENDPOINT')}/translate`;

    try {
      const response = await axios.post(URL, [{ Text: inputText }], {
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.get('TRANSLATE_API_KEY'),
          'Ocp-Apim-Subscription-Region': this.config.get(
            'TRANSLATE_API_REGION',
          ),
          'Content-Type': 'application/json',
          'X-ClientTraceId': uuidv4().toString(),
        },
        params: {
          'api-version': '3.0',
          from,
          to,
        },

        responseType: 'json',
      });

      //   console.log(JSON.stringify(response.data, null, 4));
      const translations = response.data[0]?.translations;

      console.log(translations[0].text); // 텍스트만 나옴, 첫번째 언어 번역본

      return translations[0].text;
      /*
            응답
            [
    {
        "translations": [
            {
                "text": "J'aimerais vraiment conduire votre voiture autour du pâté de maisons plusieurs fois!",
                "to": "fr"
            },
            {
                "text": "Ngingathanda ngempela ukushayela imoto yakho endaweni evimbelayo izikhathi ezimbalwa!",
                "to": "zu"
            }
        ]
    }
]
            */
    } catch (error) {
      console.error(
        'Translation error:',
        error.response?.data || error.message,
      );
      throw new InternalServerErrorException('번역 실패');
    }
  }

  // 여러 단어, 다국어
  // 영어 아랍어로 픽스?
  async translateMany(
    inputText: string,
    to: string[],
    from: string | string[],
  ) {
    const URL = `${this.config.get('TRANSLATE_ENDPOINT')}/translate`;
    // [ar, en] - 아랍어, 영어로 번역
    try {
      const response = await axios.post(URL, [{ Text: inputText }], {
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.get('TRANSLATE_API_KEY'),
          'Ocp-Apim-Subscription-Region': this.config.get(
            'TRANSLATE_API_REGION',
          ),
          'Content-Type': 'application/json',
          'X-ClientTraceId': uuidv4().toString(),
        },
        params: {
          'api-version': '3.0',
          from,
          to: to, // 다국어일 경우 배열로 전달
        },
        paramsSerializer: {
          serialize: (p) => qs.stringify(p, { arrayFormat: 'repeat' }),
        },
      });

      return response.data;
    } catch (error) {}
  }

  // 배열 번역
  async translateArray(
    inputs: string[],
    to: string[],
    from: string,
  ): Promise<Record<string, string[]>> {
    const URL = `${this.config.get('TRANSLATE_ENDPOINT')}/translate`;

    if (!Array.isArray(inputs) || inputs.length === 0) {
      return Object.fromEntries(to.map((t) => [t, []]));
    }

    // Translator는 body를 [{Text:"..."}] 배열로 받음
    const body = inputs.map((text) => ({ Text: text }));

    try {
      const response = await axios.post(URL, body, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.get('TRANSLATE_API_KEY'),
          'Ocp-Apim-Subscription-Region': this.config.get(
            'TRANSLATE_API_REGION',
          ),
          'Content-Type': 'application/json',
          'X-ClientTraceId': uuidv4().toString(),
        },
        params: {
          'api-version': '3.0',
          from,
          to, // 배열로 전송 ['en', 'ar']
        },
        paramsSerializer: {
          serialize: (params) =>
            qs.stringify(params, { arrayFormat: 'repeat' }),
        },
      });

      // 응답 형태:
      // [
      //   { translations: [ {text:'Pumpkin', to:'en'}, {text:'يقطين', to:'ar'} ] },
      //   { translations: [ ... ] },
      //   ...
      // ]
      const rows = response.data as Array<{
        translations: Array<{ text: string; to: string }>;
      }>;

      const out: Record<string, string[]> = {};
      for (const lang of to) out[lang] = [];

      for (const row of rows) {
        const byLang = new Map(row.translations.map((t) => [t.to, t.text]));
        for (const lang of to) {
          out[lang].push(byLang.get(lang) ?? '');
        }
      }
      return out;
    } catch (error: any) {
      console.error(
        'Translation error:',
        error?.response?.data || error?.message,
      );
      throw new InternalServerErrorException('배열 번역 실패');
    }
  }
}

// 언어 코드
// https://learn.microsoft.com/ko-kr/azure/ai-services/translator/language-support
