import { NextFunction, Request, RequestHandler, Response } from 'express';
import { env } from '../config/env';
import { AppError } from '../utils/app-error';
import { ERROR_CODES, MESSAGES } from '../utils/constants';

export interface RateLimitOptions {
  windowMs: number;
  maxAttempts: number;
  message?: string;
  enforceInTest?: boolean;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const store = new Map<string, RateLimitEntry>();
  const message = options.message ?? MESSAGES.AUTH.TOO_MANY_LOGIN_ATTEMPTS;

  return (req: Request, res: Response, next: NextFunction): void => {
    if (env.nodeEnv === 'test' && !options.enforceInTest) {
      next();
      return;
    }

    const now = Date.now();
    const clientKey = req.ip || 'unknown';
    const current = store.get(clientKey);

    if (!current || now >= current.resetAt) {
      // Opportunistically purge expired entries when size grows
      if (store.size > 500) {
        for (const [key, entry] of store.entries()) {
          if (now >= entry.resetAt) {
            store.delete(key);
          }
        }
      }

      store.set(clientKey, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      next();
      return;
    }

    if (current.count >= options.maxAttempts) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1000),
      );
      res.setHeader('Retry-After', String(retryAfterSeconds));
      next(new AppError(429, ERROR_CODES.TOO_MANY_REQUESTS, message));
      return;
    }

    current.count += 1;
    next();
  };
}

