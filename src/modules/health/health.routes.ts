import { Router } from 'express';
import { checkHealth } from './health.controller';

const healthRouter = Router();

healthRouter.get('/', checkHealth);

export default healthRouter;
