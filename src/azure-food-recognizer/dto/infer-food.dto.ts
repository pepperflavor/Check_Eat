
export class InferFoodResponseDto {
    status: 'ok' | 'false';
    source?: 'cv' | '4o-mini' | '4o';
    label?: string;
    confidence?: number;
    message?: string;
  }