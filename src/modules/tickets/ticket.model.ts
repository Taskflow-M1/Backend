import mongoose, { HydratedDocument, Schema, Types } from 'mongoose';
import { UserSummary } from '../users/user.model';

export const TICKET_STATUSES = ['todo', 'doing', 'testing', 'done'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = [
  'low',
  'medium',
  'high',
  'critical',
] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_TYPES = [
  'task',
  'bug',
  'story',
  'improvement',
] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

export interface ITicket {
  projectId: Types.ObjectId;
  featureId: Types.ObjectId | null;
  ticketNumber: number;
  key: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  dueDate: string | null;
  createdBy: Types.ObjectId;
  assignedTo: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TicketDocument = HydratedDocument<ITicket>;

export interface PublicTicket {
  id: string;
  key: string;
  ticketNumber: number;
  projectId: string;
  featureId: string | null;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  dueDate: string | null;
  createdBy: string;
  creator: UserSummary | null;
  assignedTo: string | null;
  assignee: UserSummary | null;
  createdAt: string;
  updatedAt: string;
}

const ticketSchema = new Schema<ITicket>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    featureId: {
      type: Schema.Types.ObjectId,
      ref: 'Feature',
      default: null,
      index: true,
    },
    ticketNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    key: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },
    description: {
      type: String,
      maxlength: 2000,
      default: '',
    },
    status: {
      type: String,
      enum: TICKET_STATUSES,
      default: 'todo',
      required: true,
    },
    priority: {
      type: String,
      enum: TICKET_PRIORITIES,
      default: 'medium',
      required: true,
    },
    type: {
      type: String,
      enum: TICKET_TYPES,
      default: 'task',
      required: true,
    },
    dueDate: {
      type: String,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        ret.projectId = String(ret.projectId);
        ret.featureId = ret.featureId ? String(ret.featureId) : null;
        ret.createdBy = String(ret.createdBy);
        ret.assignedTo = ret.assignedTo ? String(ret.assignedTo) : null;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

ticketSchema.index({ projectId: 1, ticketNumber: 1 }, { unique: true });
ticketSchema.index({ projectId: 1, status: 1, createdAt: -1 });
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ featureId: 1, status: 1 });

export function toPublicTicket(
  ticket: TicketDocument,
  usersById?: ReadonlyMap<string, UserSummary>,
): PublicTicket {
  const createdById = ticket.createdBy.toString();
  const assignedToId = ticket.assignedTo ? ticket.assignedTo.toString() : null;

  return {
    id: ticket._id.toString(),
    key: ticket.key,
    ticketNumber: ticket.ticketNumber,
    projectId: ticket.projectId.toString(),
    featureId: ticket.featureId ? ticket.featureId.toString() : null,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    type: ticket.type,
    dueDate: ticket.dueDate,
    createdBy: createdById,
    creator: usersById?.get(createdById) ?? null,
    assignedTo: assignedToId,
    assignee: assignedToId ? (usersById?.get(assignedToId) ?? null) : null,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

export const TicketModel =
  (mongoose.models.Ticket as mongoose.Model<ITicket>) ||
  mongoose.model<ITicket>('Ticket', ticketSchema);

