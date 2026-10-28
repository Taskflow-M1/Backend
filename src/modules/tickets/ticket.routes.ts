import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import {
  idParamSchema,
  validate,
} from '../../middlewares/validate.middleware';
import {
  createTicketCommentHandler,
  listTicketCommentsHandler,
} from '../comments/comment.controller';
import { createCommentSchema } from '../comments/comment.validation';
import {
  assignTicketHandler,
  createTicketHandler,
  deleteTicketHandler,
  getTicketHandler,
  listMyAssignedTicketsHandler,
  listTicketHistoryHandler,
  listTicketsHandler,
  updateTicketHandler,
  updateTicketStatusHandler,
} from './ticket.controller';
import {
  assignTicketSchema,
  createTicketSchema,
  listAssignedMeTicketsQuerySchema,
  listTicketHistoryQuerySchema,
  listTicketsQuerySchema,
  updateTicketSchema,
  updateTicketStatusSchema,
} from './ticket.validation';

const ticketRouter = Router();

ticketRouter.use(requireAuth);

// Registered before '/:id' so '/assigned/me' is never captured as an ObjectId param
ticketRouter.get(
  '/assigned/me',
  validate({ query: listAssignedMeTicketsQuerySchema }),
  listMyAssignedTicketsHandler,
);

ticketRouter.get(
  '/',
  validate({ query: listTicketsQuerySchema }),
  listTicketsHandler,
);

ticketRouter.post(
  '/',
  validate({ body: createTicketSchema }),
  createTicketHandler,
);

ticketRouter.get(
  '/:id/comments',
  validate({ params: idParamSchema }),
  listTicketCommentsHandler,
);

ticketRouter.post(
  '/:id/comments',
  validate({ params: idParamSchema, body: createCommentSchema }),
  createTicketCommentHandler,
);

ticketRouter.get(
  '/:id/history',
  validate({ params: idParamSchema, query: listTicketHistoryQuerySchema }),
  listTicketHistoryHandler,
);

ticketRouter.patch(
  '/:id/status',
  validate({ params: idParamSchema, body: updateTicketStatusSchema }),
  updateTicketStatusHandler,
);

ticketRouter.patch(
  '/:id/assign',
  validate({ params: idParamSchema, body: assignTicketSchema }),
  assignTicketHandler,
);

ticketRouter.get(
  '/:id',
  validate({ params: idParamSchema }),
  getTicketHandler,
);

ticketRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateTicketSchema }),
  updateTicketHandler,
);

ticketRouter.delete(
  '/:id',
  validate({ params: idParamSchema }),
  deleteTicketHandler,
);

export default ticketRouter;
