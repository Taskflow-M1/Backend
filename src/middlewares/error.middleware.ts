import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { redactMongoUri } from '../config/database';
import { env } from '../config/env';
import { ApiErrorResponse } from '../types/api.types';
import { AppError } from '../utils/app-error';
import { ERROR_CODES, MESSAGES } from '../utils/constants';
import { formatZodError } from './validate.middleware';

// Détecte une requête contenant un JSON invalide.
function isMalformedJsonError(err: unknown): boolean {
  return (
    err instanceof SyntaxError &&
    'status' in err &&
    err.status === 400 &&
    'body' in err
  );
}

// Détecte un corps HTTP qui dépasse la taille autorisée.
function isPayloadTooLargeError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    err.type === 'entity.too.large'
  );
}

// Retourne une erreur uniforme lorsqu’aucune route ne correspond.
export function notFoundMiddleware(
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  next(
    new AppError(404, ERROR_CODES.NOT_FOUND, MESSAGES.COMMON.ROUTE_NOT_FOUND),
  );
}

// Express exige quatre paramètres pour reconnaître un middleware d'erreur.
export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response<ApiErrorResponse>,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    const appError = formatZodError(err);
    res.status(appError.statusCode).json({
      error: {
        code: appError.code,
        message: appError.message,
      },
    });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      error: {
        code: ERROR_CODES.INVALID_INPUT,
        message: MESSAGES.VALIDATION.INVALID_OBJECT_ID,
      },
    });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      error: {
        code: ERROR_CODES.INVALID_INPUT,
        message: MESSAGES.VALIDATION.INVALID_INPUT,
      },
    });
    return;
  }

  if (isMalformedJsonError(err)) {
    res.status(400).json({
      error: {
        code: ERROR_CODES.INVALID_INPUT,
        message: MESSAGES.COMMON.INVALID_JSON,
      },
    });
    return;
  }

  if (isPayloadTooLargeError(err)) {
    res.status(400).json({
      error: {
        code: ERROR_CODES.INVALID_INPUT,
        message: MESSAGES.COMMON.PAYLOAD_TOO_LARGE,
      },
    });
    return;
  }

  if (env.nodeEnv !== 'test') {
    const details =
      err instanceof Error
        ? env.nodeEnv === 'development' && err.stack
          ? redactMongoUri(err.stack)
          : `${err.name}: ${redactMongoUri(err.message)}`
        : 'Unknown error';
    console.error('[Unhandled Error]', details);
  }

  res.status(500).json({
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: MESSAGES.COMMON.INTERNAL_ERROR,
    },
  });
}
