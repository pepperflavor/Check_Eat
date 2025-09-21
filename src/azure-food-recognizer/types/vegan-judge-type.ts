export type VeganJudgeResult = {
    veg_id: number;                          
    matched: Record<string, string[]>;        // 카테고리별 매칭된 재료
    reasoning: string;                        
  };