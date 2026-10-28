/**
 * Assemble les routeurs fonctionnels sous le préfixe commun `/api`.
 * Chaque module reste ainsi responsable de ses propres endpoints.
 */
import { Router } from 'express';
import authRouter from './modules/auth/auth.routes';
import commentRouter from './modules/comments/comment.routes';
import dashboardRouter from './modules/dashboard/dashboard.routes';
import docsRouter from './modules/docs/docs.routes';
import featureRouter from './modules/features/feature.routes';
import healthRouter from './modules/health/health.routes';
import projectRouter from './modules/projects/project.routes';
import taskRouter from './modules/tasks/task.routes';
import teamRouter from './modules/teams/team.routes';
import ticketRouter from './modules/tickets/ticket.routes';
import userRouter from './modules/users/user.routes';

const apiRouter = Router();

apiRouter.use(docsRouter);
apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/tasks', taskRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/teams', teamRouter);
apiRouter.use('/projects', projectRouter);
apiRouter.use('/features', featureRouter);
apiRouter.use('/tickets', ticketRouter);
apiRouter.use('/comments', commentRouter);
apiRouter.use('/dashboard', dashboardRouter);

export default apiRouter;
