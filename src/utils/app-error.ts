import { ERROR_CODES, ErrorCode, MESSAGES } from './constants';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;

  constructor(statusCode: number, code: ErrorCode, message: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(message: string = MESSAGES.VALIDATION.INVALID_INPUT): AppError {
    return new AppError(400, ERROR_CODES.INVALID_INPUT, message);
  }

  static unauthorized(message: string = MESSAGES.COMMON.UNAUTHORIZED): AppError {
    return new AppError(401, ERROR_CODES.UNAUTHORIZED, message);
  }

  static forbidden(message: string = MESSAGES.COMMON.FORBIDDEN): AppError {
    return new AppError(403, ERROR_CODES.FORBIDDEN, message);
  }

  static notFound(message: string = MESSAGES.COMMON.RESOURCE_NOT_FOUND): AppError {
    return new AppError(404, ERROR_CODES.NOT_FOUND, message);
  }

  static conflict(
    message: string,
    code: ErrorCode = ERROR_CODES.CONFLICT,
  ): AppError {
    return new AppError(409, code, message);
  }
}

