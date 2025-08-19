// prisma/seedHolidays.js
/* eslint-disable no-console */
'use strict';

/** @param {import('@prisma/client').PrismaClient} prisma */
module.exports = async function seedHolidays(prisma) {
  // 요일 헬퍼: 인자 순서 (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
  const R = (mon, tue, wed, thu, fri, sat, sun) => ({ mon, tue, wed, thu, fri, sat, sun });

  // ===== 수집된 영업/휴무 정보 =====
  // 전화번호는 Store에 저장된 값과 일치
  const HOLIDAYS = [
    // ────────── [용산 · 할랄 7곳] ──────────
    {
      label: 'EID Halal Korean Food',
      phone: '070-8899-8210',
      regularClosed: [], // 인스타: “We open everyday”
      break: null,
      hours: R('11:30-21:00','11:30-21:00','11:30-21:00','11:30-21:00','11:30-21:00','11:30-21:00','11:30-21:00'),
      sources: ['IG bio(we open everyday). Trazy(과거 월휴무 표기)'],
    },
    {
      label: 'Sultan Kebab (Itaewon)',
      phone: '02-749-3890',
      regularClosed: [],
      break: null,
      hours: R('00:00-24:00','00:00-24:00','00:00-24:00','00:00-24:00','00:00-24:00','00:00-24:00','00:00-24:00'),
      sources: ['IG bio “연중무휴·24시간”', 'VisitSeoul “연중무휴”'],
    },
    {
      label: 'Kervan Restaurant (Itaewon)',
      phone: '02-792-4767',
      regularClosed: [],
      break: null,
      hours: R('10:00-23:00','10:00-23:00','10:00-23:00','10:00-23:00','10:00-23:00','10:00-23:00','10:00-23:00'),
      sources: ['IG bio 10:00~23:00'],
    },
    {
      label: 'Kervan Bakery & Cafe',
      phone: '02-790-5585',
      regularClosed: [], // 금/토 24시간, 그 외 10-22
      break: null,
      hours: R('10:00-22:00','10:00-22:00','10:00-22:00','10:00-22:00','00:00-24:00','00:00-24:00','10:00-22:00'),
      sources: ['IG bio “Fri/Sat 24h, otherwise 10–22”'],
    },
    {
      label: 'Home Cooking Master Kim (Starcatering)',
      phone: '02-792-3731',
      regularClosed: ['Sun'], // IG: 월–토 영업 + 브레이크
      break: '14:00-15:00',
      hours: R('11:30-21:40','11:30-21:40','11:30-21:40','11:30-21:40','11:30-21:40','11:30-21:40',null),
      sources: ['IG bio “월–토 11:30–21:40 (Break 2–3)”'],
    },
    {
      label: 'Mr. Kebab (Itaewon)',
      phone: '070-7758-1997',
      regularClosed: [],
      break: null,
      hours: R('11:30-03:00','11:30-03:00','11:30-03:00','11:30-03:00','11:30-03:00','11:30-03:00','11:30-03:00'),
      sources: ['Trazy 11:30–03:00(일반표기). 일부 SNS에 24시간 언급 있음'],
    },
    {
      label: 'The Halal Guys (Itaewon)',
      phone: '02-794-8308',
      regularClosed: [],
      break: null,
      hours: R('11:00-22:00','11:00-22:00','11:00-22:00','11:00-22:00','11:00-22:00','11:00-22:00','11:00-22:00'),
      sources: ['공식 사이트 매장 정보 11–22'],
    },

    // ────────── [강남 · 비건 10곳] ──────────
    {
      label: 'PLANTUDE (COEX)',
      phone: '02-551-3933',
      regularClosed: [],
      break: null,
      hours: R('11:00-21:00','11:00-21:00','11:00-21:00','11:00-21:00','11:00-21:00','11:00-21:00','11:00-21:00'),
      sources: ['HappyCow listing (Mon–Sun 11–21)'],
    },
    {
      label: 'Mahina Vegan Table',
      phone: '0507-1371-5331',
      regularClosed: [],
      break: '16:00-17:00',
      hours: R('12:00-21:00','12:00-21:00','12:00-21:00','12:00-21:00','12:00-21:00','12:00-21:00','12:00-21:00'),
      sources: ['VisitSeoul “12–21 / Break 16–17 (LO 20:20)”'],
    },
    {
      label: "Monk's Butcher (Dosan)",
      phone: '02-795-1108',
      regularClosed: ['Mon'],
      break: null,
      hours: R(null,'12:00-15:00,17:00-22:30','12:00-15:00,17:00-22:30','12:00-15:00,17:00-22:30','12:00-15:00,17:00-22:30','11:00-22:30','11:00-15:00,17:00-22:30'),
      sources: ['Wanderlog hours (Mon closed; split hours on other days)'],
    },
    {
      label: 'SUN THE BUD (Cheongdam)',
      phone: '02-2138-1377',
      regularClosed: [],
      break: null,
      hours: R('10:00-21:00','10:00-21:00','10:00-21:00','10:00-21:00','10:00-21:00','10:00-21:00','10:00-21:00'),
      sources: ['Triple listing 10–21'],
    },
    {
      label: 'NORDI',
      phone: '0507-1420-3320',
      regularClosed: [],
      break: null,
      hours: R('11:00-20:00','11:00-20:00','11:00-20:00','11:00-20:00','11:00-20:00','11:00-20:00','11:00-20:00'),
      sources: ['공식 인스타 bio “영업시간 11~20시”'],
    },
    {
      label: 'Dahlia Dining',
      phone: '070-4482-0102',
      regularClosed: [],
      break: '15:00-18:00',
      hours: R('12:00-15:00,18:00-21:30','12:00-15:00,18:00-21:30','12:00-15:00,18:00-21:30','12:00-15:00,18:00-21:30','12:00-15:00,18:00-21:30','12:00-15:00,18:00-21:30','12:00-15:00,18:00-21:30'),
      sources: ['공식 사이트 Map/영업시간, IG 공지 (설 연휴 제외)'],
    },
    {
      label: 'Veg Green',
      phone: '02-577-6316',
      regularClosed: [],
      break: '14:30-18:00',
      hours: R('12:00-21:00','12:00-21:00','12:00-21:00','12:00-21:00','12:00-21:00','12:00-21:00','12:00-21:00'),
      sources: ['DiningCode “영업 12–21, 브레이크 14:30–18:00”'],
    },
    {
      label: 'UUUM Eatery',
      phone: '0507-1402-2048',
      regularClosed: ['Mon','Tue'], // 인스타 고정 안내
      break: null,
      hours: R(null,null,'11:30-15:00,17:30-21:00','11:30-15:00,17:30-21:00','11:30-15:00,17:30-21:00','09:00-16:00,17:00-21:00','09:00-16:00,17:00-21:00'),
      sources: ['HappyCow(요일별), IG bio “매주 월·화 휴무”'],
    },
    {
      label: 'An-sik Restaurant',
      phone: '0507-1370-7861',
      regularClosed: [],
      break: null,
      hours: R('11:30-21:30','11:30-21:30','11:30-21:30','11:30-21:30','11:30-21:30','11:30-21:30','11:30-21:30'),
      sources: ['식신 “매일 11:30~21:30”'],
    },
    {
      label: 'Chickpeace (Sinsa Garosu-gil)',
      phone: '02-6956-6780',
      regularClosed: [],
      break: null,
      hours: R('11:30-21:00','11:30-21:00','11:30-21:00','11:30-21:00','11:30-21:00','11:30-21:00','11:30-21:00'),
      sources: ['식신/공식 홈페이지 안내'],
    },
  ];

  // ===== upsert by store phone =====
  for (const h of HOLIDAYS) {
    const store = await prisma.store.findFirst({
      where: { sto_phone: h.phone },
      select: { sto_id: true },
    });
    if (!store) {
      console.log(`⚠️ Store 미발견: ${h.label} (${h.phone}) — 건너뜀`);
      continue;
    }

    // holi_break는 null 불가 → 빈 문자열로 정규화
    const breakStr = h.break ?? '';

    const data = {
      holi_weekday: 0, // (현재 미사용) 고정
      holi_break: breakStr,
      holi_runtime_mon: h.hours.mon,
      holi_runtime_tue: h.hours.tue,
      holi_runtime_wed: h.hours.wed,
      holi_runtime_thu: h.hours.thu,
      holi_runtime_fri: h.hours.fri,
      holi_runtime_sat: h.hours.sat,
      holi_runtime_sun: h.hours.sun,
      holi_regular: h.regularClosed,
      holi_public: [], // 명절 등은 추후 필요시 세부 반영
      store_id: store.sto_id,
    };

    await prisma.holiday.upsert({
      where: { store_id: store.sto_id },
      create: data,
      update: data,
    });

    console.log(`✅ Holiday upsert: ${h.label} (${h.phone})`);
  }

  console.log('🎉 Holiday 시드 완료');
};