/* eslint-disable no-console */
// prisma/seedMenus.js
/** @param {import('@prisma/client').PrismaClient} prisma */

// 할랄 매장 데이터 import
const { YONGSAN_HALAL_STORES } = require('./yongsan_halal');

module.exports = async function seedMenus(prisma) {
  const { v4: uuidv4 } = require('uuid');
  const axios = require('axios');
  const qs = require('qs');

  // ------------------------------
  // TranslateService: dist → src → REST 폴백
  // ------------------------------
  let TranslateServiceClass = null;
  let ConfigServiceClass = null;
  try {
    // 빌드 산출물 먼저
    TranslateServiceClass =
      require('../dist/translate/translate.service').TranslateService;
    ConfigServiceClass = require('@nestjs/config').ConfigService;
    console.log('🔗 TranslateService(dist) 연결됨');
  } catch {
    try {
      // 소스 경로 백업
      TranslateServiceClass =
        require('../src/translate/translate.service').TranslateService;
      ConfigServiceClass = require('@nestjs/config').ConfigService;
      console.log('🔗 TranslateService(src) 연결됨');
    } catch {
      console.log('ℹ️ TranslateService 모듈 연결 실패 → REST 폴백 사용');
    }
  }

  // Translator 래퍼 (서비스 또는 REST 폴백)
  function createTranslateWrapper() {
    if (TranslateServiceClass && ConfigServiceClass) {
      const config = new ConfigServiceClass();
      const svc = new TranslateServiceClass(config);
      return {
        one: (text, to, from) => svc.translateOneWord(text, to, from),
        many: (text, toArr, from) => svc.translateMany(text, toArr, from),
        array: (arr, toArr, from) => svc.translateArray(arr, toArr, from),
      };
    }
    const EP = process.env.TRANSLATE_ENDPOINT;
    const KEY = process.env.TRANSLATE_API_KEY;
    const REGION = process.env.TRANSLATE_API_REGION;
    const baseHeaders = {
      'Ocp-Apim-Subscription-Key': KEY,
      'Ocp-Apim-Subscription-Region': REGION,
      'Content-Type': 'application/json',
    };
    return {
      async one(text, to, from) {
        const url = `${EP}/translate`;
        const resp = await axios.post(url, [{ Text: text }], {
          headers: { ...baseHeaders, 'X-ClientTraceId': uuidv4() },
          params: { 'api-version': '3.0', from, to },
        });
        return resp.data?.[0]?.translations?.[0]?.text || null;
      },
      async many(text, toArr, from) {
        const url = `${EP}/translate`;
        const resp = await axios.post(url, [{ Text: text }], {
          headers: { ...baseHeaders, 'X-ClientTraceId': uuidv4() },
          params: { 'api-version': '3.0', from, to: toArr },
          paramsSerializer: {
            serialize: (p) => qs.stringify(p, { arrayFormat: 'repeat' }),
          },
        });
        return resp.data;
      },
      async array(inputs, toArr, from) {
        const url = `${EP}/translate`;
        if (!Array.isArray(inputs) || inputs.length === 0) {
          return Object.fromEntries(toArr.map((t) => [t, []]));
        }
        const body = inputs.map((t) => ({ Text: t }));
        const resp = await axios.post(url, body, {
          headers: { ...baseHeaders, 'X-ClientTraceId': uuidv4() },
          params: { 'api-version': '3.0', from, to: toArr },
          paramsSerializer: {
            serialize: (p) => qs.stringify(p, { arrayFormat: 'repeat' }),
          },
        });
        const rows = resp.data || [];
        const out = {};
        toArr.forEach((l) => (out[l] = []));
        for (const row of rows) {
          const map = new Map(
            (row.translations || []).map((t) => [t.to, t.text]),
          );
          toArr.forEach((l) => out[l].push(map.get(l) || ''));
        }
        return out;
      },
    };
  }
  const translate = createTranslateWrapper();

  // ------------------------------
  // Azure OpenAI (ESM interop 대비: dynamic import)
  // ------------------------------
  let AzureOpenAI = null;
  try {
    // openai v4는 ESM-only → CJS에서 dynamic import 필요
    ({ AzureOpenAI } = await import('openai'));
  } catch {
    console.log('ℹ️ openai 패키지 로드 실패 → 비건 LLM 판정 스킵');
  }

  function veganSystemPrompt() {
    return `
  너는 전세계 식재료를 아는 분류 전문가다. 입력되는 "재료 목록(한글)"을 근거로
  다음 베지테리언 단계(veg_id)를 엄격하게 판정하라.
  
  중요: 
  - 키워드 매칭은 **명시적 일치** 또는 자명한 상위어에 한해 적용한다.
  - 다음은 **비건으로 간주되는 예시**이며 비동물성으로 처리한다:
    [올리브 오일, 카놀라유, 포도씨유, 해바라기유, 참기름, 들기름, 코코넛 오일, 식용유, 후추, 소금, 설탕]
  - '어유(생선기름, fish oil)'만 동물성 오일로 본다. **'올리브 오일' 등 식물성 오일과 혼동하지 마라.**
  - 모호하거나 추정이 필요하면 **비동물성으로 간주**하고, 동물성으로 분류하려면 해당 키워드가 **명시적으로** 포함되어야 한다.
  
  단계 정의(veg_id):
  0 = 어느 단계도 아님(붉은고기/젤라틴/코치닐/벌꿀/어유 등 포함 시 0)
  1 = 폴로(가금류 허용)
  2 = 페스코(어패류 허용)
  3 = 락토 오보(유제품+달걀)
  4 = 오보(달걀만)
  5 = 락토(유제품만)
  6 = 비건(동물성 전부 없음)
  
  카테고리 예시(명시적 일치 위주):
  - red_meat: 소고기, 쇠고기, 돼지고기, 양고기, 사슴고기, 사골 등
  - poultry: 닭, 오리, 칠면조 등
  - seafood: 생선, 멸치, 새우, 오징어, 액젓, 젓갈 등
  - egg: 계란, 달걀, 마요네즈 등
  - dairy: 우유, 치즈, 버터, 크림, 요거트, 유청 등
  - nonvegan: 꿀, 젤라틴, 코치닐, 카민, 어유
  
  분류 규칙(우선순위):
  1) red_meat 또는 nonvegan 1개라도 있으면 → 0
  2) poultry 1개라도 있으면 → 1
  3) seafood 1개라도 있으면 → 2
  4) dairy+egg → 3
  5) egg만 → 4
  6) dairy만 → 5
  7) 동물성 해당 없음 → 6
  
  아래 JSON 스키마로만 출력하라.
  `;
  }
  function veganJudgeSchema() {
    return {
      type: 'object',
      properties: {
        veg_id: { type: 'integer', enum: [0, 1, 2, 3, 4, 5, 6] },
        matched: {
          type: 'object',
          additionalProperties: { type: 'array', items: { type: 'string' } },
        },
        reasoning: { type: 'string' },
      },
      required: ['veg_id', 'matched', 'reasoning'],
      additionalProperties: false,
    };
  }
  async function judgeVeganByIngredientsLLM(ingredients) {
    if (!AzureOpenAI)
      return { veg_id: null, matched: {}, reasoning: 'no-openai' };
    const mini = new AzureOpenAI({
      endpoint: process.env.AZURE_4MINI_OPENAI_ENDPOINT || '',
      apiKey: process.env.AZURE_4MINI_KEY || '',
      apiVersion: process.env.AZURE_4MINI_VERSION || '',
      deployment: process.env.AZURE_4MINI_DEPLOYMENT || '',
    });
    const modelName = process.env.AZURE_4MINI_MODELNAME || 'gpt-4o-mini';
    const userPrompt = `재료 목록(JSON 배열): ${JSON.stringify(ingredients)}\n위 정의/규칙을 적용해 veg_id를 하나로 결정하라.`;
    try {
      const r = await mini.chat.completions.create({
        messages: [
          { role: 'system', content: veganSystemPrompt() },
          { role: 'user', content: userPrompt },
        ],
        model: modelName,
        temperature: 0.0,
        max_tokens: 400,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'VeganJudge',
            schema: veganJudgeSchema(),
            strict: true,
          },
        },
      });
      return JSON.parse(r.choices?.[0]?.message?.content ?? '{}');
    } catch {
      try {
        const fourO = new AzureOpenAI({
          endpoint: process.env.AZURE_4O_OPENAI_ENDPOINT || '',
          apiKey: process.env.AZURE_4O_OPENAI_KEY || '',
          apiVersion: process.env.AZURE_4O_API_VERSION || '',
          deployment: process.env.AZURE_4O_DEPLOYMENT || '',
        });
        const r2 = await fourO.chat.completions.create({
          messages: [
            { role: 'system', content: veganSystemPrompt() },
            { role: 'user', content: userPrompt },
          ],
          model: 'gpt-4o',
          temperature: 0.0,
          max_tokens: 400,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'VeganJudge',
              schema: veganJudgeSchema(),
              strict: true,
            },
          },
        });
        return JSON.parse(r2.choices?.[0]?.message?.content ?? '{}');
      } catch {
        return { veg_id: null, matched: {}, reasoning: 'llm-failed' };
      }
    }
  }

  // ------------------------------
  // 데이터 (PHONE/MENU)
  // ------------------------------
  const PHONE = {
    EID: '070-8899-8210',
    SULTAN: '02-749-3890',
    KERVAN_RES: '02-792-4767',
    KERVAN_BAKERY: '02-790-5585',
    HOME_KIM: '02-792-3731',
    MR_KEBAB: '070-7758-1997',
    HALAL_GUYS: '02-794-8308',
  };

  const VEG_NAME_BY_ID = {
    1: '폴로 베지테리언',
    2: '페스코 베지테리언',
    3: '락토 오보 베지테리언',
    4: '오보 베지테리언',
    5: '락토 베지테리언',
    6: '비건 베지테리언',
    7: '비건 아님',
  };

  const MENU = [
    {
      phone: PHONE.EID, // EID Halal Korean Food
      items: [
        {
          name: '비빔밥 (Bibimbap)',
          price: 8000,
          foo_img: 'https://checkeatfood.blob.core.windows.net/foods-dummy/EID_BIBIM.jpg',
          materials: [
            '쌀',
            '계란',
            '시금치',
            '콩나물',
            '애호박',
            '고사리',
            '고추장',
            '참기름',
          ],
        },
        {
          name: '불고기 (Bulgogi)',
          price: 10000,
          foo_img: 'https://checkeatfood.blob.core.windows.net/foods-dummy/EID_BUL.jpg',
          materials: [
            '소고기',
            '간장',
            '설탕',
            '마늘',
            '양파',
            '버섯',
            '참기름',
            '후추',
          ],
        },
        {
          name: '김치볶음밥 소고기',
          price: 8000,
          foo_img: 'https://checkeatfood.blob.core.windows.net/foods-dummy/EID_KIMCHI.jpg',
          materials: ['쌀', '김치', '소고기', '양파', '대파', '식용유', '간장'],
        },
        {
          name: '삼계탕 (Ginseng Chicken Soup)',
          price: 12000,
          foo_img: 'https://checkeatfood.blob.core.windows.net/foods-dummy/EID_SAM.jpg',
          materials: ['닭고기', '인삼', '대추', '마늘', '쌀', '소금'],
        },
        {
          name: '생선구이 (Grilled Fish)',
          price: 8000,
          foo_img: 'https://checkeatfood.blob.core.windows.net/foods-dummy/EID_SANG.jpg',
          materials: ['생선', '소금', '식용유', '레몬'],
        },
      ],
    },
    {
      phone: PHONE.SULTAN, // Sultan Kebab (Itaewon)
      items: [
        {
          name: '치킨 케밥 (Chicken Kebab)',
          price: 10000,
          foo_img: 'https://checkeatfood.blob.core.windows.net/foods-dummy/SULTAN_CHI_KE.png',
          materials: [
            '닭고기',
            '또띠야',
            '양상추',
            '토마토',
            '양파',
            '요거트소스',
            '칠리소스',
          ],
        },
        {
          name: '램 케밥 (Lamb Kebab)',
          price: 10000,
          foo_img: 'https://checkeatfood.blob.core.windows.net/foods-dummy/SULTAN_LAM_KE.png',
          materials: [
            '양고기',
            '또띠야',
            '양상추',
            '토마토',
            '양파',
            '요거트소스',
          ],
        },
        {
          name: '믹스 도네르 박스 (Mixed Doner Box)',
          price: 10000,
          foo_img: 'https://checkeatfood.blob.core.windows.net/foods-dummy/SULTAN_MIX.png',
          materials: ['닭고기', '양고기', '밥', '양파', '샐러드', '요거트소스'],
        },
        {
          name: '이스켄더 케밥 (Iskender Kebab)',
          price: 13000,
          foo_img: 'https://checkeatfood.blob.core.windows.net/foods-dummy/SULTAN_ESKEN.jpg',
          materials: ['도네르슬라이스', '토마토소스', '요거트', '피데빵'],
        },
        {
          name: '치킨 필라프 (Chicken Pilaf)',
          price: 11000,
          foo_img: 'https://checkeatfood.blob.core.windows.net/foods-dummy/SULTAN_CHI_PIL.png',
          materials: ['밥', '닭고기', '양파', '향신료', '버터대체'],
        },
      ],
    },
    {
      phone: PHONE.KERVAN_RES, // Kervan Restaurant (Itaewon) — 단품 위주
      items: [
        {
          name: '치킨 시쉬 케밥 (Chicken Shish Kebab)',
          foo_img: "https://checkeatfood.blob.core.windows.net/foods-dummy/KERVAN_CHI_KE.png",
          price: 21000,
          materials: ['닭안심', '올리브오일', '양파', '파프리카', '허브'],
        },
        {
          name: '아다나 랩 (Adana Wrap)',
          foo_img: "https://checkeatfood.blob.core.windows.net/foods-dummy/KERVAN_ADA.png",
          price: 19900,
          materials: ['다진고기', '파프리카가루', '양파', '향신료', '소고기'],
        },
        {
          name: '이스켄더 비프 (Iskender Beef)',
          price: 27000,
          foo_img:"https://checkeatfood.blob.core.windows.net/foods-dummy/KERVAN_BEEF.png",
          materials: ['도네르', '토마토소스', '비건요거트대체*', '피데빵', '소고기'],
        },
        {
          name: '양갈비 스테이크 (Steak Pirzola Lamb 2pcs)',
          price: 28000,
          foo_img:"https://checkeatfood.blob.core.windows.net/foods-dummy/KERVAN_LAMB_STEAK.png",
          materials: ['양갈비', '올리브오일', '허브', '소금', '후추'],
        },
        {
          name: '버섯 치즈 피데 (Mushroom Cheese Pide)',
          price: 17900,
          foo_img:"https://checkeatfood.blob.core.windows.net/foods-dummy/KERVAN_CHEESE.png",
          materials: ['피데도우', '버섯', '치즈대체*', '올리브오일'],
        },
      ],
    },
    {
      phone: PHONE.KERVAN_BAKERY, // Kervan Bakery & Cafe — 디저트(음료 제외)
      items: [
        {
          name: '바클라바 (6pcs)',
          price: 13000,
          foo_img: "https://checkeatfood.blob.core.windows.net/foods-dummy/KERVAN_B_BACLE.png",
          materials: ['필로', '피스타치오/호두', '설탕시럽', '비건마가린'],
        },
        {
          name: '터키쉬 쿠키 (400g)',
          price: 11000,
          foo_img:"https://checkeatfood.blob.core.windows.net/foods-dummy/KERVAN_B_COOKIE.png",
          materials: ['밀가루', '설탕', '오일', '견과'],
        },
        {
          name: '터키쉬 딜라이트 (Lokum 100g)',
          price: 7000,
          foo_img:"https://checkeatfood.blob.core.windows.net/foods-dummy/KERVAN_B_DEL.png",
          materials: ['설탕', '전분', '시럽', '견과'],
        },
        {
          name: '터키쉬 딜라이트 (Lokum 200g)',
          price: 13000,
          foo_img:"https://checkeatfood.blob.core.windows.net/foods-dummy/KERVAN_B_DEL.png",
          materials: ['설탕', '전분', '시럽', '견과'],
        },
        {
          name: '바클라바 (1pc)',
          price: 2500,
          foo_img:"https://checkeatfood.blob.core.windows.net/foods-dummy/KERVAN_B_BACLE.png",
          materials: ['필로', '견과', '시럽'],
        },
      ],
    },
    {
      phone: PHONE.HOME_KIM, // Home Cooking Master Kim (Starcatering)
      items: [
        {
          name: '불고기 한상',
          price: 15000,
          foo_img: "https://checkeatfood.blob.core.windows.net/foods-dummy/HOME_KIM_BUGO.png",
          materials: ['소고기', '간장', '마늘', '양파', '당근', '쌀'],
        },
        {
          name: '불닭 한상',
          price: 15000,
          foo_img: "https://checkeatfood.blob.core.windows.net/foods-dummy/HOME_KIM_BULDAK.png",
          materials: ['닭고기', '고춧가루', '고추장', '간장', '마늘', '쌀'],
        },
        {
          name: '잡채 (Japchae)',
          price: 11000,
          foo_img:"https://checkeatfood.blob.core.windows.net/foods-dummy/HOME_KIM_JAP.png",
          materials: [
            '당면',
            '소고기',
            '시금치',
            '당근',
            '목이버섯',
            '간장',
            '설탕',
            '참기름',
          ],
        },
        {
          name: '떡볶이 (Tteokbokki)',
          price: 13000,
          foo_img:"https://checkeatfood.blob.core.windows.net/foods-dummy/HOME_KIM_TTEOK.png",
          materials: ['쌀떡', '고추장', '고춧가루', '설탕', '대파'],
        },
        {
          name: '후라이드 치킨',
          price: 15000,
          foo_img: "https://checkeatfood.blob.core.windows.net/foods-dummy/HOME_KIM_FRID_CHI.png",
          materials: ['닭고기', '밀가루/전분', '소금', '식용유'],
        },
      ],
    },
    {
      phone: PHONE.MR_KEBAB, // Mr. Kebab (Itaewon)
      items: [
        {
          name: '치킨 케밥 (Chicken Kebab)',
          price: 7900,
          foo_img: "https://checkeatfood.blob.core.windows.net/foods-dummy/MR_KE_CHI_KE.png",
          materials: [
            '닭고기',
            '또띠야',
            '양상추',
            '양파',
            '토마토',
            '요거트소스',
          ],
        },
        {
          name: '램 케밥 (Lamb Kebab)',
          price: 8900,
          foo_img: "https://checkeatfood.blob.core.windows.net/foods-dummy/MR_KE_LAM_KE.png",
          materials: [
            '양고기',
            '또띠야',
            '양상추',
            '양파',
            '토마토',
            '요거트소스',
          ],
        },
        {
          name: '믹스 케밥 (Mix Kebab)',
          price: 9900,
          foo_img: "https://checkeatfood.blob.core.windows.net/foods-dummy/MR_KE_RICE.png",
          materials: ['닭고기', '양고기', '또띠야', '샐러드', '요거트소스'],
        },
        {
          name: '치킨 라이스볼 (Chicken Rice Bowl)',
          price: 10500,
          foo_img: "https://checkeatfood.blob.core.windows.net/foods-dummy/MR_KE_RICE.png",
          materials: ['밥', '닭고기', '샐러드', '요거트소스'],
        },
        {
          name: '램 라이스볼 (Lamb Rice Bowl)',
          price: 11500,
          foo_img: "https://checkeatfood.blob.core.windows.net/foods-dummy/MR_KE_RICE.png",
          materials: ['밥', '양고기', '샐러드', '요거트소스'],
        },
      ],
    },
    {
      phone: PHONE.HALAL_GUYS, // The Halal Guys (Itaewon)
      items: [
        {
          name: '샌드위치 치킨 (Chicken Sandwich)',
          price: 10900,
          foo_img: "https://checkeatfood.blob.core.windows.net/foods-dummy/HALAL_GUY_CHI_KE.png",
          materials: [
            '피타/빵',
            '닭고기',
            '양상추',
            '토마토',
            '화이트소스',
            '핫소스',
          ],
        },
        {
          name: '샌드위치 비프 (Beef Sandwich)',
          price: 11900,
          foo_img: "https://checkeatfood.blob.core.windows.net/foods-dummy/HALAL_GUY_COMBO.png",
          materials: [
            '피타/빵',
            '비프자이로',
            '양상추',
            '토마토',
            '화이트소스',
          ],
        },
        {
          name: '샌드위치 콤보 (Combo Sandwich)',
          price: 12900,
          foo_img: "https://checkeatfood.blob.core.windows.net/foods-dummy/HALAL_GUY_COMBO.png",
          materials: ['피타/빵', '닭고기', '비프자이로', '양상추', '토마토'],
        },
        {
          name: '플래터 치킨 (Chicken Platter)',
          price: 17900,
          foo_img: "https://checkeatfood.blob.core.windows.net/foods-dummy/HALAL_GUY_CHI_PLA.png",
          materials: [
            '밥',
            '닭고기',
            '양상추',
            '토마토',
            '화이트소스',
            '핫소스',
          ],
        },
        {
          name: '플래터 비프 (Beef Platter)',
          price: 19900,
          foo_img: "https://checkeatfood.blob.core.windows.net/foods-dummy/HALAL_GUY_BEEF_PLA.png",
          materials: ['밥', '비프자이로', '양상추', '토마토', '화이트소스'],
        },
        {
          name: '자이로 플래터 (Gyro Platter)',
          price: 13900,
          foo_img: "https://checkeatfood.blob.core.windows.net/foods-dummy/HALAL_GUY_GYRO.png",
          materials: [
            '자이로',
            '시즈닝 라이스',
            '양상추',
            '토마토',
            '화이트소스',
            '핫소스',
          ],
        },
        {
          name: '자이로 샌드위치 (Gyro Sandwich)',
          price: 15900,
          foo_img: "https://checkeatfood.blob.core.windows.net/foods-dummy/HALAL_GUY_GYRO_SAN.png",
          materials: ['자이로', '피타', '양상추', '토마토', '화이트소스'],
        },
        {
          name: '팔라펠 샌드위치 (Falafel Sandwich)',
          price: 15900,
          foo_img: "https://checkeatfood.blob.core.windows.net/foods-dummy/HALAL_GUY_PALA_SAN.png",
          materials: ['팔라펠', '피타', '양상추', '토마토', '화이트소스'],
        },
      ],
    },
  ];

  // ------------------------------
  // 유틸
  // ------------------------------
  function splitKoEn(nameWithParen) {
    const m = nameWithParen.match(/(.+?)\s*\((.*?)\)/);
    if (!m) return { ko: nameWithParen.trim(), en: null };
    return { ko: m[1].trim(), en: m[2].trim() };
  }
  async function veganIdIfExists(id) {
    if (typeof id !== 'number' || id <= 0) return null;
    const v = await prisma.vegan.findUnique({
      where: { veg_id: id },
      select: { veg_id: true },
    });
    return v ? id : null;
  }

  // ------------------------------
  // 메인 로직 (바로 실행)
  // ------------------------------
  console.log('🍽️ 메뉴 시드 시작 (이름 EN 분리 + 번역 + 비건판정)…');

  const veganRows = await prisma.vegan.findMany({
    select: { veg_id: true, veg_name: true },
  });
  const veganMap = Object.fromEntries(
    veganRows.map((v) => [v.veg_name, v.veg_id]),
  );

  for (const block of MENU) {
    const store = await prisma.store.findFirst({
      where: { sto_phone: block.phone },
      select: { sto_id: true, sto_sa_id: true, sto_name: true },
    });
    if (!store) {
      console.log(`⚠️ Store 미발견 (phone=${block.phone}) — 건너뜀`);
      continue;
    }

    for (const item of block.items) {
      const { ko: nameKo, en: nameEnFromTitle } = splitKoEn(item.name);

      // 중복 방지(한글명 기준)
      const dup = await prisma.food.findFirst({
        where: { foo_store_id: store.sto_id, foo_name: nameKo },
        select: { foo_id: true },
      });
      if (dup) {
        console.log(`  ↪️ 이미 존재: [${store.sto_name}] ${nameKo}`);
        continue;
      }

      // 1) 비건 판정
      let veganId = 7; // 기본값: 비건 아님
      try {
        const judged = await judgeVeganByIngredientsLLM(item.materials);
        const validVeganId = await veganIdIfExists(judged?.veg_id);
        if (validVeganId) {
          veganId = validVeganId;
        }
      } catch {}

      // 2) Food 생성
      const created = await prisma.food.create({
        data: {
          foo_name: nameKo,
          foo_material: item.materials,
          foo_price: item.price,
          foo_img: item.foo_img || null, // ✅ 메뉴 데이터의 foo_img 사용
          foo_status: 0,
          foo_sa_id: store.sto_sa_id,
          foo_store_id: store.sto_id,
          foo_vegan: veganId,
        },
        select: { foo_id: true },
      });

      // 3) 재료 번역
      let enMt = [],
        arMt = [];
      try {
        const tr = await translate.array(item.materials, ['en', 'ar'], 'ko');
        enMt = (tr['en'] || []).map((s) => s.trim()).filter(Boolean);
        arMt = (tr['ar'] || []).map((s) => s.trim()).filter(Boolean);
      } catch (e) {
        console.log(`   ⚠️ 재료 번역 실패(${nameKo}):`, e?.message || e);
      }

      // 4) 이름 번역
      let enName = nameEnFromTitle;
      let arName = null;
      try {
        if (!enName) {
          const resp = await translate.many(nameKo, ['en', 'ar'], 'ko');
          const translations = resp?.[0]?.translations || [];
          enName =
            translations.find((t) => t.to === 'en')?.text?.trim() || null;
          arName =
            translations.find((t) => t.to === 'ar')?.text?.trim() || null;
        } else {
          arName = await translate.one(nameKo, 'ar', 'ko');
        }
      } catch (e) {
        console.log(`   ⚠️ 이름 번역 실패(${nameKo}):`, e?.message || e);
      }

      // 5) 번역 테이블 upsert (FoodTranslateEN/AR)
      try {
        await prisma.foodTranslateEN.upsert({
          where: { food_id: created.foo_id },
          create: {
            food_id: created.foo_id,
            ft_en_name: enName || null,
            ft_en_mt: enMt,
            ft_en_price: String(item.price),
          },
          update: {
            ft_en_name: enName || null,
            ft_en_mt: enMt,
            ft_en_price: String(item.price),
          },
        });
        await prisma.foodTranslateAR.upsert({
          where: { food_id: created.foo_id },
          create: {
            food_id: created.foo_id,
            ft_ar_name: arName || null,
            ft_ar_mt: arMt,
            ft_ar_price: String(item.price),
          },
          update: {
            ft_ar_name: arName || null,
            ft_ar_mt: arMt,
            ft_ar_price: String(item.price),
          },
        });
      } catch (e) {
        console.log(`   ⚠️ 번역 저장 실패(${nameKo}):`, e?.message || e);
      }

      console.log(
        `  ✅ [${store.sto_name}] ${nameKo}${enName ? ` (${enName})` : ''} - ₩${item.price.toLocaleString()}${veganId ? ` | vegan_id=${veganId}` : ''}`,
      );
    }
  }

  console.log('🎉 메뉴 시드 완료');
};
