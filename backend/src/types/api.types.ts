import { ErrorCode } from '../utils/constants';

export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
}

export interface ApiErrorResponse {
  error: ApiErrorBody;
}

export interface ApiListResponse<T> {
  items: T[];
}

