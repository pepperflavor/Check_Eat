import { reconcileVeganIds } from './vegan-reconcile';

describe('reconcileVeganIds', () => {
  it('완전 비건 재료: 항상 6 (둘 다 6이거나 LLM이 모르면 6 유지)', () => {
    expect(reconcileVeganIds(6, 6)).toBe(6);
  });

  it('규칙 6, LLM 2(페스코) → 더 보수적인 2', () => {
    expect(reconcileVeganIds(6, 2)).toBe(2);
  });

  it('규칙 2, LLM 0(비건 불가) → null', () => {
    expect(reconcileVeganIds(2, 0)).toBeNull();
  });

  it('규칙 null(비건 불가), LLM 6 → null (불가 우선)', () => {
    expect(reconcileVeganIds(null, 6)).toBeNull();
  });

  it('규칙 4, LLM 실패(null) → 4', () => {
    expect(reconcileVeganIds(4, null)).toBe(4);
  });

  it('둘 다 불명 → null', () => {
    expect(reconcileVeganIds(null, null)).toBeNull();
  });
});
