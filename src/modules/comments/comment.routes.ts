/** Déclare les routes de lecture, création, modification et suppression des commentaires. */
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import {
  idParamSchema,
  validate,
} from '../../middlewares/validate.middleware';
import {
  deleteCommentHandler,
  updateCommentHandler,
} from './comment.controller';
import { updateCommentSchema } from './comment.validation';

const commentRouter = Router();

commentRouter.use(requireAuth);

commentRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateCommentSchema }),
  updateCommentHandler,
);

commentRouter.delete(
  '/:id',
  validate({ params: idParamSchema }),
  deleteCommentHandler,
);

export default commentRouter;
