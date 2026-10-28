import { ERROR_CODES, ErrorCode, MESSAGES } from './constants';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;

  // Construit une erreur avec son statut HTTP et son code public.
  constructor(statusCode: number, code: ErrorCode, message: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  // Crée une erreur 400 lorsque les données reçues sont invalides.
  static badRequest(message: string = MESSAGES.VALIDATION.INVALID_INPUT): AppError {
    return new AppError(400, ERROR_CODES.INVALID_INPUT, message);
  }

  // Crée une erreur 401 lorsque l'authentification est absente ou incorrecte.
  static unauthorized(message: string = MESSAGES.COMMON.UNAUTHORIZED): AppError {
    return new AppError(401, ERROR_CODES.UNAUTHORIZED, message);
  }

  // Crée une erreur 403 lorsque l'utilisateur n'a pas les droits nécessaires.
  static forbidden(message: string = MESSAGES.COMMON.FORBIDDEN): AppError {
    return new AppError(403, ERROR_CODES.FORBIDDEN, message);
  }

  // Crée une erreur 404 lorsque la ressource demandée n'existe pas.
  static notFound(message: string = MESSAGES.COMMON.RESOURCE_NOT_FOUND): AppError {
    return new AppError(404, ERROR_CODES.NOT_FOUND, message);
  }

  // Crée une erreur 409 lorsqu'une règle d'unicité ou d'état est violée.
  static conflict(
    message: string,
    code: ErrorCode = ERROR_CODES.CONFLICT,
  ): AppError {
    return new AppError(409, code, message);
  }
}
