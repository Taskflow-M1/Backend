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

// Traite la requête HTTP pour lister les fonctionnalités.
export async function listFeaturesHandler(
  req: Request,
  res: Response<ApiListResponse<PublicFeature>>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const query = req.query as ListFeaturesQuery;
  const items = await listAccessibleFeatures(userId, query.projectId);
  res.status(200).json({ items });
}

// Traite la requête HTTP pour créer une fonctionnalité.
export async function createFeatureHandler(
  req: Request,
  res: Response<PublicFeature>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const feature = await createFeature(userId, req.body as CreateFeatureInput);
  res.status(201).json(feature);
}

// Traite la requête HTTP pour afficher une fonctionnalité.
export async function getFeatureHandler(
  req: Request,
  res: Response<PublicFeature>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const feature = await getFeatureById(String(req.params.id), userId);
  res.status(200).json(feature);
}

// Traite la requête HTTP pour modifier une fonctionnalité.
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

// Traite la requête HTTP pour supprimer une fonctionnalité.
export async function deleteFeatureHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  await deleteFeature(String(req.params.id), userId);
  res.status(204).send();
}
