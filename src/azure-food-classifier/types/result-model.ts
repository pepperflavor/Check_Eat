export type AzurePrediction = {
  tagName: string;
  probability: number;
};

export type ModelResult = {
  model: string;
  predictions: AzurePrediction[];
};

// 🔹 최종 반환 타입
export type ClassifierResult = {
  accepted: boolean; // threshold 통과 여부
  label: string | null; // best 후보 tagName (accepted==false면 null)
  confidence: number; // best 후보 확률
  model: string | null; // best 후보를 낸 모델명
  threshold: number; // 임계값 (env)
  candidates: Array<{
    tagName: string;
    probability: number;
    model: string;
  }>; // 상위 후보들 (Top3)
  // 디버깅/분석용(선택)
  topPerModel?: Array<{
    model: string;
    tagName: string;
    probability: number;
  }>;
};
