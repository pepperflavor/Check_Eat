// src/azure-food-recognizer/utils/vegan-rules.spec.ts

import { judgeVeganByRules } from "./vegan";


describe('judgeVeganByRules', () => {
  it('비건 재료만 있으면 veg_id=6', () => {
    const case1 = ['양배추', '후추', '올리브 오일'];
    expect(judgeVeganByRules(case1)).toBe(6);
  });

  it('가금류가 포함되면 veg_id=1', () => {
    expect(judgeVeganByRules(['닭가슴살', '후추'])).toBe(1);
  });

  it('해산물이 포함되면 veg_id=2', () => {
    expect(judgeVeganByRules(['멸치', '올리브 오일'])).toBe(2);
  });

  it('유제품만 있으면 veg_id=5', () => {
    expect(judgeVeganByRules(['치즈', '소금'])).toBe(5);
  });

  it('달걀만 있으면 veg_id=4', () => {
    expect(judgeVeganByRules(['계란', '후추'])).toBe(4);
  });

  it('젤라틴, 꿀, 코치닐 등 포함 시 null 반환', () => {
    expect(judgeVeganByRules(['젤라틴', '설탕'])).toBeNull();
  });
});