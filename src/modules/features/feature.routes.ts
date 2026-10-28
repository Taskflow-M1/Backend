import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import {
  idParamSchema,
  validate,
} from '../../middlewares/validate.middleware';
import {
  createFeatureHandler,
  deleteFeatureHandler,
  getFeatureHandler,
  listFeaturesHandler,
  updateFeatureHandler,
} from './feature.controller';
import {
  createFeatureSchema,
  listFeaturesQuerySchema,
  updateFeatureSchema,
} from './feature.validation';

const featureRouter = Router();

featureRouter.use(requireAuth);

featureRouter.get(
  '/',
  validate({ query: listFeaturesQuerySchema }),
  listFeaturesHandler,
);

featureRouter.post(
  '/',
  validate({ body: createFeatureSchema }),
  createFeatureHandler,
);

featureRouter.get(
  '/:id',
  validate({ params: idParamSchema }),
  getFeatureHandler,
);

featureRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateFeatureSchema }),
  updateFeatureHandler,
);

featureRouter.delete(
  '/:id',
  validate({ params: idParamSchema }),
  deleteFeatureHandler,
);

export default featureRouter;
