export type Candidate = {
  name: string;
  confidence: number;
  rationale?: string;
};
export type LlmResult = {
  label: string;
  confidence: number;
  candidates: Candidate[];
  raw?: any;
};
