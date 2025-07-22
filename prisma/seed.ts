import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 🌱 Vegan 테이블 초기 데이터 삽입
  const veganStages = [
    "폴로 베지테리언",
    "페스코 베지테리언",
    "락토 오보 베지테리언",
    "오보 베지테리언",
    "락토 베지테리언",
    "비건 베지테리언",
  ];

  console.log("🌱 Vegan 테이블 초기 데이터 삽입 중...");
  for (const veg_name of veganStages) {
    await prisma.vegan.upsert({
      where: { veg_name },
      update: {},
      create: { veg_name },
    });
  }

  // 🌱 CommonAl 테이블 초기 데이터 삽입
  const commonAllergies = [
    { coal_id: 1, coal_name: "난류" },
    { coal_id: 2, coal_name: "우유" },
    { coal_id: 3, coal_name: "메밀" },
    { coal_id: 4, coal_name: "땅콩" },
    { coal_id: 5, coal_name: "대두" },
    { coal_id: 6, coal_name: "밀" },
    { coal_id: 7, coal_name: "고등어" },
    { coal_id: 8, coal_name: "게" },
    { coal_id: 9, coal_name: "새우" },
    { coal_id: 10, coal_name: "돼지고기" },
    { coal_id: 11, coal_name: "복숭아" },
    { coal_id: 12, coal_name: "토마토" },
    { coal_id: 13, coal_name: "아황산류" },
    { coal_id: 14, coal_name: "호두" },
    { coal_id: 15, coal_name: "닭고기" },
    { coal_id: 16, coal_name: "쇠고기" },
    { coal_id: 17, coal_name: "오징어" },
    { coal_id: 18, coal_name: "조개류" },
    { coal_id: 19, coal_name: "잣" },
  ];

  console.log("🌱 CommonAl 테이블 초기 데이터 삽입 중...");
  for (const allergy of commonAllergies) {
    await prisma.commonAl.upsert({
      where: { coal_id: allergy.coal_id },
      update: {},
      create: {
        coal_id: allergy.coal_id,
        coal_name: allergy.coal_name,
      },
    });
  }

  console.log("✅ 초기 데이터 삽입 완료!");
}

main()
  .catch((e) => {
    console.error("❌ 에러 발생:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });