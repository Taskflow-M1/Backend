import { NextFunction, Request, Response } from 'express';
import { UserModel } from '../modules/users/user.model';
import { AuthenticatedUser } from '../types/auth.types';
import { AppError } from '../utils/app-error';
import { MESSAGES } from '../utils/constants';
import { verifyAccessToken } from '../utils/jwt';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next(AppError.unauthorized(MESSAGES.AUTH.TOKEN_MISSING));
    return;
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1]) {
    next(AppError.unauthorized(MESSAGES.AUTH.TOKEN_INVALID));
    return;
  }

  const token = parts[1];

  try {
    const payload = verifyAccessToken(token);

    if (!OBJECT_ID_REGEX.test(payload.sub)) {
      next(AppError.unauthorized(MESSAGES.AUTH.TOKEN_INVALID));
      return;
    }

    const userExists = await UserModel.exists({ _id: payload.sub });
    if (!userExists) {
      next(AppError.unauthorized(MESSAGES.AUTH.TOKEN_INVALID));
      return;
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
    };

    next();
  } catch {
    next(AppError.unauthorized(MESSAGES.AUTH.TOKEN_INVALID));
  }
}

export function getAuthenticatedUser(req: Request): AuthenticatedUser {
  if (!req.user) {
    throw AppError.unauthorized(MESSAGES.AUTH.TOKEN_MISSING);
  }
  return req.user;
}

