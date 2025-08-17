// prisma/seedHalal.js
/* eslint-disable no-console */
'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

// ✅ 메뉴 시드(번역 + 비건판정 포함): prisma/seedMenus.js (필수)
let seedMenus = async () => console.log('ℹ️ seedMenus 모듈이 없어 건너뜀');
try {
  seedMenus = require('./seedMenus'); // module.exports = async function seedMenus(prisma) { ... }
} catch {
  console.log(
    '⚠️ prisma/seedMenus.js 를 찾지 못했습니다. 메뉴 시드는 건너뜁니다.',
  );
}

/** ─────────────────────────────────────────────────────────
 *  용산구 할랄 7개 업장 upsert SQL (sto_halal=1, 1:1 관계 보장)
 *  ───────────────────────────────────────────────────────── */
const HALAL_SQL = `
-- 1) seed 원천 데이터
WITH venues AS (
  SELECT * FROM (VALUES
    ('PENDING_EID_HALAL'    ,'EID Halal Korean Food'                  ,'이드(EID) 할랄 코리안 푸드'      ,'서울특별시 용산구 우사단로10길 67'           ,'070-8899-8210'  , 37.5323774 , 126.9991854),
    ('PENDING_SULTAN_KEBAB' ,'Sultan Kebab'                           ,'술탄 케밥'                       ,'서울특별시 용산구 보광로 126'                 ,'02-749-3890'    , 37.5335000 , 126.9941000),
    ('PENDING_KERVAN_RES'   ,'Kervan Restaurant (Itaewon)'            ,'케르반 레스토랑'                  ,'서울특별시 용산구 이태원로 190'               ,'02-792-4767'    , 37.5343300 , 126.9951800),
    ('PENDING_KERVAN_BAKERY','Kervan Bakery & Cafe'                   ,'케르반 베이커리&카페'             ,'서울특별시 용산구 이태원로 208'               ,'02-790-5585'    , 37.5342500 , 126.9967000),
    ('PENDING_HOME_KIM'     ,'Home Cooking Master Kim (Starcatering)' ,'집밥김선생(스타캐터링)'           ,'서울특별시 용산구 녹사평대로46길 28'         ,'02-792-3731'    , 37.5364000 , 126.9879000),
    ('PENDING_MR_KEBAB'     ,'Mr. Kebab'                              ,'미스터케밥'                       ,'서울특별시 용산구 이태원로 192'               ,'070-7758-1997'  , 37.5343797 , 126.9954240),
    ('PENDING_HALAL_GUYS'   ,'The Halal Guys (Itaewon)'               ,'할랄가이즈 이태원점'              ,'서울특별시 용산구 이태원로 187, 2층'         ,'02-794-8308'    , 37.5345600 , 126.9940500)
  ) AS v(bs_no, name_en, name_kor, address_kor, phone, lat, lng)
),

-- 2) Sajang upsert (전화번호 자연키) - 인증 완료 상태(1,1)
upsert_sajang AS (
  INSERT INTO "Sajang"(sa_phone, sa_certification, sa_certi_status)
  SELECT v.phone, 1, 1
  FROM venues v
  WHERE NOT EXISTS (SELECT 1 FROM "Sajang" s WHERE s.sa_phone = v.phone)
  RETURNING sa_id, sa_phone
),
sajang_all AS (
  SELECT sa_id, sa_phone FROM upsert_sajang
  UNION 
  SELECT s.sa_id, s.sa_phone
  FROM "Sajang" s
  WHERE s.sa_phone IN (SELECT phone FROM venues)
),

-- 3) BusinessCerti upsert (bs_no 유니크)
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
  SELECT b.bs_id, b.bs_no
  FROM "BusinessCerti" b
  WHERE b.bs_no IN (SELECT bs_no FROM venues)
)

-- 4) Store upsert (sto_halal=1, 모두 '음식점'; 1 사장당 1 스토어 구조)
INSERT INTO "Store"(
  sto_name, sto_name_en, sto_img, sto_address, sto_phone,
  sto_status, sto_halal, sto_type, sto_latitude, sto_longitude,
  sto_sa_id, sto_bs_id
)
SELECT
  v.name_kor,
  v.name_en,
  NULL,
  v.address_kor,
  v.phone,
  0,                -- 정상영업
  1,                -- ✅ 할랄 인증
  '음식점',
  v.lat, v.lng,
  s.sa_id,
  b.bs_id
FROM venues v
JOIN sajang_all s ON s.sa_phone = v.phone
JOIN biz_all    b ON b.bs_no    = v.bs_no
ON CONFLICT (sto_sa_id, sto_bs_id, sto_name, sto_latitude, sto_longitude)
DO UPDATE SET
  sto_phone   = EXCLUDED.sto_phone,
  sto_status  = EXCLUDED.sto_status,
  sto_halal   = EXCLUDED.sto_halal,
  sto_type    = '음식점',
  sto_address = EXCLUDED.sto_address;
`;

/** 공용 시드 유틸 */
async function ensureVeganSeed() {
  const count = await prisma.vegan.count();
  if (count > 0) {
    console.log('✅ Vegan 데이터 이미 존재');
    return;
  }
  console.log('🌱 Vegan 데이터 삽입 중...');
  await prisma.vegan.createMany({
    data: [
      '폴로 베지테리언',
      '페스코 베지테리언',
      '락토 오보 베지테리언',
      '오보 베지테리언',
      '락토 베지테리언',
      '비건 베지테리언',
    ].map((veg_name) => ({ veg_name })),
    skipDuplicates: true,
  });
  console.log('✅ Vegan 데이터 삽입 완료');
}

async function ensureCommonAlSeed() {
  const count = await prisma.commonAl.count();
  if (count > 0) {
    console.log('✅ CommonAl 데이터 이미 존재');
    return;
  }
  console.log('🌱 CommonAl 데이터 삽입 중...');
  await prisma.commonAl.createMany({
    data: [
      { coal_id: 1, coal_name: '난류' },
      { coal_id: 2, coal_name: '우유' },
      { coal_id: 3, coal_name: '메밀' },
      { coal_id: 4, coal_name: '땅콩' },
      { coal_id: 5, coal_name: '대두' },
      { coal_id: 6, coal_name: '밀' },
      { coal_id: 7, coal_name: '고등어' },
      { coal_id: 8, coal_name: '게' },
      { coal_id: 9, coal_name: '새우' },
      { coal_id: 10, coal_name: '돼지고기' },
      { coal_id: 11, coal_name: '복숭아' },
      { coal_id: 12, coal_name: '토마토' },
      { coal_id: 13, coal_name: '아황산류' },
      { coal_id: 14, coal_name: '호두' },
      { coal_id: 15, coal_name: '닭고기' },
      { coal_id: 16, coal_name: '쇠고기' },
      { coal_id: 17, coal_name: '오징어' },
      { coal_id: 18, coal_name: '조개류' },
      { coal_id: 19, coal_name: '잣' },
    ],
    skipDuplicates: true,
  });
  console.log('✅ CommonAl 데이터 삽입 완료');
}

/** (옵션) 샘플 업주 계정 시드 — 인증완료(1,1) */
async function ensureOwnersSeed(total = 10) {
  console.log(`👤 사장님 시드 생성/유지 (총 ${total}명)`);
  for (let i = 1; i <= total; i++) {
    const ld_log_id = `owner${i}_id`;
    const exists = await prisma.loginData.findUnique({
      where: { ld_log_id },
      select: { ld_id: true },
    });
    if (exists) {
      console.log(`  ↪️ ${ld_log_id} 이미 존재`);
      continue;
    }

    const sajang = await prisma.sajang.create({
      data: {
        sa_phone: `010-1234-${String(5600 + i).padStart(4, '0')}`,
        sa_certification: 1,
        sa_certi_status: 1,
      },
    });

    const hashedPwd = await bcrypt.hash(`passwordOwner${i}`, 12);
    await prisma.loginData.create({
      data: {
        ld_usergrade: 1,
        ld_log_id,
        ld_email: `owner${i}@example.com`,
        ld_pwd: hashedPwd,
        ld_status: 0,
        ld_sajang_id: sajang.sa_id,
      },
    });

    console.log(`  ✅ 생성 완료: ${ld_log_id} (sajang_id=${sajang.sa_id})`);
  }
}

/** 용산 할랄 7개 업장 시드 (트랜잭션) */
async function runHalalYongsanSeed() {
  console.log('🕌 용산 할랄 7개 업장 시드 시작');
  await prisma.$executeRawUnsafe('BEGIN');
  try {
    await prisma.$executeRawUnsafe(HALAL_SQL);
    await prisma.$executeRawUnsafe('COMMIT');
    console.log('✅ 용산 할랄 시드 완료');
  } catch (e) {
    await prisma.$executeRawUnsafe('ROLLBACK');
    console.error('❌ 용산 할랄 시드 실패, 롤백됨:', e?.message || e);
    throw e;
  }
}

/** ─────────────────────────────────────────────────────────
 *  main() — 실행 엔트리포인트 (VM/Docker/로컬 공통)
 *  ───────────────────────────────────────────────────────── */
async function main() {
  console.log('🚀 Prisma Seed 시작');

  // 0) 참조 테이블 시드
  await ensureVeganSeed();
  await ensureCommonAlSeed();
  // await ensureOwnersSeed(10); // 필요 없으면 0으로 바꾸세요

  // 사장님 계정 갯수 계산
  let GANGNAM_VEGAN_STORES = [];
  try {
    const mod = await import('./gangnam_vegan.js');
    GANGNAM_VEGAN_STORES =
      (mod && (mod.GANGNAM_VEGAN_STORES || mod.default)) || [];
  } catch {}
  // const HALAL_COUNT = 7;
  // const VEGAN_COUNT = GANGNAM_VEGAN_STORES.length || 0;
  // const TOTAL_OWNERS = HALAL_COUNT + VEGAN_COUNT;

  await ensureOwnersSeed(0);

  // 1) 7개 업장 upsert (Sajang/BusinessCerti/Store 1:1 관계 + sto_halal=1)
  await runHalalYongsanSeed();

  // 강남 비건 가게
  try {
    const seedVeganGangnam = require('./seedVeganGangnam');
    await seedVeganGangnam(prisma);
  } catch (e) {
    console.log('⚠️ seedVeganGangnam 실행 중 경고:', e?.message || e);
  }

  // 2) 메뉴 + 재료 번역 + 비건단계 추론 + FoodTranslateEN/AR 저장
  try {
    console.log('🍽️ 할랄 매장 메뉴 시드 시작');
    await seedMenus(prisma);
    console.log('🍽️ 할랄 매장 메뉴 시드 완료');
  } catch (e) {
    console.log('⚠️ seedMenus 실행 중 경고:', e?.message || e);
  }

  console.log('🎉 기본 시드 데이터 완료');
}

// ========== 실행 ==========
main()
  .catch((e) => {
    console.error('❌ Seed 실행 중 에러:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
