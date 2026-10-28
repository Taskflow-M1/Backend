/** Adapte les requêtes HTTP aux opérations de discussion sur les tickets. */
import { Request, Response } from 'express';
import { getAuthenticatedUser } from '../../middlewares/auth.middleware';
import { ApiListResponse } from '../../types/api.types';
import { PublicComment } from './comment.model';
import {
  createTicketComment,
  deleteComment,
  listTicketComments,
  updateComment,
} from './comment.service';
import { CreateCommentInput, UpdateCommentInput } from './comment.validation';

export async function listTicketCommentsHandler(
  req: Request,
  res: Response<ApiListResponse<PublicComment>>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const items = await listTicketComments(String(req.params.id), userId);
  res.status(200).json({ items });
}

export async function createTicketCommentHandler(
  req: Request,
  res: Response<PublicComment>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const created = await createTicketComment(
    String(req.params.id),
    userId,
    req.body as CreateCommentInput,
  );
  res.status(201).json(created);
}

export async function updateCommentHandler(
  req: Request,
  res: Response<PublicComment>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const updated = await updateComment(
    String(req.params.id),
    userId,
    req.body as UpdateCommentInput,
  );
  res.status(200).json(updated);
}

export async function deleteCommentHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  await deleteComment(String(req.params.id), userId);
  res.status(204).send();
}
