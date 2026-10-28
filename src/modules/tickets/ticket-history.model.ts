/** Modèle immuable des événements importants enregistrés sur un ticket. */
import mongoose, { HydratedDocument, Schema, Types } from 'mongoose';
import { UserSummary } from '../users/user.model';

export const TICKET_HISTORY_ACTIONS = [
  'ticket_created',
  'status_changed',
  'assigned',
  'unassigned',
  'priority_changed',
  'type_changed',
  'due_date_changed',
  'feature_changed',
  'details_updated',
  'comment_added',
] as const;

export type TicketHistoryAction = (typeof TICKET_HISTORY_ACTIONS)[number];

export interface ITicketHistory {
  ticketId: Types.ObjectId;
  projectId: Types.ObjectId;
  actorId: Types.ObjectId;
  action: TicketHistoryAction;
  field: string | null;
  fromValue: string | null;
  toValue: string | null;
  summary: string;
  createdAt: Date;
}

export type TicketHistoryDocument = HydratedDocument<ITicketHistory>;

export interface PublicTicketHistory {
  id: string;
  ticketId: string;
  projectId: string;
  actorId: string;
  actor: UserSummary | null;
  action: TicketHistoryAction;
  field: string | null;
  fromValue: string | null;
  toValue: string | null;
  summary: string;
  createdAt: string;
}

const ticketHistorySchema = new Schema<ITicketHistory>(
  {
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: TICKET_HISTORY_ACTIONS,
      required: true,
    },
    field: {
      type: String,
      default: null,
    },
    fromValue: {
      type: String,
      default: null,
    },
    toValue: {
      type: String,
      default: null,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        ret.ticketId = String(ret.ticketId);
        ret.projectId = String(ret.projectId);
        ret.actorId = String(ret.actorId);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

ticketHistorySchema.index({ ticketId: 1, createdAt: 1 });
ticketHistorySchema.index({ projectId: 1, createdAt: -1 });

export function toPublicTicketHistory(
  entry: TicketHistoryDocument,
  usersById?: ReadonlyMap<string, UserSummary>,
): PublicTicketHistory {
  const actorIdStr = entry.actorId.toString();

  return {
    id: entry._id.toString(),
    ticketId: entry.ticketId.toString(),
    projectId: entry.projectId.toString(),
    actorId: actorIdStr,
    actor: usersById?.get(actorIdStr) ?? null,
    action: entry.action,
    field: entry.field,
    fromValue: entry.fromValue,
    toValue: entry.toValue,
    summary: entry.summary,
    createdAt: entry.createdAt.toISOString(),
  };
}

export const TicketHistoryModel =
  (mongoose.models.TicketHistory as mongoose.Model<ITicketHistory>) ||
  mongoose.model<ITicketHistory>('TicketHistory', ticketHistorySchema);
