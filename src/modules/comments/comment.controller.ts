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

// Traite la requête HTTP pour lister les commentaires du ticket.
export async function listTicketCommentsHandler(
  req: Request,
  res: Response<ApiListResponse<PublicComment>>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const items = await listTicketComments(String(req.params.id), userId);
  res.status(200).json({ items });
}

// Traite la requête HTTP pour ajouter un commentaire au ticket.
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

// Traite la requête HTTP pour modifier un commentaire.
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

// Traite la requête HTTP pour supprimer un commentaire.
export async function deleteCommentHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  await deleteComment(String(req.params.id), userId);
  res.status(204).send();
}
