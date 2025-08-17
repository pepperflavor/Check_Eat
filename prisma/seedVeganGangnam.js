/* eslint-disable no-console */
'use strict';

/** @param {import('@prisma/client').PrismaClient} prisma */
module.exports = async function seedVeganGangnam(prisma) {
  console.log('🌱 강남 비건 매장 시드 시작');

  // 0) 상수 파일 로드 (ESM -> dynamic import)
  let STORES = [];
  try {
    const mod = await import('./gangnam_vegan.js');
    STORES = (mod && (mod.GANGNAM_VEGAN_STORES || mod.default)) || [];
  } catch (e) {
    console.error('❌ gangnam_vegan.js 로드 실패:', e?.message || e);
    return;
  }
  if (!Array.isArray(STORES) || STORES.length === 0) {
    console.log('ℹ️ GANGNAM_VEGAN_STORES 비어있음. 종료');
    return;
  }

  // 1) Store 업서트 (Sajang/BusinessCerti/Store) — 트랜잭션
  const esc = (s) => String(s ?? '').replace(/'/g, "''");
  const rows = STORES.map((s) => {
    const bs_no =
      'PENDING_VEG_' +
      esc(s.sto_name_en)
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_');
    const name_en = esc(s.sto_name_en);
    const name_kor = esc(s.sto_name);
    const addr = esc(s.sto_address);
    const phone = esc(s.sto_phone || '');
    const lat = Number(s.sto_latitude || 0);
    const lng = Number(s.sto_longitude || 0);
    const typ = esc(s.sto_type || '레스토랑');
    return `('${bs_no}','${name_en}','${name_kor}','${addr}','${phone}',${lat},${lng},'${typ}')`;
  }).join(',\n    ');

  const UPSERT_SQL = `
WITH venues_raw AS (
  SELECT * FROM (VALUES
    ${rows}
  ) AS v(bs_no, name_en, name_kor, address_kor, phone, lat, lng, typ)
),
-- ⚠️ 같은 가게가 rows에 중복 들어와도 여기서 1차 정리
venues AS (
  SELECT DISTINCT ON (bs_no)
         bs_no, name_en, name_kor, address_kor, phone, lat, lng, typ
  FROM venues_raw
  WHERE COALESCE(phone, '') <> ''  -- (선택) 빈 전화번호 제거
  ORDER BY bs_no
),

upsert_sajang AS (
  INSERT INTO "Sajang"(sa_phone, sa_certification, sa_certi_status)
  SELECT v.phone, 1, 1 FROM venues v
  WHERE NOT EXISTS (SELECT 1 FROM "Sajang" s WHERE s.sa_phone = v.phone)
  RETURNING sa_id, sa_phone
),
sajang_all AS (
  SELECT sa_id, sa_phone FROM upsert_sajang
  UNION 
  SELECT s.sa_id, s.sa_phone FROM "Sajang" s
  WHERE s.sa_phone IN (SELECT phone FROM venues)
),

upsert_biz AS (
  INSERT INTO "BusinessCerti"(bs_no, bs_name, bs_type, bs_address, bs_sa_id)
  SELECT v.bs_no, v.name_en, 'Restaurant', v.address_kor, s.sa_id
  FROM venues v
  JOIN sajang_all s ON s.sa_phone = v.phone
  ON CONFLICT (bs_no) DO UPDATE
    SET bs_name    = EXCLUDED.bs_name,
        bs_type    = EXCLUDED.bs_type,
        bs_address = EXCLUDED.bs_address,
        bs_sa_id   = EXCLUDED.bs_sa_id
  RETURNING bs_id, bs_no
),
biz_all AS (
  SELECT bs_id, bs_no FROM upsert_biz
  UNION 
  SELECT b.bs_id, b.bs_no FROM "BusinessCerti" b
  WHERE b.bs_no IN (SELECT bs_no FROM venues)
)

INSERT INTO "Store"(
  sto_name, sto_name_en, sto_img, sto_address, sto_phone,
  sto_status, sto_halal, sto_type, sto_latitude, sto_longitude,
  sto_sa_id, sto_bs_id
)
SELECT
  v.name_kor, v.name_en, NULL, v.address_kor, v.phone,
  0,  -- 정상
  0,  -- 비건(할랄 아님)
  v.typ,
  v.lat, v.lng,
  s.sa_id, b.bs_id
FROM venues v
JOIN sajang_all s ON s.sa_phone = v.phone
JOIN biz_all    b ON b.bs_no    = v.bs_no
ON CONFLICT (sto_sa_id, sto_bs_id, sto_name, sto_latitude, sto_longitude)
DO UPDATE SET
  sto_phone   = EXCLUDED.sto_phone,
  sto_status  = EXCLUDED.sto_status,
  sto_type    = EXCLUDED.sto_type,
  sto_address = EXCLUDED.sto_address;
`;

  await prisma.$executeRawUnsafe('BEGIN');
  try {
    await prisma.$executeRawUnsafe(UPSERT_SQL);
    await prisma.$executeRawUnsafe('COMMIT');
    console.log(`✅ 강남 비건 매장(Store) 업서트 완료 (총 ${STORES.length}곳)`);
  } catch (e) {
    await prisma.$executeRawUnsafe('ROLLBACK');
    console.error('❌ 강남 비건 매장 업서트 실패, 롤백됨:', e?.message || e);
    throw e;
  }

  // 2) 메뉴 시드 — seedMenus.js와 동일한 방식(번역/LLM판정/중복방지)
  console.log('🍽️ 강남 비건 매장 메뉴 시드 시작');

  // ── seedMenus.js 에 있는 번역/판정 래퍼 이식 ─────────────────────
  const { v4: uuidv4 } = require('uuid');
  const axios = require('axios');
  const qs = require('qs');

  // TranslateService / REST 폴백
  let TranslateServiceClass = null;
  let ConfigServiceClass = null;
  try {
    TranslateServiceClass =
      require('../dist/translate/translate.service').TranslateService;
    ConfigServiceClass = require('@nestjs/config').ConfigService;
    console.log('🔗 TranslateService(dist) 연결됨');
  } catch {
    try {
      TranslateServiceClass =
        require('../src/translate/translate.service').TranslateService;
      ConfigServiceClass = require('@nestjs/config').ConfigService;
      console.log('🔗 TranslateService(src) 연결됨');
    } catch {
      console.log('ℹ️ TranslateService 모듈 연결 실패 → REST 폴백 사용');
    }
  }
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
        if (!Array.isArray(inputs) || inputs.length === 0)
          return Object.fromEntries(toArr.map((t) => [t, []]));
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

  // Azure OpenAI — seedMenus.js와 동일한 규격
  let AzureOpenAI = null;
  try {
    ({ AzureOpenAI } = await import('openai'));
  } catch {
    console.log('ℹ️ openai 패키지 로드 실패 → LLM 판정은 스킵될 수 있음');
  }
  function veganSystemPrompt() {
    return `
너는 전세계 식재료를 아는 분류 전문가다. 입력되는 "재료 목록(한글)"을 근거로
다음 베지테리언 단계(veg_id)를 엄격하게 판정하라.
... (seedMenus.js와 동일한 규칙 — 생략) ...
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
    try {
      const mini = new AzureOpenAI({
        endpoint: process.env.AZURE_4MINI_OPENAI_ENDPOINT || '',
        apiKey: process.env.AZURE_4MINI_KEY || '',
        apiVersion: process.env.AZURE_4MINI_VERSION || '',
        deployment: process.env.AZURE_4MINI_DEPLOYMENT || '',
      });
      const modelName = process.env.AZURE_4MINI_MODELNAME || 'gpt-4o-mini';
      const r = await mini.chat.completions.create({
        messages: [
          { role: 'system', content: veganSystemPrompt() },
          {
            role: 'user',
            content: `재료 목록(JSON 배열): ${JSON.stringify(ingredients)}`,
          },
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
      return { veg_id: null, matched: {}, reasoning: 'llm-failed' };
    }
  }
  async function veganIdIfExists(id) {
    if (typeof id !== 'number' || id <= 0) return null;
    const v = await prisma.vegan.findUnique({
      where: { veg_id: id },
      select: { veg_id: true },
    });
    return v ? id : null;
  }
  function splitKoEn(nameWithParen) {
    const m = nameWithParen.match(/(.+?)\s*\((.*?)\)/);
    return m
      ? { ko: m[1].trim(), en: m[2].trim() }
      : { ko: nameWithParen.trim(), en: null };
  }

  // ── (A) PHONE 매핑 ──────────────────────────────────────────
  const PHONE = Object.fromEntries(
    STORES.map((s) => {
      const key = s.sto_name_en.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
      return [key, s.sto_phone];
    }),
  );

  // ── (B) 강남 비건 단품 메뉴 (세트/음료 제외) ─────────────────
  const MENU = [
    {
      phone: PHONE['PLANTUDE_COEX'],
      items: [
        {
          name: '페이퍼 두부 라자냐 (Paper Tofu Lasagna)',
          price: 16900,
          materials: [
            '두부',
            '토마토소스',
            '양파',
            '마늘',
            '바질',
            '후추',
            '올리브오일',
          ],
        },
        {
          name: '헬시 업 가지 볼 (Healthy UP Eggplant Bowl)',
          price: 15900,
          materials: [
            '가지',
            '현미밥',
            '토마토',
            '루꼴라',
            '발사믹',
            '올리브오일',
            '소금',
            '후추',
          ],
        },
        {
          name: '두부 가라아게 (Tofu Karaage)',
          price: 11900,
          materials: ['두부', '전분', '간장', '마늘', '생강', '식용유', '레몬'],
        },
      ],
    },
    {
      phone: PHONE['MAHINA_VEGAN_TABLE'],
      items: [
        {
          name: '머쉬룸 크림 파스타 (Mushroom Cream Pasta)',
          price: 26000,
          materials: [
            '파스타',
            '버섯',
            '두유크림',
            '올리브오일',
            '마늘',
            '후추',
          ],
        },
        {
          name: '토마토 바질 파스타 (Tomato Basil Pasta)',
          price: 23000,
          materials: ['파스타', '토마토', '바질', '올리브오일', '마늘', '소금'],
        },
      ],
    },
    {
      phone: PHONE['MONK_S_BUTCHER_DOSAN'],
      items: [
        {
          name: '구운 버섯 스테이크 (Grilled Mushroom Steak)',
          price: 28000,
          materials: [
            '양송이',
            '포토벨로',
            '올리브오일',
            '소금',
            '후추',
            '허브',
          ],
        },
        {
          name: '비건 버거 (Vegan Burger)',
          price: 24000,
          materials: [
            '비건번',
            '식물성패티',
            '토마토',
            '양상추',
            '피클',
            '머스터드',
          ],
        },
      ],
    },
    {
      phone: PHONE['SUN_THE_BUD_CHEONGDAM'],
      items: [
        {
          name: '현미보울 채소플레이트 (Brown Rice Veggie Plate)',
          price: 18000,
          materials: [
            '현미밥',
            '아보카도',
            '브로콜리',
            '병아리콩',
            '견과',
            '드레싱',
          ],
        },
        {
          name: '팔라펠 샐러드 (Falafel Salad)',
          price: 16000,
          materials: [
            '병아리콩',
            '양파',
            '마늘',
            '파슬리',
            '토마토',
            '양상추',
            '타히니',
          ],
        },
      ],
    },
    {
      phone: PHONE['NORDI'],
      items: [
        {
          name: '비건 크루아상 (Vegan Croissant)',
          price: 6000,
          materials: ['밀가루', '비건마가린', '이스트', '소금', '설탕', '물'],
        },
        {
          name: '비건 티라미수 (Vegan Tiramisu)',
          price: 8500,
          materials: [
            '두유크림',
            '에스프레소',
            '설탕',
            '코코아파우더',
            '비건비스킷',
          ],
        },
      ],
    },
    {
      phone: PHONE['DAHLIA_DINING'],
      items: [
        {
          name: '여러가지 버섯 오일 파스타 (Mushroom Aglio e Olio)',
          price: 23000,
          materials: [
            '파스타',
            '마늘',
            '올리브오일',
            '버섯',
            '페페론치노',
            '파슬리',
          ],
        },
        {
          name: '트러플 버섯 리조또 (Truffle Mushroom Risotto)',
          price: 29000,
          materials: ['쌀', '버섯', '트러플오일', '채수', '올리브오일', '소금'],
        },
      ],
    },
    {
      phone: PHONE['VEG_GREEN'],
      items: [
        {
          name: '콩불고기 (Soy Bulgogi)',
          price: 12000,
          materials: ['콩단백', '간장', '마늘', '설탕', '양파', '참기름'],
        },
        {
          name: '표고 탕수 (Sweet & Sour Shiitake)',
          price: 12000,
          materials: ['표고버섯', '전분', '식초', '설탕', '간장', '식용유'],
        },
      ],
    },
    {
      phone: PHONE['UUUM_EATERY'],
      items: [
        {
          name: '부아베스 스타일 토마토 스튜 (Vegan Bouillabaisse)',
          price: 23000,
          materials: ['토마토', '향신채', '허브', '올리브오일', '채수'],
        },
        {
          name: '머쉬룸 크림 파스타 (Mushroom Cream Pasta)',
          price: 24000,
          materials: [
            '파스타(글루텐프리 선택)',
            '버섯',
            '두유크림',
            '마늘',
            '올리브오일',
          ],
        },
      ],
    },
    {
      phone: PHONE['AN_SIK_RESTAURANT'],
      items: [
        {
          name: '나물 듬뿍 크림 파스타 (Greens Cream Pasta)',
          price: 19000,
          materials: ['파스타', '나물', '두유크림', '마늘', '소금', '후추'],
        },
        {
          name: '세상의 모든 버섯 샐러드 (All the Mushrooms Salad)',
          price: 17000,
          materials: ['각종버섯', '채소', '올리브오일', '발사믹', '소금'],
        },
      ],
    },
    {
      phone: PHONE['CHICKPEACE_SINSA_GAROSU_GIL'],
      items: [
        {
          name: '팔라펠 피타 (Falafel Pita)',
          price: 8900,
          materials: [
            '병아리콩',
            '파슬리',
            '양파',
            '마늘',
            '피타',
            '토마토',
            '양상추',
            '타히니',
          ],
        },
        {
          name: '콜리플라워 로스트 보울 (Cauliflower Roast Bowl)',
          price: 10900,
          materials: ['콜리플라워', '현미밥', '각종채소', '타히니', '향신료'],
        },
      ],
    },
  ].filter((b) => !!b.phone);

  // ── (C) INSERT 루프 (중복 방지 + 번역 + 비건판정 + 번역테이블 저장) ──
  for (const block of MENU) {
    const store = await prisma.store.findFirst({
      where: { sto_phone: block.phone },
      select: { sto_id: true, sto_sa_id: true, sto_name: true },
    });
    if (!store) {
      console.log(`⚠️ Store 미발견(phone=${block.phone}) — 건너뜀`);
      continue;
    }

    for (const item of block.items) {
      const { ko: nameKo, en: nameEnFromTitle } = splitKoEn(item.name);

      // 중복 방지
      const dup = await prisma.food.findFirst({
        where: { foo_store_id: store.sto_id, foo_name: nameKo },
        select: { foo_id: true },
      });
      if (dup) {
        console.log(`  ↪️ 이미 존재: [${store.sto_name}] ${nameKo}`);
        continue;
      }

      // 1) 비건 단계 추론
      let veganId = null;
      try {
        const judged = await judgeVeganByIngredientsLLM(item.materials);
        veganId = await veganIdIfExists(judged?.veg_id);
      } catch {}

      // 2) Food 생성
      const created = await prisma.food.create({
        data: {
          foo_name: nameKo,
          foo_material: item.materials,
          foo_price: item.price,
          foo_img: null,
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
      let enName = nameEnFromTitle,
        arName = null;
      try {
        if (!enName) {
          const resp = await translate.many(nameKo, ['en', 'ar'], 'ko');
          const t = resp?.[0]?.translations || [];
          enName = t.find((x) => x.to === 'en')?.text?.trim() || null;
          arName = t.find((x) => x.to === 'ar')?.text?.trim() || null;
        } else {
          arName = await translate.one(nameKo, 'ar', 'ko');
        }
      } catch (e) {
        console.log(`   ⚠️ 이름 번역 실패(${nameKo}):`, e?.message || e);
      }

      // 5) 번역 테이블 저장
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

  console.log('🎉 강남 비건 매장 메뉴 시드 완료');
};
