/**
 * Agrège les équipes, projets et tickets accessibles pour produire les KPI,
 * graphiques et listes récentes affichés sur le tableau de bord.
 */
import { Types } from 'mongoose';
import { AppError } from '../../utils/app-error';
import { MESSAGES } from '../../utils/constants';
import { getTodayDateString } from '../../utils/date';
import {
  ProjectDocument,
  ProjectModel,
  toPublicProject,
} from '../projects/project.model';
import {
  PROJECT_MANAGER_ROLES,
  ProjectWithRole,
  requireProjectAccess,
} from '../projects/project.service';
import { TaskModel } from '../tasks/task.model';
import {
  TeamMembershipModel,
  TeamRole,
} from '../teams/team-membership.model';
import {
  listMyTeams,
  requireTeamMembership,
  TeamListItem,
} from '../teams/team.service';
import {
  PublicTicketHistory,
  TicketHistoryDocument,
  TicketHistoryModel,
} from '../tickets/ticket-history.model';
import { formatTicketHistoryWithUsers } from '../tickets/ticket-history.service';
import {
  PublicTicket,
  TicketModel,
  TicketPriority,
  TicketStatus,
} from '../tickets/ticket.model';
import { formatTicketsWithUsers } from '../tickets/ticket.service';
import { DashboardQuery } from './dashboard.validation';

const DEFAULT_ACTIVITY_LIMIT = 15;
const DASHBOARD_TICKET_LIST_LIMIT = 10;

const ROLE_PRIORITY: Readonly<Record<TeamRole, number>> = {
  admin: 4,
  project_manager: 3,
  tester: 2,
  developer: 1,
};

export interface DashboardProjectProgress extends ProjectWithRole {
  ticketCount: number;
  doneTicketCount: number;
  overdueTicketCount: number;
  progressPercent: number;
}

export interface DashboardActivityItem extends PublicTicketHistory {
  ticketKey: string | null;
  ticketTitle: string | null;
  projectKey: string | null;
  projectName: string | null;
}

export interface PersonalTasksStats {
  total: number;
  todo: number;
  doing: number;
  done: number;
  overdue: number;
  completionRatePercent: number;
}

export interface DashboardRoleContext {
  highestRole: TeamRole | 'individual';
  isManagerInScope: boolean;
  isTesterInScope: boolean;
  managedTeamIds: string[];
  unassignedTicketsCount: number;
  testingQueueCount: number;
}

export interface DashboardSummary {
  accessibleTeamsCount: number;
  accessibleProjectsCount: number;
  totalTicketsCount: number;
  statusCounts: Record<TicketStatus, number>;
  priorityCounts: Record<TicketPriority, number>;
  inProgressCount: number;
  assignedToMeCount: number;
  overdueCount: number;
  myOverdueCount: number;
  completionRatePercent: number;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  roleContext: DashboardRoleContext;
  personalTasks: PersonalTasksStats;
  assignedTickets: PublicTicket[];
  overdueTickets: PublicTicket[];
  projects: DashboardProjectProgress[];
  teams: TeamListItem[];
  recentActivity: DashboardActivityItem[];
}

async function computePersonalTasksStats(
  userId: string,
  today: string,
): Promise<PersonalTasksStats> {
  const userObjectId = new Types.ObjectId(userId);
  const [grouped] = await TaskModel.aggregate<{
    total: number;
    todo: number;
    doing: number;
    done: number;
    overdue: number;
  }>([
    { $match: { ownerId: userObjectId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        todo: { $sum: { $cond: [{ $eq: ['$status', 'todo'] }, 1, 0] } },
        doing: { $sum: { $cond: [{ $eq: ['$status', 'doing'] }, 1, 0] } },
        done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$dueDate', null] },
                  { $lt: ['$dueDate', today] },
                  { $ne: ['$status', 'done'] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const total = grouped?.total ?? 0;
  const done = grouped?.done ?? 0;

  return {
    total,
    todo: grouped?.todo ?? 0,
    doing: grouped?.doing ?? 0,
    done,
    overdue: grouped?.overdue ?? 0,
    completionRatePercent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

async function enrichActivityItems(
  historyDocs: TicketHistoryDocument[],
  projectsById: ReadonlyMap<string, ProjectDocument>,
): Promise<DashboardActivityItem[]> {
  if (historyDocs.length === 0) {
    return [];
  }

  const formattedHistory = await formatTicketHistoryWithUsers(historyDocs);

  const ticketIds = Array.from(
    new Set(historyDocs.map((entry) => entry.ticketId.toString())),
  );
  const tickets = await TicketModel.find({
    _id: { $in: ticketIds },
  }).select('_id key title');

  const ticketMetaById = new Map<string, { key: string; title: string }>(
    tickets.map((ticket) => [
      ticket._id.toString(),
      { key: ticket.key, title: ticket.title },
    ]),
  );

  return formattedHistory.map((item) => {
    const ticketMeta = ticketMetaById.get(item.ticketId);
    const projectDoc = projectsById.get(item.projectId);

    return {
      ...item,
      ticketKey: ticketMeta?.key ?? null,
      ticketTitle: ticketMeta?.title ?? null,
      projectKey: projectDoc?.key ?? null,
      projectName: projectDoc?.name ?? null,
    };
  });
}

function resolveHighestRole(roles: TeamRole[]): TeamRole | 'individual' {
  if (roles.length === 0) {
    return 'individual';
  }

  let best: TeamRole = roles[0];
  for (const role of roles) {
    if (ROLE_PRIORITY[role] > ROLE_PRIORITY[best]) {
      best = role;
    }
  }
  return best;
}

export async function getDashboardData(
  userId: string,
  query: DashboardQuery = {},
): Promise<DashboardResponse> {
  const today = getTodayDateString();
  const userObjectId = new Types.ObjectId(userId);

  const [allMyTeams, personalTasks] = await Promise.all([
    listMyTeams(userId),
    computePersonalTasksStats(userId, today),
  ]);

  let scopedProjects: ProjectDocument[];
  const roleByTeamId = new Map<string, TeamRole>(
    allMyTeams.map((team) => [team.id, team.myRole]),
  );

  if (query.projectId) {
    const { project, membership } = await requireProjectAccess(
      query.projectId,
      userId,
    );

    if (query.teamId && project.teamId.toString() !== query.teamId) {
      throw AppError.badRequest(MESSAGES.DASHBOARD.SCOPE_MISMATCH);
    }

    roleByTeamId.set(project.teamId.toString(), membership.role);
    scopedProjects = [project];
  } else if (query.teamId) {
    const { team, membership } = await requireTeamMembership(
      query.teamId,
      userId,
    );
    roleByTeamId.set(team._id.toString(), membership.role);
    scopedProjects = await ProjectModel.find({ teamId: team._id }).sort({
      createdAt: -1,
    });
  } else {
    const memberships = await TeamMembershipModel.find({ userId });
    for (const m of memberships) {
      roleByTeamId.set(m.teamId.toString(), m.role);
    }
    const scopedTeamIds = memberships.map((m) => m.teamId);
    scopedProjects =
      scopedTeamIds.length > 0
        ? await ProjectModel.find({ teamId: { $in: scopedTeamIds } }).sort({
            createdAt: -1,
          })
        : [];
  }

  const scopedTeams = query.teamId
    ? allMyTeams.filter((team) => team.id === query.teamId)
    : query.projectId
      ? allMyTeams.filter(
          (team) => team.id === scopedProjects[0]?.teamId.toString(),
        )
      : allMyTeams;

  const scopedRoles = scopedTeams.map((team) => team.myRole);
  const highestRole = resolveHighestRole(scopedRoles);
  const managedTeamIds = scopedTeams
    .filter((team) => PROJECT_MANAGER_ROLES.includes(team.myRole))
    .map((team) => team.id);
  const qaTeamIds = scopedTeams
    .filter(
      (team) =>
        PROJECT_MANAGER_ROLES.includes(team.myRole) || team.myRole === 'tester',
    )
    .map((team) => team.id);

  if (scopedProjects.length === 0) {
    return {
      summary: {
        accessibleTeamsCount: scopedTeams.length,
        accessibleProjectsCount: 0,
        totalTicketsCount: 0,
        statusCounts: { todo: 0, doing: 0, testing: 0, done: 0 },
        priorityCounts: { low: 0, medium: 0, high: 0, critical: 0 },
        inProgressCount: 0,
        assignedToMeCount: 0,
        overdueCount: 0,
        myOverdueCount: 0,
        completionRatePercent: 0,
      },
      roleContext: {
        highestRole,
        isManagerInScope: managedTeamIds.length > 0,
        isTesterInScope: qaTeamIds.length > 0,
        managedTeamIds,
        unassignedTicketsCount: 0,
        testingQueueCount: 0,
      },
      personalTasks,
      assignedTickets: [],
      overdueTickets: [],
      projects: [],
      teams: scopedTeams,
      recentActivity: [],
    };
  }

  const projectIds = scopedProjects.map((project) => project._id);
  const managedProjectIds = scopedProjects
    .filter((project) => managedTeamIds.includes(project.teamId.toString()))
    .map((project) => project._id);
  const qaProjectIds = scopedProjects
    .filter((project) => qaTeamIds.includes(project.teamId.toString()))
    .map((project) => project._id);

  const projectsById = new Map<string, ProjectDocument>(
    scopedProjects.map((project) => [project._id.toString(), project]),
  );

  const [
    perProjectAgg,
    priorityAgg,
    assignedDocs,
    overdueDocs,
    historyDocs,
    unassignedTicketsCount,
    testingQueueCount,
  ] = await Promise.all([
    TicketModel.aggregate<{
      _id: unknown;
      total: number;
      todo: number;
      doing: number;
      testing: number;
      done: number;
      assignedToMe: number;
      overdue: number;
      myOverdue: number;
    }>([
      { $match: { projectId: { $in: projectIds } } },
      {
        $group: {
          _id: '$projectId',
          total: { $sum: 1 },
          todo: { $sum: { $cond: [{ $eq: ['$status', 'todo'] }, 1, 0] } },
          doing: { $sum: { $cond: [{ $eq: ['$status', 'doing'] }, 1, 0] } },
          testing: { $sum: { $cond: [{ $eq: ['$status', 'testing'] }, 1, 0] } },
          done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
          assignedToMe: {
            $sum: {
              $cond: [{ $eq: ['$assignedTo', userObjectId] }, 1, 0],
            },
          },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$dueDate', null] },
                    { $lt: ['$dueDate', today] },
                    { $ne: ['$status', 'done'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          myOverdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$assignedTo', userObjectId] },
                    { $ne: ['$dueDate', null] },
                    { $lt: ['$dueDate', today] },
                    { $ne: ['$status', 'done'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    TicketModel.aggregate<{ _id: TicketPriority; count: number }>([
      { $match: { projectId: { $in: projectIds } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
    TicketModel.find({
      projectId: { $in: projectIds },
      assignedTo: userObjectId,
    })
      .sort({ status: 1, dueDate: 1, updatedAt: -1 })
      .limit(DASHBOARD_TICKET_LIST_LIMIT),
    TicketModel.find({
      projectId: { $in: projectIds },
      dueDate: { $ne: null, $lt: today },
      status: { $ne: 'done' },
    })
      .sort({ dueDate: 1, updatedAt: -1 })
      .limit(DASHBOARD_TICKET_LIST_LIMIT),
    TicketHistoryModel.find({ projectId: { $in: projectIds } })
      .sort({ createdAt: -1, _id: -1 })
      .limit(DEFAULT_ACTIVITY_LIMIT),
    managedProjectIds.length > 0
      ? TicketModel.countDocuments({
          projectId: { $in: managedProjectIds },
          assignedTo: null,
          status: { $ne: 'done' },
        })
      : Promise.resolve(0),
    qaProjectIds.length > 0
      ? TicketModel.countDocuments({
          projectId: { $in: qaProjectIds },
          status: 'testing',
        })
      : Promise.resolve(0),
  ]);

  const statsByProjectId = new Map(
    perProjectAgg.map((entry) => [String(entry._id), entry]),
  );

  const statusCounts: Record<TicketStatus, number> = {
    todo: 0,
    doing: 0,
    testing: 0,
    done: 0,
  };
  let totalTicketsCount = 0;
  let assignedToMeCount = 0;
  let overdueCount = 0;
  let myOverdueCount = 0;

  for (const entry of perProjectAgg) {
    totalTicketsCount += entry.total;
    statusCounts.todo += entry.todo;
    statusCounts.doing += entry.doing;
    statusCounts.testing += entry.testing;
    statusCounts.done += entry.done;
    assignedToMeCount += entry.assignedToMe;
    overdueCount += entry.overdue;
    myOverdueCount += entry.myOverdue;
  }

  const priorityCounts: Record<TicketPriority, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  for (const p of priorityAgg) {
    if (p._id in priorityCounts) {
      priorityCounts[p._id] = p.count;
    }
  }

  const projects: DashboardProjectProgress[] = scopedProjects.map((project) => {
    const projectStats = statsByProjectId.get(project._id.toString());
    const ticketCount = projectStats?.total ?? 0;
    const doneTicketCount = projectStats?.done ?? 0;
    const overdueTicketCount = projectStats?.overdue ?? 0;
    const progressPercent =
      ticketCount === 0 ? 0 : Math.round((doneTicketCount / ticketCount) * 100);

    return {
      ...toPublicProject(project),
      myRole: roleByTeamId.get(project.teamId.toString()) ?? 'developer',
      ticketCount,
      doneTicketCount,
      overdueTicketCount,
      progressPercent,
    };
  });

  const [assignedTickets, overdueTickets, recentActivity] = await Promise.all([
    formatTicketsWithUsers(assignedDocs),
    formatTicketsWithUsers(overdueDocs),
    enrichActivityItems(historyDocs, projectsById),
  ]);

  const completionRatePercent =
    totalTicketsCount === 0
      ? 0
      : Math.round((statusCounts.done / totalTicketsCount) * 100);

  return {
    summary: {
      accessibleTeamsCount: scopedTeams.length,
      accessibleProjectsCount: scopedProjects.length,
      totalTicketsCount,
      statusCounts,
      priorityCounts,
      inProgressCount: statusCounts.doing + statusCounts.testing,
      assignedToMeCount,
      overdueCount,
      myOverdueCount,
      completionRatePercent,
    },
    roleContext: {
      highestRole,
      isManagerInScope: managedTeamIds.length > 0,
      isTesterInScope: qaTeamIds.length > 0,
      managedTeamIds,
      unassignedTicketsCount,
      testingQueueCount,
    },
    personalTasks,
    assignedTickets,
    overdueTickets,
    projects,
    teams: scopedTeams,
    recentActivity,
  };
}

export async function listTeamRecentActivity(
  teamId: string,
  userId: string,
  limit: number = 20,
): Promise<DashboardActivityItem[]> {
  await requireTeamMembership(teamId, userId);

  const teamProjects = await ProjectModel.find({ teamId });
  if (teamProjects.length === 0) {
    return [];
  }

  const projectIds = teamProjects.map((project) => project._id);
  const projectsById = new Map<string, ProjectDocument>(
    teamProjects.map((project) => [project._id.toString(), project]),
  );

  const historyDocs = await TicketHistoryModel.find({
    projectId: { $in: projectIds },
  })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit);

  return enrichActivityItems(historyDocs, projectsById);
}
