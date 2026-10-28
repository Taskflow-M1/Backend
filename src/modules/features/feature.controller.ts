/** Gère les réponses HTTP liées aux fonctionnalités d'un projet. */
import { Request, Response } from 'express';
import { getAuthenticatedUser } from '../../middlewares/auth.middleware';
import { ApiListResponse } from '../../types/api.types';
import { PublicFeature } from './feature.model';
import {
  createFeature,
  deleteFeature,
  getFeatureById,
  listAccessibleFeatures,
  updateFeature,
} from './feature.service';
import {
  CreateFeatureInput,
  ListFeaturesQuery,
  UpdateFeatureInput,
} from './feature.validation';

export async function listFeaturesHandler(
  req: Request,
  res: Response<ApiListResponse<PublicFeature>>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const query = req.query as ListFeaturesQuery;
  const items = await listAccessibleFeatures(userId, query.projectId);
  res.status(200).json({ items });
}

export async function createFeatureHandler(
  req: Request,
  res: Response<PublicFeature>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const feature = await createFeature(userId, req.body as CreateFeatureInput);
  res.status(201).json(feature);
}

export async function getFeatureHandler(
  req: Request,
  res: Response<PublicFeature>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const feature = await getFeatureById(String(req.params.id), userId);
  res.status(200).json(feature);
}

export async function updateFeatureHandler(
  req: Request,
  res: Response<PublicFeature>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const updated = await updateFeature(
    String(req.params.id),
    userId,
    req.body as UpdateFeatureInput,
  );
  res.status(200).json(updated);
}

export async function deleteFeatureHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  await deleteFeature(String(req.params.id), userId);
  res.status(204).send();
}
