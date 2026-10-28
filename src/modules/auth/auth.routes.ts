import { Router } from 'express';
import { createRateLimiter } from '../../middlewares/rate-limit.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { loginHandler, registerHandler } from './auth.controller';
import { loginSchema, registerSchema } from './auth.validation';

const authRouter = Router();

const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 20,
});

authRouter.post(
  '/register',
  validate({ body: registerSchema }),
  registerHandler,
);

authRouter.post(
  '/login',
  loginRateLimiter,
  validate({ body: loginSchema }),
  loginHandler,
);

export default authRouter;

