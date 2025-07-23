import { PrismaClient } from '@prisma/client';
import restaurantData from './gangnam_restaurants.json';

const prisma = new PrismaClient();

// ✅ 명시적 타입 지정
const allergyKeywords: Record<string, string[]> = {
  난류: ['계란', '에그', '오믈렛'],
  우유: ['치즈', '버터', '크림', '요거트'],
  대두: ['두부', '콩'],
  밀: ['빵', '파스타', '케이크', '쿠키'],
  땅콩: ['땅콩', '피넛'],
  호두: ['호두'],
  아황산류: ['와인', '식초'],
};

const veganKeywords: Record<string, string[]> = {
  '폴로 베지테리언': ['닭', '치킨'],
  '페스코 베지테리언': ['연어', '참치', '생선', '해산물', '새우', '오징어'],
  '락토 오보 베지테리언': ['계란', '치즈', '버터', '크림'],
  '오보 베지테리언': ['계란'],
  '락토 베지테리언': ['치즈', '버터', '크림', '요거트'],
  '비건 베지테리언': ['비건', '채식'],
};

function translateToEnglish(koreanName: string): string {
  return koreanName.replace(/비건/gi, 'Vegan').replace(/버거/gi, 'Burger');
}

function translateToArabic(koreanName: string): string {
  return koreanName.replace(/비건/gi, 'فيغان').replace(/버거/gi, 'برغر');
}

export default async function seedFoods() {
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

      // ✅ FoodTranslate 생성
      const foodTranslate = await prisma.foodTranslate.create({
        data: {
          ft_name_en: translateToEnglish(menu),
          ft_name_ar: translateToArabic(menu),
          ft_mt_en: null,
          ft_mt_ar: null,
          ft_price_en: `${priceBase} KRW`,
          ft_price_ar: `${priceBase} 원`,
        },
      });

      // ✅ 비건 단계 분석
      let veganId: number | null = null;
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
      const materials: string[] = [];
      const allergiesToConnect: { coal_id: number }[] = [];

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
          foo_material: materials.length > 0 ? materials.join(', ') : null,
          foo_img: null,
          foo_status: 0,
          foo_sa_id: store.sto_sa_id,
          foo_vegan: veganId,
          ft_id: foodTranslate.ft_id,
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
              connect: allergiesToConnect as any, // ✅ 타입 안전성 우회
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

// main()
//   .catch((e) => {
//     console.error('❌ Seed 실행 중 에러 발생:', e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     prisma.$disconnect();
//   });
