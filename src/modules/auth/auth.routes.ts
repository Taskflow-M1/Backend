import { Router } from 'express';
import { createRateLimiter } from '../../middlewares/rate-limit.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { MESSAGES } from '../../utils/constants';
import {
  loginHandler,
  registerHandler,
  sendVerificationCodeHandler,
  verifyEmailCodeHandler,
} from './auth.controller';
import {
  loginSchema,
  registerSchema,
  sendVerificationCodeSchema,
  verifyEmailCodeSchema,
} from './auth.validation';

const authRouter = Router();

const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 20,
});

const verificationEmailRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxAttempts: 5,
  message: MESSAGES.AUTH.TOO_MANY_VERIFICATION_REQUESTS,
});

authRouter.post(
  '/register',
  verificationEmailRateLimiter,
  validate({ body: registerSchema }),
  registerHandler,
);

authRouter.post(
  '/login',
  loginRateLimiter,
  validate({ body: loginSchema }),
  loginHandler,
);

authRouter.post(
  '/send-verification-code',
  verificationEmailRateLimiter,
  validate({ body: sendVerificationCodeSchema }),
  sendVerificationCodeHandler,
);

authRouter.post(
  '/verify-email-code',
  validate({ body: verifyEmailCodeSchema }),
  verifyEmailCodeHandler,
);

export default authRouter;
