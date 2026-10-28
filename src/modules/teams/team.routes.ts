/** Déclare le CRUD des équipes ainsi que la gestion de leurs membres. */
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import {
  idParamSchema,
  validate,
} from '../../middlewares/validate.middleware';
import { listTeamActivityHandler } from '../dashboard/dashboard.controller';
import { teamActivityQuerySchema } from '../dashboard/dashboard.validation';
import {
  addTeamMemberHandler,
  createTeamHandler,
  deleteTeamHandler,
  getTeamDetailsHandler,
  listTeamMembersHandler,
  listTeamsHandler,
  removeTeamMemberHandler,
  updateTeamHandler,
  updateTeamMemberRoleHandler,
} from './team.controller';
import {
  addTeamMemberSchema,
  createTeamSchema,
  teamMemberParamsSchema,
  updateTeamMemberRoleSchema,
  updateTeamSchema,
} from './team.validation';

const teamRouter = Router();

teamRouter.use(requireAuth);

teamRouter.get('/', listTeamsHandler);

teamRouter.post('/', validate({ body: createTeamSchema }), createTeamHandler);

teamRouter.get(
  '/:id',
  validate({ params: idParamSchema }),
  getTeamDetailsHandler,
);

teamRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateTeamSchema }),
  updateTeamHandler,
);

teamRouter.delete(
  '/:id',
  validate({ params: idParamSchema }),
  deleteTeamHandler,
);

teamRouter.get(
  '/:id/activity',
  validate({ params: idParamSchema, query: teamActivityQuerySchema }),
  listTeamActivityHandler,
);

teamRouter.get(
  '/:id/members',
  validate({ params: idParamSchema }),
  listTeamMembersHandler,
);

teamRouter.post(
  '/:id/members',
  validate({ params: idParamSchema, body: addTeamMemberSchema }),
  addTeamMemberHandler,
);

teamRouter.patch(
  '/:id/members/:userId',
  validate({ params: teamMemberParamsSchema, body: updateTeamMemberRoleSchema }),
  updateTeamMemberRoleHandler,
);

teamRouter.delete(
  '/:id/members/:userId',
  validate({ params: teamMemberParamsSchema }),
  removeTeamMemberHandler,
);

export default teamRouter;
