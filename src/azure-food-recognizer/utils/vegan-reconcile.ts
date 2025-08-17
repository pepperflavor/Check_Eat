
// llm 이랑 내 조건 으로 판단한거 비교해서 더 나은걸로 결과 리턴해줌
export function reconcileVeganIds(ruleVegId: number | null, llmVegId?: number | null): number | null {
    // 1) 비건 불가가 하나라도 있으면 무조건 null
    if (ruleVegId === null) return null;
    if (llmVegId === 0) return null;
  
    // 2) 둘 다 1..6이면 더 보수적인(숫자 작은) 쪽
    if (typeof ruleVegId === 'number' && ruleVegId >= 1 && ruleVegId <= 6 &&
        typeof llmVegId === 'number' && llmVegId >= 1 && llmVegId <= 6) {
      return Math.min(ruleVegId, llmVegId);
    }
  
    // 3) 한쪽만 유효하면 그쪽 사용
    if (typeof ruleVegId === 'number' && ruleVegId >= 1 && ruleVegId <= 6) return ruleVegId;
    if (typeof llmVegId === 'number' && llmVegId >= 1 && llmVegId <= 6)   return llmVegId;
  
    // 4) 둘 다 불명 → null(보수적)
    return null;
  }