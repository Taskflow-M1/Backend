/** Valide les tickets, leurs filtres, leur assignation et leurs transitions. */
import { z } from 'zod';
import { objectIdSchema } from '../../middlewares/validate.middleware';
import { MESSAGES } from '../../utils/constants';
import { isRealCalendarDate } from '../../utils/date';
import { commentContentSchema } from '../comments/comment.validation';
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKET_TYPES,
} from './ticket.model';

const ticketTitleSchema = z
  .string({ error: MESSAGES.TICKETS.TITLE_REQUIRED })
  .trim()
  .min(1, MESSAGES.TICKETS.TITLE_REQUIRED)
  .max(120, MESSAGES.TICKETS.TITLE_TOO_LONG);

const ticketDescriptionSchema = z
  .string({ error: MESSAGES.VALIDATION.INVALID_INPUT })
  .trim()
  .max(2000, MESSAGES.TICKETS.DESCRIPTION_TOO_LONG);

export const ticketStatusSchema = z.enum(TICKET_STATUSES, {
  error: MESSAGES.TICKETS.STATUS_INVALID,
});

export const ticketPrioritySchema = z.enum(TICKET_PRIORITIES, {
  error: MESSAGES.TICKETS.PRIORITY_INVALID,
});

export const ticketTypeSchema = z.enum(TICKET_TYPES, {
  error: MESSAGES.TICKETS.TYPE_INVALID,
});

const calendarDateStringSchema = z
  .string({ error: MESSAGES.TICKETS.DUE_DATE_INVALID })
  .trim()
  .refine(isRealCalendarDate, { message: MESSAGES.TICKETS.DUE_DATE_INVALID });

const ticketDueDateSchema = calendarDateStringSchema.nullable();

const booleanQuerySchema = z
  .enum(['true', 'false'], { error: MESSAGES.VALIDATION.INVALID_INPUT })
  .transform((value) => value === 'true');

const searchQuerySchema = z
  .string({ error: MESSAGES.VALIDATION.INVALID_INPUT })
  .trim()
  .max(100, MESSAGES.TICKETS.SEARCH_TOO_LONG);

const paginationPageSchema = z
  .string({ error: MESSAGES.TICKETS.PAGINATION_INVALID })
  .trim()
  .regex(/^\d+$/, MESSAGES.TICKETS.PAGINATION_INVALID)
  .transform(Number)
  .pipe(
    z
      .number()
      .int(MESSAGES.TICKETS.PAGINATION_INVALID)
      .min(1, MESSAGES.TICKETS.PAGINATION_INVALID),
  );

const paginationLimitSchema = z
  .string({ error: MESSAGES.TICKETS.PAGINATION_INVALID })
  .trim()
  .regex(/^\d+$/, MESSAGES.TICKETS.PAGINATION_INVALID)
  .transform(Number)
  .pipe(
    z
      .number()
      .int(MESSAGES.TICKETS.PAGINATION_INVALID)
      .min(1, MESSAGES.TICKETS.PAGINATION_INVALID)
      .max(100, MESSAGES.TICKETS.PAGINATION_INVALID),
  );

const featureFilterSchema = z.union([objectIdSchema, z.literal('none')]);

const assignedToFilterSchema = z.union([
  objectIdSchema,
  z.literal('me'),
  z.literal('unassigned'),
]);

export const createTicketSchema = z
  .object({
    projectId: objectIdSchema,
    featureId: objectIdSchema.nullable().optional(),
    title: ticketTitleSchema,
    description: ticketDescriptionSchema.optional(),
    status: ticketStatusSchema.optional(),
    priority: ticketPrioritySchema.optional(),
    type: ticketTypeSchema.optional(),
    dueDate: ticketDueDateSchema.optional(),
    assignedTo: objectIdSchema.nullable().optional(),
  })
  .strict();

export const updateTicketSchema = z
  .object({
    featureId: objectIdSchema.nullable().optional(),
    title: ticketTitleSchema.optional(),
    description: ticketDescriptionSchema.optional(),
    status: ticketStatusSchema.optional(),
    priority: ticketPrioritySchema.optional(),
    type: ticketTypeSchema.optional(),
    dueDate: ticketDueDateSchema.optional(),
    assignedTo: objectIdSchema.nullable().optional(),
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    { message: MESSAGES.VALIDATION.EMPTY_UPDATE_BODY },
  );

export const assignTicketSchema = z
  .object({
    assignedTo: objectIdSchema.nullable(),
  })
  .strict();

export const updateTicketStatusSchema = z
  .object({
    status: ticketStatusSchema,
    comment: commentContentSchema.optional(),
  })
  .strict();

export const listTicketHistoryQuerySchema = z
  .object({
    order: z
      .enum(['asc', 'desc'], { error: MESSAGES.VALIDATION.INVALID_INPUT })
      .optional(),
  })
  .strict();

export const listTicketsQuerySchema = z
  .object({
    projectId: objectIdSchema.optional(),
    featureId: featureFilterSchema.optional(),
    assignedTo: assignedToFilterSchema.optional(),
    status: ticketStatusSchema.optional(),
    priority: ticketPrioritySchema.optional(),
    type: ticketTypeSchema.optional(),
    dueDate: calendarDateStringSchema.optional(),
    dueBefore: calendarDateStringSchema.optional(),
    overdue: booleanQuerySchema.optional(),
    search: searchQuerySchema.optional(),
    page: paginationPageSchema.optional(),
    limit: paginationLimitSchema.optional(),
  })
  .strict();

export const listAssignedMeTicketsQuerySchema = z
  .object({
    projectId: objectIdSchema.optional(),
    featureId: featureFilterSchema.optional(),
    status: ticketStatusSchema.optional(),
    priority: ticketPrioritySchema.optional(),
    type: ticketTypeSchema.optional(),
    dueDate: calendarDateStringSchema.optional(),
    dueBefore: calendarDateStringSchema.optional(),
    overdue: booleanQuerySchema.optional(),
    search: searchQuerySchema.optional(),
    page: paginationPageSchema.optional(),
    limit: paginationLimitSchema.optional(),
  })
  .strict();

export const listProjectTicketsQuerySchema = z
  .object({
    featureId: featureFilterSchema.optional(),
    assignedTo: assignedToFilterSchema.optional(),
    status: ticketStatusSchema.optional(),
    priority: ticketPrioritySchema.optional(),
    type: ticketTypeSchema.optional(),
    dueDate: calendarDateStringSchema.optional(),
    dueBefore: calendarDateStringSchema.optional(),
    overdue: booleanQuerySchema.optional(),
    search: searchQuerySchema.optional(),
    page: paginationPageSchema.optional(),
    limit: paginationLimitSchema.optional(),
  })
  .strict();

export const kanbanBoardQuerySchema = z
  .object({
    featureId: featureFilterSchema.optional(),
    assignedTo: assignedToFilterSchema.optional(),
    priority: ticketPrioritySchema.optional(),
    type: ticketTypeSchema.optional(),
    overdue: booleanQuerySchema.optional(),
    search: searchQuerySchema.optional(),
  })
  .strict();

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type AssignTicketInput = z.infer<typeof assignTicketSchema>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
export type ListAssignedMeTicketsQuery = z.infer<
  typeof listAssignedMeTicketsQuerySchema
>;
export type ListProjectTicketsQuery = z.infer<
  typeof listProjectTicketsQuerySchema
>;
export type KanbanBoardQuery = z.infer<typeof kanbanBoardQuerySchema>;
export type ListTicketHistoryQuery = z.infer<
  typeof listTicketHistoryQuerySchema
>;
