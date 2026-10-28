import { Request, Response } from 'express';
import { getAuthenticatedUser } from '../../middlewares/auth.middleware';
import {
  ApiListResponse,
  ApiPaginatedListResponse,
} from '../../types/api.types';
import { PublicTicketHistory } from './ticket-history.model';
import { PublicTicket } from './ticket.model';
import {
  assignTicket,
  createTicket,
  deleteTicket,
  getTicketById,
  listAccessibleTickets,
  listMyAssignedTickets,
  listTicketHistory,
  updateTicket,
  updateTicketStatus,
} from './ticket.service';
import {
  AssignTicketInput,
  CreateTicketInput,
  ListAssignedMeTicketsQuery,
  ListTicketHistoryQuery,
  ListTicketsQuery,
  UpdateTicketInput,
  UpdateTicketStatusInput,
} from './ticket.validation';

// Traite la requête HTTP pour lister les tickets accessibles.
export async function listTicketsHandler(
  req: Request,
  res: Response<ApiPaginatedListResponse<PublicTicket>>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const query = req.query as ListTicketsQuery;
  const result = await listAccessibleTickets(userId, query);
  res.status(200).json(result);
}

// Traite la requête HTTP pour lister les tickets assignés à l’utilisateur.
export async function listMyAssignedTicketsHandler(
  req: Request,
  res: Response<ApiPaginatedListResponse<PublicTicket>>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const query = req.query as ListAssignedMeTicketsQuery;
  const result = await listMyAssignedTickets(userId, query);
  res.status(200).json(result);
}

// Traite la requête HTTP pour créer un ticket.
export async function createTicketHandler(
  req: Request,
  res: Response<PublicTicket>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const ticket = await createTicket(userId, req.body as CreateTicketInput);
  res.status(201).json(ticket);
}

// Traite la requête HTTP pour afficher un ticket.
export async function getTicketHandler(
  req: Request,
  res: Response<PublicTicket>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const ticket = await getTicketById(String(req.params.id), userId);
  res.status(200).json(ticket);
}

// Traite la requête HTTP pour lister l’historique du ticket.
export async function listTicketHistoryHandler(
  req: Request,
  res: Response<ApiListResponse<PublicTicketHistory>>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const query = req.query as ListTicketHistoryQuery;
  const items = await listTicketHistory(String(req.params.id), userId, query);
  res.status(200).json({ items });
}

// Traite la requête HTTP pour modifier un ticket.
export async function updateTicketHandler(
  req: Request,
  res: Response<PublicTicket>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const updated = await updateTicket(
    String(req.params.id),
    userId,
    req.body as UpdateTicketInput,
  );
  res.status(200).json(updated);
}

// Traite la requête HTTP pour changer le statut du ticket.
export async function updateTicketStatusHandler(
  req: Request,
  res: Response<PublicTicket>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const updated = await updateTicketStatus(
    String(req.params.id),
    userId,
    req.body as UpdateTicketStatusInput,
  );
  res.status(200).json(updated);
}

// Traite la requête HTTP pour assigner le ticket.
export async function assignTicketHandler(
  req: Request,
  res: Response<PublicTicket>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const updated = await assignTicket(
    String(req.params.id),
    userId,
    req.body as AssignTicketInput,
  );
  res.status(200).json(updated);
}

// Traite la requête HTTP pour supprimer le ticket.
export async function deleteTicketHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  await deleteTicket(String(req.params.id), userId);
  res.status(204).send();
}
