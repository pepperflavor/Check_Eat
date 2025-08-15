const { PrismaClient } = require('@prisma/client');

// JSON 파일이 없으면 빈 배열 사용
let restaurantData = [];
try {
  restaurantData = require('./gangnam_restaurants.json');
} catch (error) {
  console.log('⚠️ JSON 파일을 찾을 수 없어 빈 배열 사용');
  restaurantData = [];
}

const prisma = new PrismaClient();

async function seedStores() {
  console.log('🏪 Store 데이터 삽입 시작...');
  
  for (const storeData of restaurantData) {
    // 기존 Store 확인
    const existingStore = await prisma.store.findFirst({
      where: { sto_name: storeData.RSTRNT_NM },
    });

    if (existingStore) {
      console.log(`⚠️ 이미 존재하는 Store: ${storeData.RSTRNT_NM}`);
      continue;
    }

    // 사장님 랜덤 선택 (1~10번 중)
    const randomSajangId = Math.floor(Math.random() * 10) + 1;
    
    try {
      // Store 생성
      const createdStore = await prisma.store.create({
        data: {
          sto_name: storeData.RSTRNT_NM,
          sto_name_en: storeData.RSTRNT_NM, // 영어명은 일단 한글명과 동일하게
          sto_address: storeData.RSTRNT_ROAD_NM_ADDR || storeData.RSTRNT_LNM_ADDR,
          sto_phone: storeData.RSTRNT_TEL_NO || '02-0000-0000',
          sto_latitude: parseFloat(storeData.RSTRNT_LA) || 37.5665,
          sto_longitude: parseFloat(storeData.RSTRNT_LO) || 126.9780,
          sto_img: null,
          sto_type: storeData.RSTRNT_CTGRY_NM || '기타',
          sto_status: 0, // 활성화
          sto_sa_id: randomSajangId,
        },
      });

      console.log(`✅ Store 생성: ${storeData.RSTRNT_NM} (사장님 ID: ${randomSajangId})`);
    } catch (error) {
      console.error(`❌ Store 생성 실패: ${storeData.RSTRNT_NM}`, error.message);
    }
  }
  
  console.log('🏪 Store 데이터 삽입 완료');
}

module.exports = seedStores;

// 직접 실행 시
if (require.main === module) {
  seedStores()
    .catch((e) => {
      console.error('❌ SeedStores 실행 중 에러 발생:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}