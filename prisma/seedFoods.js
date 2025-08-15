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

// ✅ 명시적 키워드 매핑
const allergyKeywords = {
  난류: ['계란', '에그', '오믈렛'],
  우유: ['치즈', '버터', '크림', '요거트'],
  대두: ['두부', '콩'],
  밀: ['빵', '파스타', '케이크', '쿠키'],
  땅콩: ['땅콩', '피넛'],
  호두: ['호두'],
  아황산류: ['와인', '식초'],
};

const veganKeywords = {
  '폴로 베지테리언': ['닭', '치킨'],
  '페스코 베지테리언': ['연어', '참치', '생선', '해산물', '새우', '오징어'],
  '락토 오보 베지테리언': ['계란', '치즈', '버터', '크림'],
  '오보 베지테리언': ['계란'],
  '락토 베지테리언': ['치즈', '버터', '크림', '요거트'],
  '비건 베지테리언': ['비건', '채식'],
};

function translateToEnglish(koreanName) {
  return koreanName.replace(/비건/gi, 'Vegan').replace(/버거/gi, 'Burger');
}

function translateToArabic(koreanName) {
  return koreanName.replace(/비건/gi, 'فيغان').replace(/버거/gi, 'برغر');
}

async function seedFoods() {
  for (const storeData of restaurantData) {
    const store = await prisma.store.findFirst({
      where: { sto_name: storeData.RSTRNT_NM },
    });

    if (!store) {
      console.warn(`⚠️ Store를 찾을 수 없음: ${storeData.RSTRNT_NM}`);
      continue;
    }

    if (!storeData.SLE_VGTR_MENU_INFO_DC) {
      console.warn(`⚠️ 메뉴 정보 없음: ${storeData.RSTRNT_NM}`);
      continue;
    }

    let priceBase = 10000;

    const menuItems = storeData.SLE_VGTR_MENU_INFO_DC.split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    for (const menu of menuItems) {
      const existingFood = await prisma.food.findFirst({
        where: {
          foo_name: menu,
          foo_sa_id: store.sto_sa_id,
        },
      });

      if (existingFood) {
        console.log(`⚠️ 이미 존재하는 음식: ${menu} (${storeData.RSTRNT_NM})`);
        continue;
      }

      // ✅ 비건 단계 분석
      let veganId = null;
      for (const [vegName, keywords] of Object.entries(veganKeywords)) {
        if (keywords.some((keyword) => menu.includes(keyword))) {
          const vegan = await prisma.vegan.findFirst({
            where: { veg_name: vegName },
          });
          if (vegan) veganId = vegan.veg_id;
          break;
        }
      }

      // ✅ 알러지 재료 추출
      const materials = [];
      const allergiesToConnect = [];

      for (const [coalName, keywords] of Object.entries(allergyKeywords)) {
        if (keywords.some((keyword) => menu.includes(keyword))) {
          materials.push(coalName);
          const allergy = await prisma.commonAl.findFirst({
            where: { coal_name: coalName },
          });
          if (allergy) {
            allergiesToConnect.push({ coal_id: allergy.coal_id });
          }
        }
      }

      // ✅ Food 생성
      const createdFood = await prisma.food.create({
        data: {
          foo_name: menu,
          foo_price: priceBase,
          foo_material: materials.length > 0 ? materials : [],
          foo_img: null,
          foo_status: 0,
          foo_sa_id: store.sto_sa_id,
          foo_vegan: veganId,
        },
      });

      console.log(
        `✅ 음식 생성: ${menu} (${storeData.RSTRNT_NM}) / 가격: ${priceBase} / 재료: ${materials.join(', ')}`,
      );

      // ✅ Store 연결 (다대다)
      await prisma.store.update({
        where: { sto_id: store.sto_id },
        data: {
          Food: {
            connect: { foo_id: createdFood.foo_id },
          },
        },
      });

      // ✅ CommonAl 연결 (다대다)
      if (allergiesToConnect.length > 0) {
        await prisma.food.update({
          where: { foo_id: createdFood.foo_id },
          data: {
            CommonAl: {
              connect: allergiesToConnect,
            },
          },
        });
        console.log(`🔗 ${menu}에 알러지 ${allergiesToConnect.length}개 연결`);
      }

      priceBase += 1000;
    }
  }
  console.log('🌱 음식 데이터 시드 완료');
}

module.exports = seedFoods;

// 직접 실행 시
if (require.main === module) {
  seedFoods()
    .catch((e) => {
      console.error('❌ SeedFoods 실행 중 에러 발생:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}