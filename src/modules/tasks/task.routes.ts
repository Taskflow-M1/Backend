/** Déclare les routes privées du CRUD des tâches personnelles. */
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import {
  idParamSchema,
  validate,
} from '../../middlewares/validate.middleware';
import {
  createTaskHandler,
  deleteTaskHandler,
  getTaskHandler,
  listTasksHandler,
  updateTaskHandler,
} from './task.controller';
import { createTaskSchema, updateTaskSchema } from './task.validation';

const taskRouter = Router();

taskRouter.use(requireAuth);

taskRouter.get('/', listTasksHandler);

taskRouter.post('/', validate({ body: createTaskSchema }), createTaskHandler);

taskRouter.get('/:id', validate({ params: idParamSchema }), getTaskHandler);

taskRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateTaskSchema }),
  updateTaskHandler,
);

taskRouter.delete(
  '/:id',
  validate({ params: idParamSchema }),
  deleteTaskHandler,
);

export default taskRouter;
