import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { createRateLimiter } from '../../middlewares/rate-limit.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  getMeHandler,
  searchUsersHandler,
  updateMeHandler,
  updateMyPasswordHandler,
} from './user.controller';
import {
  searchUsersQuerySchema,
  updatePasswordSchema,
  updateProfileSchema,
} from './user.validation';

const userRouter = Router();

const passwordChangeLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 10,
});

userRouter.use(requireAuth);

userRouter.get(
  '/',
  validate({ query: searchUsersQuerySchema }),
  searchUsersHandler,
);

userRouter.get('/me', getMeHandler);

userRouter.patch(
  '/me',
  validate({ body: updateProfileSchema }),
  updateMeHandler,
);

userRouter.patch(
  '/me/password',
  passwordChangeLimiter,
  validate({ body: updatePasswordSchema }),
  updateMyPasswordHandler,
);

export default userRouter;
