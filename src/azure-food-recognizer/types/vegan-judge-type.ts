export type VeganJudgeResult = {
    veg_id: number;                           // 0..6
    matched: Record<string, string[]>;        // 카테고리별 매칭된 재료
    reasoning: string;                        // 짧은 근거
  };