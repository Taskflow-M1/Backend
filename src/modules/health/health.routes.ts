/** Déclare le point de contrôle public utilisé pour surveiller l'API. */
import { Router } from 'express';
import { checkHealth } from './health.controller';

const healthRouter = Router();

healthRouter.get('/', checkHealth);

export default healthRouter;
