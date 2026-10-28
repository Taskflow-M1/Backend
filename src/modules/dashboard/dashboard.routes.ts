/** Déclare les vues privées de synthèse et d'activité du tableau de bord. */
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { getDashboardHandler } from './dashboard.controller';
import { dashboardQuerySchema } from './dashboard.validation';

const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get(
  '/',
  validate({ query: dashboardQuerySchema }),
  getDashboardHandler,
);

export default dashboardRouter;
