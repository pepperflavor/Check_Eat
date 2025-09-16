import { ErrorCode } from "./error-codes";

export interface ErrorResponse {
  success: false;
  timestamp: string;
  path: string;
  status: number;
  code: ErrorCode;
  message: string;
  detail?: any;
  requestId?: string;
}
