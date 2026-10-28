import { Types } from 'mongoose';
import { ApiPaginatedListResponse } from '../../types/api.types';
import { AppError } from '../../utils/app-error';
import { MESSAGES } from '../../utils/constants';
import { getTodayDateString } from '../../utils/date';
import { escapeRegex } from '../../utils/regex';
import { CommentModel } from '../comments/comment.model';
import { FeatureModel } from '../features/feature.model';
import { requireFeatureAccess } from '../features/feature.service';
import { ProjectDocument, ProjectModel } from '../projects/project.model';
import {
  PROJECT_MANAGER_ROLES,
  requireProjectAccess,
} from '../projects/project.service';
import {
  TeamMembershipDocument,
  TeamMembershipModel,
  TeamRole,
} from '../teams/team-membership.model';
import { isUserTeamMember } from '../teams/team.service';
import {
  toUserSummary,
  UserDocument,
  UserModel,
  UserSummary,
} from '../users/user.model';
import {
  PublicTicketHistory,
  TicketHistoryModel,
} from './ticket-history.model';
import {
  formatTicketHistoryWithUsers,
  RecordTicketHistoryEntry,
  recordTicketHistoryEntries,
} from './ticket-history.service';
import {
  PublicTicket,
  TICKET_STATUSES,
  TicketDocument,
  TicketModel,
  TicketStatus,
  toPublicTicket,
} from './ticket.model';
import {
  AssignTicketInput,
  CreateTicketInput,
  KanbanBoardQuery,
  ListAssignedMeTicketsQuery,
  ListTicketHistoryQuery,
  ListTicketsQuery,
  UpdateTicketInput,
  UpdateTicketStatusInput,
} from './ticket.validation';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const OBJECT_ID_HEX_REGEX = /^[0-9a-fA-F]{24}$/;

export const KANBAN_COLUMN_LABELS: Readonly<Record<TicketStatus, string>> = {
  todo: 'À faire',
  doing: 'En cours',
  testing: 'En test',
  done: 'Terminé',
};

const DEVELOPER_TRANSITIONS: Readonly<
  Record<TicketStatus, readonly TicketStatus[]>
> = {
  todo: ['doing'],
  doing: ['todo', 'testing'],
  testing: ['doing'],
  done: [],
};

const TESTER_QA_TRANSITIONS: Readonly<
  Record<TicketStatus, readonly TicketStatus[]>
> = {
  todo: [],
  doing: [],
  testing: ['done', 'doing'],
  done: ['testing', 'doing'],
};

export interface KanbanColumn {
  status: TicketStatus;
  label: string;
  count: number;
  items: PublicTicket[];
}

export interface KanbanBoardResponse {
  project: {
    id: string;
    name: string;
    key: string;
    teamId: string;
    myRole: TeamRole;
  };
  totalTickets: number;
  counts: Record<TicketStatus, number>;
  columns: KanbanColumn[];
}

function formatUserDisplayName(user: UserDocument | null): string {
  if (!user) {
    return 'un membre';
  }
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  return fullName.length > 0 ? fullName : user.email;
}

export async function requireTicketAccess(
  ticketId: string,
  userId: string,
  allowedRoles?: readonly TeamRole[],
  forbiddenMessage: string = MESSAGES.COMMON.FORBIDDEN,
): Promise<{
  ticket: TicketDocument;
  project: ProjectDocument;
  membership: TeamMembershipDocument;
}> {
  const ticket = await TicketModel.findById(ticketId);
  if (!ticket) {
    throw AppError.notFound(MESSAGES.TICKETS.NOT_FOUND);
  }

  const { project, membership } = await requireProjectAccess(
    ticket.projectId.toString(),
    userId,
  );

  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    throw AppError.forbidden(forbiddenMessage);
  }

  return { ticket, project, membership };
}

export function validateTicketStatusTransition(
  ticket: TicketDocument,
  nextStatus: TicketStatus,
  role: TeamRole,
  userId: string,
): void {
  const currentStatus = ticket.status;
  if (currentStatus === nextStatus) {
    return;
  }

  if (PROJECT_MANAGER_ROLES.includes(role)) {
    return;
  }

  if (role === 'developer') {
    if (nextStatus === 'done') {
      throw AppError.forbidden(MESSAGES.TICKETS.STATUS_DONE_FORBIDDEN);
    }

    if (currentStatus === 'done') {
      throw AppError.forbidden(MESSAGES.TICKETS.STATUS_REOPEN_FORBIDDEN);
    }

    if (!DEVELOPER_TRANSITIONS[currentStatus].includes(nextStatus)) {
      throw AppError.badRequest(MESSAGES.TICKETS.STATUS_TRANSITION_INVALID);
    }

    return;
  }

  // role === 'tester'
  if (TESTER_QA_TRANSITIONS[currentStatus].includes(nextStatus)) {
    return;
  }

  const isInvalidWorkflowJump =
    nextStatus === 'done' ||
    (currentStatus === 'todo' && nextStatus === 'testing') ||
    (currentStatus === 'done' && nextStatus === 'todo');

  if (isInvalidWorkflowJump) {
    throw AppError.badRequest(MESSAGES.TICKETS.STATUS_TRANSITION_INVALID);
  }

  const isOwnTicket =
    ticket.createdBy.toString() === userId ||
    ticket.assignedTo?.toString() === userId;

  if (isOwnTicket && DEVELOPER_TRANSITIONS[currentStatus].includes(nextStatus)) {
    return;
  }

  throw AppError.forbidden(MESSAGES.TICKETS.STATUS_TESTER_TRANSITION_FORBIDDEN);
}

async function validateFeatureBelongsToProject(
  featureId: string,
  projectId: string,
): Promise<void> {
  const feature = await FeatureModel.findById(featureId);
  if (!feature) {
    throw AppError.notFound(MESSAGES.FEATURES.NOT_FOUND);
  }

  if (feature.projectId.toString() !== projectId) {
    throw AppError.badRequest(MESSAGES.TICKETS.FEATURE_PROJECT_MISMATCH);
  }
}

async function validateAssigneeInTeam(
  assignedTo: string,
  teamId: string,
): Promise<UserDocument> {
  const targetUser = await UserModel.findById(assignedTo);
  if (!targetUser) {
    throw AppError.notFound(MESSAGES.USERS.NOT_FOUND);
  }

  const isMember = await isUserTeamMember(teamId, assignedTo);
  if (!isMember) {
    throw AppError.badRequest(MESSAGES.TICKETS.ASSIGNEE_NOT_IN_TEAM);
  }

  return targetUser;
}

export async function formatTicketsWithUsers(
  tickets: TicketDocument[],
): Promise<PublicTicket[]> {
  if (tickets.length === 0) {
    return [];
  }

  const userIdSet = new Set<string>();
  for (const ticket of tickets) {
    userIdSet.add(ticket.createdBy.toString());
    if (ticket.assignedTo) {
      userIdSet.add(ticket.assignedTo.toString());
    }
  }

  const users = await UserModel.find({
    _id: { $in: Array.from(userIdSet) },
  });

  const usersById = new Map<string, UserSummary>(
    users.map((user) => [user._id.toString(), toUserSummary(user)]),
  );

  return tickets.map((ticket) => toPublicTicket(ticket, usersById));
}

async function formatSingleTicketWithUsers(
  ticket: TicketDocument,
): Promise<PublicTicket> {
  const [formatted] = await formatTicketsWithUsers([ticket]);
  return formatted;
}

async function buildTicketMongoFilter(
  accessibleProjectIds: Types.ObjectId[],
  userId: string,
  query: Omit<ListTicketsQuery, 'projectId' | 'page' | 'limit'>,
): Promise<Record<string, unknown>> {
  const andConditions: Record<string, unknown>[] = [
    {
      projectId:
        accessibleProjectIds.length === 1
          ? accessibleProjectIds[0]
          : { $in: accessibleProjectIds },
    },
  ];

  if (query.featureId !== undefined) {
    if (query.featureId === 'none') {
      andConditions.push({ featureId: null });
    } else {
      await requireFeatureAccess(query.featureId, userId);
      andConditions.push({ featureId: new Types.ObjectId(query.featureId) });
    }
  }

  if (query.assignedTo !== undefined) {
    if (query.assignedTo === 'me') {
      andConditions.push({ assignedTo: new Types.ObjectId(userId) });
    } else if (query.assignedTo === 'unassigned') {
      andConditions.push({ assignedTo: null });
    } else {
      andConditions.push({ assignedTo: new Types.ObjectId(query.assignedTo) });
    }
  }

  if (query.status !== undefined) {
    andConditions.push({ status: query.status });
  }

  if (query.priority !== undefined) {
    andConditions.push({ priority: query.priority });
  }

  if (query.type !== undefined) {
    andConditions.push({ type: query.type });
  }

  if (query.dueDate !== undefined) {
    andConditions.push({ dueDate: query.dueDate });
  }

  if (query.dueBefore !== undefined) {
    andConditions.push({
      dueDate: { $ne: null, $lte: query.dueBefore },
    });
  }

  if (query.overdue !== undefined) {
    const today = getTodayDateString();
    if (query.overdue) {
      andConditions.push({
        dueDate: { $ne: null, $lt: today },
        status: { $ne: 'done' },
      });
    } else {
      andConditions.push({
        $or: [
          { dueDate: null },
          { dueDate: { $gte: today } },
          { status: 'done' },
        ],
      });
    }
  }

  const trimmedSearch = query.search?.trim() ?? '';
  if (trimmedSearch.length > 0) {
    const safePattern = escapeRegex(trimmedSearch);
    const orSearchClauses: Record<string, unknown>[] = [
      { title: { $regex: safePattern, $options: 'i' } },
      { key: { $regex: safePattern, $options: 'i' } },
    ];

    if (OBJECT_ID_HEX_REGEX.test(trimmedSearch)) {
      orSearchClauses.push({ _id: new Types.ObjectId(trimmedSearch) });
    }

    andConditions.push({ $or: orSearchClauses });
  }

  return andConditions.length === 1 ? andConditions[0] : { $and: andConditions };
}

export async function createTicket(
  creatorId: string,
  input: CreateTicketInput,
): Promise<PublicTicket> {
  const { project, membership } = await requireProjectAccess(
    input.projectId,
    creatorId,
  );

  const isManager = PROJECT_MANAGER_ROLES.includes(membership.role);
  const initialStatus = input.status ?? 'todo';

  if (!isManager && membership.role === 'developer' && initialStatus === 'done') {
    throw AppError.forbidden(MESSAGES.TICKETS.STATUS_DONE_FORBIDDEN);
  }

  if (input.featureId) {
    await validateFeatureBelongsToProject(
      input.featureId,
      project._id.toString(),
    );
  }

  let assigneeUser: UserDocument | null = null;
  if (input.assignedTo) {
    if (!isManager && input.assignedTo !== creatorId) {
      throw AppError.forbidden(MESSAGES.TICKETS.ASSIGN_FORBIDDEN);
    }
    assigneeUser = await validateAssigneeInTeam(
      input.assignedTo,
      project.teamId.toString(),
    );
  }

  const updatedProject = await ProjectModel.findByIdAndUpdate(
    project._id,
    { $inc: { ticketCounter: 1 } },
    { returnDocument: 'after' },
  );

  const ticketNumber = updatedProject?.ticketCounter ?? 1;
  const key = `${project.key}-${ticketNumber}`;

  const createdTicket = await TicketModel.create({
    projectId: project._id,
    featureId: input.featureId ?? null,
    ticketNumber,
    key,
    title: input.title,
    description: input.description ?? '',
    status: initialStatus,
    priority: input.priority ?? 'medium',
    type: input.type ?? 'task',
    dueDate: input.dueDate ?? null,
    createdBy: creatorId,
    assignedTo: input.assignedTo ?? null,
  });

  const historyEntries: RecordTicketHistoryEntry[] = [
    {
      ticketId: createdTicket._id,
      projectId: project._id,
      actorId: creatorId,
      action: 'ticket_created',
      field: null,
      fromValue: null,
      toValue: createdTicket.key,
      summary: `Ticket ${createdTicket.key} créé (« ${createdTicket.title} »)`,
    },
  ];

  if (createdTicket.assignedTo) {
    const assigneeName = formatUserDisplayName(assigneeUser);
    historyEntries.push({
      ticketId: createdTicket._id,
      projectId: project._id,
      actorId: creatorId,
      action: 'assigned',
      field: 'assignedTo',
      fromValue: null,
      toValue: createdTicket.assignedTo.toString(),
      summary: `Ticket attribué à ${assigneeName}`,
    });
  }

  await recordTicketHistoryEntries(historyEntries);

  return formatSingleTicketWithUsers(createdTicket);
}

export async function listAccessibleTickets(
  userId: string,
  query: ListTicketsQuery = {},
): Promise<ApiPaginatedListResponse<PublicTicket>> {
  const page = query.page ?? DEFAULT_PAGE;
  const limit = query.limit ?? DEFAULT_LIMIT;

  let accessibleProjectIds: Types.ObjectId[];

  if (query.projectId) {
    const { project } = await requireProjectAccess(query.projectId, userId);
    accessibleProjectIds = [project._id];
  } else {
    const memberships = await TeamMembershipModel.find({ userId }).select(
      'teamId',
    );
    if (memberships.length === 0) {
      return {
        items: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }

    const teamIds = memberships.map((membership) => membership.teamId);
    const projects = await ProjectModel.find({
      teamId: { $in: teamIds },
    }).select('_id');

    if (projects.length === 0) {
      return {
        items: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }

    accessibleProjectIds = projects.map((project) => project._id);
  }

  const filter = await buildTicketMongoFilter(
    accessibleProjectIds,
    userId,
    query,
  );

  const skip = (page - 1) * limit;
  const [total, tickets] = await Promise.all([
    TicketModel.countDocuments(filter),
    TicketModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);

  const items = await formatTicketsWithUsers(tickets);
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export async function listMyAssignedTickets(
  userId: string,
  query: ListAssignedMeTicketsQuery = {},
): Promise<ApiPaginatedListResponse<PublicTicket>> {
  return listAccessibleTickets(userId, { ...query, assignedTo: 'me' });
}

export async function getProjectKanbanBoard(
  projectId: string,
  userId: string,
  query: KanbanBoardQuery = {},
): Promise<KanbanBoardResponse> {
  const { project, membership } = await requireProjectAccess(projectId, userId);

  const filter = await buildTicketMongoFilter([project._id], userId, query);
  const tickets = await TicketModel.find(filter).sort({
    updatedAt: -1,
    createdAt: -1,
  });

  const formattedTickets = await formatTicketsWithUsers(tickets);

  const grouped: Record<TicketStatus, PublicTicket[]> = {
    todo: [],
    doing: [],
    testing: [],
    done: [],
  };

  for (const ticket of formattedTickets) {
    grouped[ticket.status].push(ticket);
  }

  const counts: Record<TicketStatus, number> = {
    todo: grouped.todo.length,
    doing: grouped.doing.length,
    testing: grouped.testing.length,
    done: grouped.done.length,
  };

  const columns: KanbanColumn[] = TICKET_STATUSES.map((status) => ({
    status,
    label: KANBAN_COLUMN_LABELS[status],
    count: counts[status],
    items: grouped[status],
  }));

  return {
    project: {
      id: project._id.toString(),
      name: project.name,
      key: project.key,
      teamId: project.teamId.toString(),
      myRole: membership.role,
    },
    totalTickets: formattedTickets.length,
    counts,
    columns,
  };
}

export async function getTicketById(
  ticketId: string,
  userId: string,
): Promise<PublicTicket> {
  const { ticket } = await requireTicketAccess(ticketId, userId);
  return formatSingleTicketWithUsers(ticket);
}

export async function listTicketHistory(
  ticketId: string,
  userId: string,
  query: ListTicketHistoryQuery = {},
): Promise<PublicTicketHistory[]> {
  await requireTicketAccess(ticketId, userId);

  const sortDirection = query.order === 'desc' ? -1 : 1;
  const entries = await TicketHistoryModel.find({ ticketId }).sort({
    createdAt: sortDirection,
    _id: sortDirection,
  });

  return formatTicketHistoryWithUsers(entries);
}

export async function updateTicket(
  ticketId: string,
  userId: string,
  input: UpdateTicketInput,
): Promise<PublicTicket> {
  const { ticket, project, membership } = await requireTicketAccess(
    ticketId,
    userId,
  );

  const isManager = PROJECT_MANAGER_ROLES.includes(membership.role);

  if (input.status !== undefined) {
    validateTicketStatusTransition(
      ticket,
      input.status,
      membership.role,
      userId,
    );
  }

  if (!isManager) {
    if (input.featureId !== undefined) {
      throw AppError.forbidden(MESSAGES.FEATURES.MANAGE_FORBIDDEN);
    }

    if (input.assignedTo !== undefined) {
      const canSelfClaim =
        ticket.assignedTo === null && input.assignedTo === userId;
      if (!canSelfClaim) {
        throw AppError.forbidden(MESSAGES.TICKETS.ASSIGN_FORBIDDEN);
      }
    }

    const editsContentFields =
      input.title !== undefined ||
      input.description !== undefined ||
      input.priority !== undefined ||
      input.type !== undefined ||
      input.dueDate !== undefined;

    if (editsContentFields) {
      const isCreatorOrAssignee =
        ticket.createdBy.toString() === userId ||
        ticket.assignedTo?.toString() === userId;

      if (!isCreatorOrAssignee) {
        throw AppError.forbidden(MESSAGES.TICKETS.EDIT_FORBIDDEN);
      }
    }
  }

  if (input.featureId !== undefined && input.featureId !== null) {
    await validateFeatureBelongsToProject(
      input.featureId,
      project._id.toString(),
    );
  }

  let newAssigneeUser: UserDocument | null = null;
  if (input.assignedTo !== undefined && input.assignedTo !== null) {
    newAssigneeUser = await validateAssigneeInTeam(
      input.assignedTo,
      project.teamId.toString(),
    );
  }

  // Snapshot before applying mutations for audit history
  const prevStatus = ticket.status;
  const prevPriority = ticket.priority;
  const prevType = ticket.type;
  const prevDueDate = ticket.dueDate;
  const prevFeatureId = ticket.featureId ? ticket.featureId.toString() : null;
  const prevAssignedTo = ticket.assignedTo ? ticket.assignedTo.toString() : null;
  const prevTitle = ticket.title;
  const prevDescription = ticket.description;

  if (input.featureId !== undefined) {
    ticket.featureId = input.featureId
      ? new Types.ObjectId(input.featureId)
      : null;
  }
  if (input.title !== undefined) {
    ticket.title = input.title;
  }
  if (input.description !== undefined) {
    ticket.description = input.description;
  }
  if (input.status !== undefined) {
    ticket.status = input.status;
  }
  if (input.priority !== undefined) {
    ticket.priority = input.priority;
  }
  if (input.type !== undefined) {
    ticket.type = input.type;
  }
  if (input.dueDate !== undefined) {
    ticket.dueDate = input.dueDate;
  }
  if (input.assignedTo !== undefined) {
    ticket.assignedTo = input.assignedTo
      ? new Types.ObjectId(input.assignedTo)
      : null;
  }

  await ticket.save();

  const historyEntries: RecordTicketHistoryEntry[] = [];
  const nextAssignedTo = ticket.assignedTo ? ticket.assignedTo.toString() : null;
  const nextFeatureId = ticket.featureId ? ticket.featureId.toString() : null;

  if (ticket.status !== prevStatus) {
    historyEntries.push({
      ticketId: ticket._id,
      projectId: project._id,
      actorId: userId,
      action: 'status_changed',
      field: 'status',
      fromValue: prevStatus,
      toValue: ticket.status,
      summary: `Statut modifié de « ${KANBAN_COLUMN_LABELS[prevStatus]} » à « ${KANBAN_COLUMN_LABELS[ticket.status]} »`,
    });
  }

  if (nextAssignedTo !== prevAssignedTo) {
    if (nextAssignedTo !== null) {
      const assigneeName = formatUserDisplayName(newAssigneeUser);
      historyEntries.push({
        ticketId: ticket._id,
        projectId: project._id,
        actorId: userId,
        action: 'assigned',
        field: 'assignedTo',
        fromValue: prevAssignedTo,
        toValue: nextAssignedTo,
        summary: `Ticket attribué à ${assigneeName}`,
      });
    } else {
      historyEntries.push({
        ticketId: ticket._id,
        projectId: project._id,
        actorId: userId,
        action: 'unassigned',
        field: 'assignedTo',
        fromValue: prevAssignedTo,
        toValue: null,
        summary: 'Ticket désassigné',
      });
    }
  }

  if (ticket.priority !== prevPriority) {
    historyEntries.push({
      ticketId: ticket._id,
      projectId: project._id,
      actorId: userId,
      action: 'priority_changed',
      field: 'priority',
      fromValue: prevPriority,
      toValue: ticket.priority,
      summary: `Priorité modifiée de « ${prevPriority} » à « ${ticket.priority} »`,
    });
  }

  if (ticket.type !== prevType) {
    historyEntries.push({
      ticketId: ticket._id,
      projectId: project._id,
      actorId: userId,
      action: 'type_changed',
      field: 'type',
      fromValue: prevType,
      toValue: ticket.type,
      summary: `Type modifié de « ${prevType} » à « ${ticket.type} »`,
    });
  }

  if (ticket.dueDate !== prevDueDate) {
    historyEntries.push({
      ticketId: ticket._id,
      projectId: project._id,
      actorId: userId,
      action: 'due_date_changed',
      field: 'dueDate',
      fromValue: prevDueDate,
      toValue: ticket.dueDate,
      summary: ticket.dueDate
        ? `Date limite définie au ${ticket.dueDate}`
        : 'Date limite retirée',
    });
  }

  if (nextFeatureId !== prevFeatureId) {
    historyEntries.push({
      ticketId: ticket._id,
      projectId: project._id,
      actorId: userId,
      action: 'feature_changed',
      field: 'featureId',
      fromValue: prevFeatureId,
      toValue: nextFeatureId,
      summary: nextFeatureId
        ? 'Ticket rattaché à une feature'
        : 'Ticket détaché de sa feature',
    });
  }

  if (ticket.title !== prevTitle || ticket.description !== prevDescription) {
    historyEntries.push({
      ticketId: ticket._id,
      projectId: project._id,
      actorId: userId,
      action: 'details_updated',
      field:
        ticket.title !== prevTitle && ticket.description !== prevDescription
          ? 'title,description'
          : ticket.title !== prevTitle
            ? 'title'
            : 'description',
      fromValue: ticket.title !== prevTitle ? prevTitle : null,
      toValue: ticket.title !== prevTitle ? ticket.title : null,
      summary: 'Contenu du ticket (titre ou description) mis à jour',
    });
  }

  await recordTicketHistoryEntries(historyEntries);

  return formatSingleTicketWithUsers(ticket);
}

export async function updateTicketStatus(
  ticketId: string,
  userId: string,
  input: UpdateTicketStatusInput,
): Promise<PublicTicket> {
  const { ticket, project, membership } = await requireTicketAccess(
    ticketId,
    userId,
  );

  validateTicketStatusTransition(ticket, input.status, membership.role, userId);

  const prevStatus = ticket.status;
  const historyEntries: RecordTicketHistoryEntry[] = [];

  if (prevStatus !== input.status) {
    ticket.status = input.status;
    await ticket.save();

    historyEntries.push({
      ticketId: ticket._id,
      projectId: project._id,
      actorId: userId,
      action: 'status_changed',
      field: 'status',
      fromValue: prevStatus,
      toValue: ticket.status,
      summary: `Statut modifié de « ${KANBAN_COLUMN_LABELS[prevStatus]} » à « ${KANBAN_COLUMN_LABELS[ticket.status]} »`,
    });
  }

  if (input.comment !== undefined) {
    const createdComment = await CommentModel.create({
      ticketId: ticket._id,
      projectId: project._id,
      authorId: userId,
      content: input.comment,
    });

    historyEntries.push({
      ticketId: ticket._id,
      projectId: project._id,
      actorId: userId,
      action: 'comment_added',
      field: 'comment',
      fromValue: null,
      toValue: createdComment._id.toString(),
      summary: `Commentaire ajouté sur ${ticket.key}`,
    });
  }

  await recordTicketHistoryEntries(historyEntries);

  return formatSingleTicketWithUsers(ticket);
}

export async function assignTicket(
  ticketId: string,
  userId: string,
  input: AssignTicketInput,
): Promise<PublicTicket> {
  const { ticket, project, membership } = await requireTicketAccess(
    ticketId,
    userId,
  );

  const isManager = PROJECT_MANAGER_ROLES.includes(membership.role);

  if (!isManager) {
    const canSelfClaim =
      ticket.assignedTo === null && input.assignedTo === userId;
    if (!canSelfClaim) {
      throw AppError.forbidden(MESSAGES.TICKETS.ASSIGN_FORBIDDEN);
    }
  }

  let assigneeUser: UserDocument | null = null;
  if (input.assignedTo !== null) {
    assigneeUser = await validateAssigneeInTeam(
      input.assignedTo,
      project.teamId.toString(),
    );
  }

  const prevAssignedTo = ticket.assignedTo ? ticket.assignedTo.toString() : null;
  const nextAssignedTo = input.assignedTo;

  if (prevAssignedTo !== nextAssignedTo) {
    ticket.assignedTo = nextAssignedTo
      ? new Types.ObjectId(nextAssignedTo)
      : null;
    await ticket.save();

    if (nextAssignedTo !== null) {
      const assigneeName = formatUserDisplayName(assigneeUser);
      await recordTicketHistoryEntries([
        {
          ticketId: ticket._id,
          projectId: project._id,
          actorId: userId,
          action: 'assigned',
          field: 'assignedTo',
          fromValue: prevAssignedTo,
          toValue: nextAssignedTo,
          summary: `Ticket attribué à ${assigneeName}`,
        },
      ]);
    } else {
      await recordTicketHistoryEntries([
        {
          ticketId: ticket._id,
          projectId: project._id,
          actorId: userId,
          action: 'unassigned',
          field: 'assignedTo',
          fromValue: prevAssignedTo,
          toValue: null,
          summary: 'Ticket désassigné',
        },
      ]);
    }
  }

  return formatSingleTicketWithUsers(ticket);
}

export async function deleteTicket(
  ticketId: string,
  userId: string,
): Promise<void> {
  await requireTicketAccess(
    ticketId,
    userId,
    PROJECT_MANAGER_ROLES,
    MESSAGES.TICKETS.DELETE_FORBIDDEN,
  );
  await CommentModel.deleteMany({ ticketId });
  await TicketHistoryModel.deleteMany({ ticketId });
  await TicketModel.findByIdAndDelete(ticketId);
}
