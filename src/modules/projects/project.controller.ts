/** Traduit les requêtes HTTP en opérations métier sur les projets. */
import { Request, Response } from 'express';
import { getAuthenticatedUser } from '../../middlewares/auth.middleware';
import {
  ApiListResponse,
  ApiPaginatedListResponse,
} from '../../types/api.types';
import { PublicFeature } from '../features/feature.model';
import { listAccessibleFeatures } from '../features/feature.service';
import { PublicTicket } from '../tickets/ticket.model';
import {
  getProjectKanbanBoard,
  KanbanBoardResponse,
  listAccessibleTickets,
} from '../tickets/ticket.service';
import {
  KanbanBoardQuery,
  ListProjectTicketsQuery,
} from '../tickets/ticket.validation';
import {
  createProject,
  deleteProject,
  getProjectById,
  listAccessibleProjects,
  ProjectWithRole,
  updateProject,
} from './project.service';
import {
  CreateProjectInput,
  ListProjectsQuery,
  UpdateProjectInput,
} from './project.validation';

export async function listProjectsHandler(
  req: Request,
  res: Response<ApiListResponse<ProjectWithRole>>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const query = req.query as ListProjectsQuery;
  const items = await listAccessibleProjects(userId, query.teamId);
  res.status(200).json({ items });
}

export async function createProjectHandler(
  req: Request,
  res: Response<ProjectWithRole>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const project = await createProject(userId, req.body as CreateProjectInput);
  res.status(201).json(project);
}

export async function getProjectHandler(
  req: Request,
  res: Response<ProjectWithRole>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const project = await getProjectById(String(req.params.id), userId);
  res.status(200).json(project);
}

export async function updateProjectHandler(
  req: Request,
  res: Response<ProjectWithRole>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const updated = await updateProject(
    String(req.params.id),
    userId,
    req.body as UpdateProjectInput,
  );
  res.status(200).json(updated);
}

export async function deleteProjectHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  await deleteProject(String(req.params.id), userId);
  res.status(204).send();
}

export async function listProjectFeaturesHandler(
  req: Request,
  res: Response<ApiListResponse<PublicFeature>>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const items = await listAccessibleFeatures(userId, String(req.params.id));
  res.status(200).json({ items });
}

export async function listProjectTicketsHandler(
  req: Request,
  res: Response<ApiPaginatedListResponse<PublicTicket>>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const query = req.query as ListProjectTicketsQuery;
  const result = await listAccessibleTickets(userId, {
    ...query,
    projectId: String(req.params.id),
  });
  res.status(200).json(result);
}

export async function getProjectKanbanHandler(
  req: Request,
  res: Response<KanbanBoardResponse>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const query = req.query as KanbanBoardQuery;
  const board = await getProjectKanbanBoard(
    String(req.params.id),
    userId,
    query,
  );
  res.status(200).json(board);
}
