import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 🌱 Vegan 데이터 삽입
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
  }

  // 🌱 CommonAl 데이터 삽입
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
  }

  // ✅ 비밀번호 해시 함수
  const hashPassword = async (plainPassword: string) => {
    const saltRounds = 10; // salt cost factor
    return bcrypt.hash(plainPassword, saltRounds);
  };

  // 🌱 User용 LoginData 생성
  const loginUser1 = await prisma.loginData.create({
    data: {
      ld_usergrade: 0,
      ld_log_id: 'user1_id',
      ld_email: 'user1@example.com',
      ld_pwd: await hashPassword('password1'),
      ld_status: 0,
    },
  });
  const loginUser2 = await prisma.loginData.create({
    data: {
      ld_usergrade: 0,
      ld_log_id: 'user2_id',
      ld_email: 'user2@example.com',
      ld_pwd: await hashPassword('password2'),
      ld_status: 0,
    },
  });
  const loginUser3 = await prisma.loginData.create({
    data: {
      ld_usergrade: 0,
      ld_log_id: 'user3_id',
      ld_email: 'user3@example.com',
      ld_pwd: await hashPassword('password3'),
      ld_status: 0,
    },
  });

  // 🌱 User 생성 후 LoginData와 연결
  const user1 = await prisma.user.create({
    data: {
      user_nick: 'User1',
      user_pro_img: '0',
      user_is_halal: 0,
      user_apple: 0,
      user_allergy_common: { connect: [{ coal_id: 1 }, { coal_id: 2 }] },
    },
  });
  await prisma.loginData.update({
    where: { ld_id: loginUser1.ld_id },
    data: { ld_user_id: user1.user_id },
  });

  const user2 = await prisma.user.create({
    data: {
      user_nick: 'User2',
      user_pro_img: '0',
      user_is_halal: 0,
      user_apple: 0,
      user_allergy_common: { connect: [{ coal_id: 3 }, { coal_id: 4 }] },
    },
  });
  await prisma.loginData.update({
    where: { ld_id: loginUser2.ld_id },
    data: { ld_user_id: user2.user_id },
  });

  const user3 = await prisma.user.create({
    data: {
      user_nick: 'User3',
      user_pro_img: '0',
      user_is_halal: 0,
      user_apple: 0,
      user_allergy_common: { connect: [{ coal_id: 5 }, { coal_id: 6 }] },
    },
  });
  await prisma.loginData.update({
    where: { ld_id: loginUser3.ld_id },
    data: { ld_user_id: user3.user_id },
  });

  // 🌱 Sajang용 LoginData 생성
  const loginOwner1 = await prisma.loginData.create({
    data: {
      ld_usergrade: 1,
      ld_log_id: 'owner1_id',
      ld_email: 'owner1@example.com',
      ld_pwd: await hashPassword('passwordOwner1'),
      ld_status: 0,
    },
  });
  const loginOwner2 = await prisma.loginData.create({
    data: {
      ld_usergrade: 1,
      ld_log_id: 'owner2_id',
      ld_email: 'owner2@example.com',
      ld_pwd: await hashPassword('passwordOwner2'),
      ld_status: 0,
    },
  });

  // 🌱 Sajang 생성 후 LoginData와 연결
  const sajang1 = await prisma.sajang.create({
    data: { sa_img: null, sa_certification: 0, sa_certi_status: 1 },
  });
  await prisma.loginData.update({
    where: { ld_id: loginOwner1.ld_id },
    data: { ld_sajang_id: sajang1.sa_id },
  });

  const sajang2 = await prisma.sajang.create({
    data: { sa_img: null, sa_certification: 1, sa_certi_status: 0 },
  });
  await prisma.loginData.update({
    where: { ld_id: loginOwner2.ld_id },
    data: { ld_sajang_id: sajang2.sa_id },
  });

  console.log('✅ User, Sajang, LoginData 초기 데이터 삽입 완료!');
}

main()
  .catch((e) => {
    console.error('❌ Seed 실행 중 에러 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    prisma.$disconnect();
  });
