import { Request, Response } from 'express';
import { getAuthenticatedUser } from '../../middlewares/auth.middleware';
import { ApiListResponse } from '../../types/api.types';
import { UserSummary } from '../teams/team.service';
import { PublicUser } from './user.model';
import {
  getMyProfile,
  searchUsersForTeamAdmin,
  updateMyPassword,
  updateMyProfile,
} from './user.service';
import {
  SearchUsersQuery,
  UpdatePasswordInput,
  UpdateProfileInput,
} from './user.validation';

// Traite la requête HTTP pour rechercher des utilisateurs.
export async function searchUsersHandler(
  req: Request,
  res: Response<ApiListResponse<UserSummary>>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const query = req.query as SearchUsersQuery;
  const items = await searchUsersForTeamAdmin(userId, query.search);
  res.status(200).json({ items });
}

// Traite la requête HTTP pour afficher le profil connecté.
export async function getMeHandler(
  req: Request,
  res: Response<PublicUser>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const profile = await getMyProfile(userId);
  res.status(200).json(profile);
}

// Traite la requête HTTP pour modifier le profil connecté.
export async function updateMeHandler(
  req: Request,
  res: Response<PublicUser>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const updatedProfile = await updateMyProfile(
    userId,
    req.body as UpdateProfileInput,
  );
  res.status(200).json(updatedProfile);
}

// Traite la requête HTTP pour changer le mot de passe du compte.
export async function updateMyPasswordHandler(
  req: Request,
  res: Response<{ message: string }>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const result = await updateMyPassword(
    userId,
    req.body as UpdatePasswordInput,
  );
  res.status(200).json(result);
}
