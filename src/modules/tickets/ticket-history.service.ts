import { Types } from 'mongoose';
import { toUserSummary, UserModel, UserSummary } from '../users/user.model';
import {
  PublicTicketHistory,
  TicketHistoryAction,
  TicketHistoryDocument,
  TicketHistoryModel,
  toPublicTicketHistory,
} from './ticket-history.model';

export interface RecordTicketHistoryEntry {
  ticketId: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  actorId: Types.ObjectId | string;
  action: TicketHistoryAction;
  field?: string | null;
  fromValue?: string | null;
  toValue?: string | null;
  summary: string;
}

// Enregistre les événements d’audit produits par une modification.
export async function recordTicketHistoryEntries(
  entries: RecordTicketHistoryEntry[],
): Promise<void> {
  if (entries.length === 0) {
    return;
  }

  await TicketHistoryModel.insertMany(
    entries.map((entry) => ({
      ticketId: new Types.ObjectId(String(entry.ticketId)),
      projectId: new Types.ObjectId(String(entry.projectId)),
      actorId: new Types.ObjectId(String(entry.actorId)),
      action: entry.action,
      field: entry.field ?? null,
      fromValue: entry.fromValue ?? null,
      toValue: entry.toValue ?? null,
      summary: entry.summary,
    })),
  );
}

// Ajoute les informations publiques des auteurs à l’historique.
export async function formatTicketHistoryWithUsers(
  entries: TicketHistoryDocument[],
): Promise<PublicTicketHistory[]> {
  if (entries.length === 0) {
    return [];
  }

  const actorIds = Array.from(
    new Set(entries.map((entry) => entry.actorId.toString())),
  );

  const users = await UserModel.find({ _id: { $in: actorIds } });
  const usersById = new Map<string, UserSummary>(
    users.map((user) => [user._id.toString(), toUserSummary(user)]),
  );

  return entries.map((entry) => toPublicTicketHistory(entry, usersById));
}
