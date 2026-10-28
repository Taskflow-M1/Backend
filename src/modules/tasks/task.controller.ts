/** Gère les entrées et sorties HTTP du CRUD des tâches personnelles. */
import { Request, Response } from 'express';
import { getAuthenticatedUser } from '../../middlewares/auth.middleware';
import { ApiListResponse } from '../../types/api.types';
import { PublicTask } from './task.model';
import {
  createTaskForOwner,
  deleteTaskForOwner,
  getTaskByIdForOwner,
  listTasksByOwner,
  updateTaskForOwner,
} from './task.service';
import { CreateTaskInput, UpdateTaskInput } from './task.validation';

export async function listTasksHandler(
  req: Request,
  res: Response<ApiListResponse<PublicTask>>,
): Promise<void> {
  const { id: ownerId } = getAuthenticatedUser(req);
  const items = await listTasksByOwner(ownerId);
  res.status(200).json({ items });
}

export async function createTaskHandler(
  req: Request,
  res: Response<PublicTask>,
): Promise<void> {
  const { id: ownerId } = getAuthenticatedUser(req);
  const task = await createTaskForOwner(ownerId, req.body as CreateTaskInput);
  res.status(201).json(task);
}

export async function getTaskHandler(
  req: Request,
  res: Response<PublicTask>,
): Promise<void> {
  const { id: ownerId } = getAuthenticatedUser(req);
  const task = await getTaskByIdForOwner(ownerId, String(req.params.id));
  res.status(200).json(task);
}

export async function updateTaskHandler(
  req: Request,
  res: Response<PublicTask>,
): Promise<void> {
  const { id: ownerId } = getAuthenticatedUser(req);
  const task = await updateTaskForOwner(
    ownerId,
    String(req.params.id),
    req.body as UpdateTaskInput,
  );
  res.status(200).json(task);
}

export async function deleteTaskHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const { id: ownerId } = getAuthenticatedUser(req);
  await deleteTaskForOwner(ownerId, String(req.params.id));
  res.status(204).send();
}
