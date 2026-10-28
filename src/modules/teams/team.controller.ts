import { Request, Response } from 'express';
import { getAuthenticatedUser } from '../../middlewares/auth.middleware';
import { ApiListResponse } from '../../types/api.types';
import { PublicTeam } from './team.model';
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  getTeamDetails,
  listMyTeams,
  listTeamMembers,
  removeTeamMember,
  TeamDetails,
  TeamListItem,
  TeamMemberItem,
  updateTeam,
  updateTeamMemberRole,
} from './team.service';
import {
  AddTeamMemberInput,
  CreateTeamInput,
  UpdateTeamInput,
  UpdateTeamMemberRoleInput,
} from './team.validation';

// Traite la requête HTTP pour lister les équipes de l’utilisateur.
export async function listTeamsHandler(
  req: Request,
  res: Response<ApiListResponse<TeamListItem>>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const items = await listMyTeams(userId);
  res.status(200).json({ items });
}

// Traite la requête HTTP pour créer une équipe.
export async function createTeamHandler(
  req: Request,
  res: Response<TeamListItem>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const created = await createTeam(userId, req.body as CreateTeamInput);
  res.status(201).json(created);
}

// Traite la requête HTTP pour afficher une équipe.
export async function getTeamDetailsHandler(
  req: Request,
  res: Response<TeamDetails>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const details = await getTeamDetails(String(req.params.id), userId);
  res.status(200).json(details);
}

// Traite la requête HTTP pour modifier une équipe.
export async function updateTeamHandler(
  req: Request,
  res: Response<PublicTeam>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const updated = await updateTeam(
    String(req.params.id),
    userId,
    req.body as UpdateTeamInput,
  );
  res.status(200).json(updated);
}

// Traite la requête HTTP pour supprimer une équipe.
export async function deleteTeamHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  await deleteTeam(String(req.params.id), userId);
  res.status(204).send();
}

// Traite la requête HTTP pour lister les membres de l’équipe.
export async function listTeamMembersHandler(
  req: Request,
  res: Response<ApiListResponse<TeamMemberItem>>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const items = await listTeamMembers(String(req.params.id), userId);
  res.status(200).json({ items });
}

// Traite la requête HTTP pour ajouter un membre à l’équipe.
export async function addTeamMemberHandler(
  req: Request,
  res: Response<TeamMemberItem>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const member = await addTeamMember(
    String(req.params.id),
    userId,
    req.body as AddTeamMemberInput,
  );
  res.status(201).json(member);
}

// Traite la requête HTTP pour modifier le rôle d’un membre.
export async function updateTeamMemberRoleHandler(
  req: Request,
  res: Response<TeamMemberItem>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const member = await updateTeamMemberRole(
    String(req.params.id),
    userId,
    String(req.params.userId),
    req.body as UpdateTeamMemberRoleInput,
  );
  res.status(200).json(member);
}

// Traite la requête HTTP pour retirer un membre de l’équipe.
export async function removeTeamMemberHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  await removeTeamMember(
    String(req.params.id),
    userId,
    String(req.params.userId),
  );
  res.status(204).send();
}
