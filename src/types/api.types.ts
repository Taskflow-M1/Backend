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

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiPaginatedListResponse<T> extends ApiListResponse<T> {
  pagination: PaginationMeta;
}
