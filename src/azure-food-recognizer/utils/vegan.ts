// 비건 추측

// 카테고리별 한글 키워드 세트
export const MEAT_KEYWORDS = [
  '소고기',
  '쇠고기',
  '우육',
  '돼지고기',
  '돈육',
  '양고기',
  '염소고기',
  '말고기',
  '사슴고기',
  '베이컨',
  '햄',
  '소시지',
  '족발',
  '스팸',
  '차슈',
  '곱창',
  '막창',
  '순대',
  '사골',
  '우육분말',
];

export const POULTRY_KEYWORDS = [
  '닭',
  '치킨',
  '계육',
  '닭고기',
  '삼계',
  '닭가슴살',
  '닭다리',
  '칠면조',
  '오리',
];

export const FISH_SEAFOOD_KEYWORDS = [
  '생선',
  '어류',
  '참치',
  '연어',
  '고등어',
  '멸치',
  '가다랭이',
  '다시마어분',
  '어분',
  '어간장',
  '새우',
  '오징어',
  '문어',
  '낙지',
  '꽃게',
  '게',
  '크랩',
  '가재',
  '조개',
  '홍합',
  '굴',
  '바지락',
  '해물',
  '해산물',
  '액젓',
  '멸치액젓',
  '까나리액젓',
  '젓갈',
  '새우젓',
  '황석어젓',
  '오징어젓',
];

const EGG_KEYWORDS = [
  '계란',
  '달걀',
  '난황',
  '난백',
  '메렝',
  '마요네즈',
  '마요',
];

const DAIRY_KEYWORDS = [
  '우유',
  '분유',
  '연유',
  '크림',
  '생크림',
  '휘핑크림',
  '크림치즈',
  '치즈',
  '모짜렐라',
  '파마산',
  '리코타',
  '요거트',
  '버터',
  '버터밀크',
  '유청',
  '유청분말',
  '카제인',
  '크림파우더',
  '연화유지',
];

export const GELATIN_KEYWORDS = ['젤라틴', '아교', '콜라겐'];
const HONEY_KEYWORDS = ['꿀', '벌꿀'];
const INSECT_COLORANTS = ['코치닐', '카민', '카민산']; // 선택

export function containsAny(haystack: string, arr: string[]) {
  return arr.some((k) => haystack.includes(k));
}

// ✅ 식물성 오일/향신료 화이트리스트 (전부 비건)
export const PLANT_OILS = [
  '올리브 오일',
  '올리브오일',
  '엑스트라버진 올리브 오일',
  '카놀라유',
  '포도씨유',
  '해바라기유',
  '콩기름',
  '옥수수유',
  '아보카도 오일',
  '참기름',
  '들기름',
  '코코넛 오일',
  '코코넛오일',
  '식용유',
  '현미유',
  '쌀겨유',
  '호박씨유',
  '아마씨유',
];

export const COMMON_SPICES = [
  '후추',
  '소금',
  '설탕',
  '고추가루',
  '파프리카 가루',
  '커민',
  '강황',
  '계피',
  '정향',
  '카다멈',
  '마늘가루',
  '양파가루',
  '오레가노',
  '바질',
  '소금',
];

export function includesAny(target: string, list: string[]) {
  return list.some((k) => target.includes(k));
}

export function judgeVeganByRules(ingredients: string[]): number | null {
  const list = Array.from(
    new Set(ingredients.map((s) => s.trim()).filter(Boolean)),
  );

  // 0) 화이트리스트는 '비건에 영향 없음'으로 먼저 제거
  const filtered = list.filter((item) => {
    if (includesAny(item, PLANT_OILS)) return false;
    if (includesAny(item, COMMON_SPICES)) return false;
    return true;
  });

  // 1) 카테고리 플래그
  const hasRedMeat = filtered.some((i) => includesAny(i, MEAT_KEYWORDS));
  const hasPoultry = filtered.some((i) => includesAny(i, POULTRY_KEYWORDS));
  const hasSeafood = filtered.some((i) =>
    includesAny(i, FISH_SEAFOOD_KEYWORDS),
  );
  const hasEgg = filtered.some((i) => includesAny(i, EGG_KEYWORDS));
  const hasDairy = filtered.some((i) => includesAny(i, DAIRY_KEYWORDS));
  const hasGelatin = filtered.some((i) => includesAny(i, GELATIN_KEYWORDS));
  const hasHoney = filtered.some((i) => includesAny(i, HONEY_KEYWORDS));
  const hasInsectClr = filtered.some((i) => includesAny(i, INSECT_COLORANTS));

  if (hasRedMeat || hasGelatin || hasHoney || hasInsectClr) return null;
  if (hasPoultry) return 1;
  if (hasSeafood) return 2;
  if (hasDairy && hasEgg) return 3;
  if (hasEgg) return 4;
  if (hasDairy) return 5;
  return 6;
}
