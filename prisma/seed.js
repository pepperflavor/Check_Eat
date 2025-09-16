const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const seedStores = require('./seedStores');
const seedFoods = require('./seedFoods');

// JSON 파일이 없으면 빈 배열 사용
let restaurantData = [];
try {
  restaurantData = require('./gangnam_restaurants.json');
} catch (error) {

  restaurantData = [];
}

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

  console.log('🌱 기본 시드 데이터 삽입 완료');
  
  // Store 데이터 생성
  console.log('🏪 Store 시드 데이터 삽입 시작');
  await seedStores();
  
  // Food 데이터 생성
  console.log('🍽️ Food 시드 데이터 삽입 시작');
  await seedFoods();
}

main()
  .catch((e) => {
    console.error('❌ Seed 실행 중 에러 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });