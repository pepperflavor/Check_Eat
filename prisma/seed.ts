import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import restaurantData from './gangnam_restaurants.json'; // JSON 파일 import
import seedFoods from './seedFoods';

const prisma = new PrismaClient();

async function main() {
  // ✅ Vegan 데이터 삽입
  const veganCount = await prisma.vegan.count();
  if (veganCount === 0) {
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
    });
  } else {
    console.log('✅ Vegan 데이터 이미 존재');
  }

  // ✅ CommonAl 데이터 삽입
  const allergyCount = await prisma.commonAl.count();
  if (allergyCount === 0) {
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
    });
  } else {
    console.log('✅ CommonAl 데이터 이미 존재');
  }

  // ✅ 사장님 10명 생성
  for (let i = 1; i <= 10; i++) {
    const logId = `owner${i}_id`;
    const existingLogin = await prisma.loginData.findUnique({
      where: { ld_log_id: logId },
    });

    if (!existingLogin) {
      // 사장 생성
      const sajang = await prisma.sajang.create({
        data: {
          // sa_img: null, // 프로필 이미지 null
          sa_phone: "010-1234-5678",
          sa_certification: 0,
          sa_certi_status: i % 2, // 짝수: 인증 완료(1), 홀수: 대기(0)
        },
      });

      // 업주용 LoginData 생성 및 Sajang 연결
      const hashedPwd = await bcrypt.hash(`passwordOwner${i}`, 12);
      const login = await prisma.loginData.create({
        data: {
          ld_usergrade: 1,
          ld_log_id: logId,
          ld_email: `owner${i}@example.com`,
          ld_pwd: hashedPwd,
          ld_status: 0,
          ld_sajang_id: sajang.sa_id,
        },
      });

      console.log(`✅ 사장님 및 LoginData 생성 완료: ${logId}`);
    } else {
      console.log(`⚠️ 사장님 및 LoginData 이미 존재: ${logId}`);
    }
  }

  // ✅ 각 사장님에 Store 2개씩 배정 (순서대로)
  const selectedStores = restaurantData.slice(0, 20); // JSON 상위 20개 사용
  for (let i = 0; i < 10; i++) {
    const halalFlag = i < 5 ? 0 : 1; // 1~5번 사장: 할랄=0 / 6~10번 사장: 할랄=1

    // 사장님 찾기
    const logId = `owner${i + 1}_id`;
    const login = await prisma.loginData.findUnique({
      where: { ld_log_id: logId },
      include: { sajang: true },
    });

    if (login?.sajang) {
      for (let j = 0; j < 2; j++) {
        const storeData = selectedStores[i * 2 + j];
        const existingStore = await prisma.store.findFirst({
          where: { sto_name: storeData.RSTRNT_NM },
        });

        if (!existingStore) {
          await prisma.store.create({
            data: {
              sto_name: storeData.RSTRNT_NM,
              sto_name_en: 'TEMP_STORE_NAME',
              sto_address: storeData.RSTRNT_ROAD_NM_ADDR,
              sto_phone: storeData.RSTRNT_TEL_NO ?? null,
              sto_latitude: parseFloat(storeData.RSTRNT_LA),
              sto_longitude: parseFloat(storeData.RSTRNT_LO),
              sto_halal: halalFlag,
              sto_type: storeData.RSTRNT_CTGRY_NM,
              sto_img: null,
              sto_status: 0,
              sajang: { connect: { sa_id: login.sajang.sa_id } },
            },
          });
          console.log(`✅ Store 생성 완료: ${storeData.RSTRNT_NM}`);
        } else {
          console.log(`⚠️ Store 이미 존재: ${storeData.RSTRNT_NM}`);
        }
      }
    }
  }

  console.log('🌱 시드 데이터 삽입 완료');
  console.log('음식 시드 데이터 삽입시작');
  await seedFoods();
}

main()
  .catch((e) => {
    console.error('❌ Seed 실행 중 에러 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    prisma.$disconnect();
  });
