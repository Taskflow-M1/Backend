import { NextFunction, Request, RequestHandler, Response } from 'express';
import { z, ZodError, ZodType } from 'zod';
import { AppError } from '../utils/app-error';
import { MESSAGES } from '../utils/constants';

export interface ValidationSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

export const objectIdSchema = z
  .string({ error: MESSAGES.VALIDATION.INVALID_OBJECT_ID })
  .regex(/^[0-9a-fA-F]{24}$/, MESSAGES.VALIDATION.INVALID_OBJECT_ID);

export const idParamSchema = z
  .object({
    id: objectIdSchema,
  })
  .strict();

const DEFAULT_ZOD_PREFIXES = [
  'Invalid input',
  'Too small',
  'Too big',
  'Invalid string',
  'Invalid option',
  'Unrecognized key',
];

// Transforme les erreurs Zod en une erreur métier lisible.
export function formatZodError(error: ZodError): AppError {
  const firstIssue = error.issues[0];

  if (!firstIssue) {
    return AppError.badRequest(MESSAGES.VALIDATION.INVALID_INPUT);
  }

  if (firstIssue.code === 'unrecognized_keys' && 'keys' in firstIssue) {
    const keys = (firstIssue.keys as string[]).join(', ');
    return AppError.badRequest(
      `${MESSAGES.VALIDATION.UNRECOGNIZED_KEYS} : ${keys}.`,
    );
  }

  const isDefaultZodMessage = DEFAULT_ZOD_PREFIXES.some((prefix) =>
    firstIssue.message.startsWith(prefix),
  );

  if (isDefaultZodMessage) {
    const fieldPath =
      firstIssue.path.length > 0 ? ` (${firstIssue.path.join('.')})` : '';
    return AppError.badRequest(
      `${MESSAGES.VALIDATION.INVALID_INPUT}${fieldPath}`,
    );
  }

  return AppError.badRequest(firstIssue.message);
}

// Crée le middleware qui valide body, params et query avec Zod.
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.params) {
      const parsedParams = schemas.params.safeParse(req.params);
      if (!parsedParams.success) {
        next(formatZodError(parsedParams.error));
        return;
      }
      req.params = parsedParams.data as Record<string, string>;
    }

    if (schemas.query) {
      const parsedQuery = schemas.query.safeParse(req.query);
      if (!parsedQuery.success) {
        next(formatZodError(parsedQuery.error));
        return;
      }
      // Express 5 defines req.query as a getter-only property on prototype
      Object.defineProperty(req, 'query', {
        value: parsedQuery.data,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }

    if (schemas.body) {
      const parsedBody = schemas.body.safeParse(req.body);
      if (!parsedBody.success) {
        next(formatZodError(parsedBody.error));
        return;
      }
      req.body = parsedBody.data;
    }

    next();
  };
}
