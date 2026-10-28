import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import {
  idParamSchema,
  validate,
} from '../../middlewares/validate.middleware';
import {
  kanbanBoardQuerySchema,
  listProjectTicketsQuerySchema,
} from '../tickets/ticket.validation';
import {
  createProjectHandler,
  deleteProjectHandler,
  getProjectHandler,
  getProjectKanbanHandler,
  listProjectFeaturesHandler,
  listProjectsHandler,
  listProjectTicketsHandler,
  updateProjectHandler,
} from './project.controller';
import {
  createProjectSchema,
  listProjectsQuerySchema,
  updateProjectSchema,
} from './project.validation';

const projectRouter = Router();

projectRouter.use(requireAuth);

projectRouter.get(
  '/',
  validate({ query: listProjectsQuerySchema }),
  listProjectsHandler,
);

projectRouter.post(
  '/',
  validate({ body: createProjectSchema }),
  createProjectHandler,
);

projectRouter.get(
  '/:id/features',
  validate({ params: idParamSchema }),
  listProjectFeaturesHandler,
);

projectRouter.get(
  '/:id/tickets',
  validate({ params: idParamSchema, query: listProjectTicketsQuerySchema }),
  listProjectTicketsHandler,
);

projectRouter.get(
  '/:id/kanban',
  validate({ params: idParamSchema, query: kanbanBoardQuerySchema }),
  getProjectKanbanHandler,
);

projectRouter.get(
  '/:id',
  validate({ params: idParamSchema }),
  getProjectHandler,
);

projectRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateProjectSchema }),
  updateProjectHandler,
);

projectRouter.delete(
  '/:id',
  validate({ params: idParamSchema }),
  deleteProjectHandler,
);

export default projectRouter;
