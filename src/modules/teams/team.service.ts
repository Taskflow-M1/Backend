import { AppError } from '../../utils/app-error';
import { MESSAGES } from '../../utils/constants';
import { CommentModel } from '../comments/comment.model';
import { FeatureModel } from '../features/feature.model';
import { ProjectModel } from '../projects/project.model';
import { TicketHistoryModel } from '../tickets/ticket-history.model';
import { TicketModel } from '../tickets/ticket.model';
import {
  toUserSummary,
  UserDocument,
  UserModel,
  UserSummary,
} from '../users/user.model';
import {
  TeamMembershipDocument,
  TeamMembershipModel,
  TeamRole,
} from './team-membership.model';
import { PublicTeam, TeamDocument, TeamModel, toPublicTeam } from './team.model';
import {
  AddTeamMemberInput,
  CreateTeamInput,
  UpdateTeamInput,
  UpdateTeamMemberRoleInput,
} from './team.validation';

export type { UserSummary };

export interface TeamMemberItem {
  user: UserSummary;
  role: TeamRole;
  joinedAt: string;
}

export interface TeamListItem extends PublicTeam {
  myRole: TeamRole;
  memberCount: number;
}

export interface TeamDetails extends PublicTeam {
  myRole: TeamRole;
  members: TeamMemberItem[];
}

// Reconnaît une erreur MongoDB causée par une valeur déjà utilisée.
function isMongoDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 11000
  );
}

// Vérifie l’appartenance à l’équipe et les rôles éventuellement requis.
export async function requireTeamMembership(
  teamId: string,
  userId: string,
  allowedRoles?: readonly TeamRole[],
): Promise<{ team: TeamDocument; membership: TeamMembershipDocument }> {
  const team = await TeamModel.findById(teamId);
  if (!team) {
    throw AppError.notFound(MESSAGES.TEAMS.NOT_FOUND);
  }

  const membership = await TeamMembershipModel.findOne({ teamId, userId });
  if (!membership) {
    throw AppError.forbidden(MESSAGES.TEAMS.ACCESS_DENIED);
  }

  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    const message =
      allowedRoles.length === 1 && allowedRoles[0] === 'admin'
        ? MESSAGES.TEAMS.ADMIN_REQUIRED
        : MESSAGES.COMMON.FORBIDDEN;
    throw AppError.forbidden(message);
  }

  return { team, membership };
}

// Indique si un utilisateur appartient à une équipe.
export async function isUserTeamMember(
  teamId: string,
  userId: string,
): Promise<boolean> {
  const exists = await TeamMembershipModel.exists({ teamId, userId });
  return Boolean(exists);
}

// Crée la ressource après validation des droits et des données.
export async function createTeam(
  creatorId: string,
  input: CreateTeamInput,
): Promise<TeamListItem> {
  const createdTeam = await TeamModel.create({
    name: input.name,
    description: input.description ?? '',
    createdBy: creatorId,
  });

  try {
    await TeamMembershipModel.create({
      teamId: createdTeam._id,
      userId: creatorId,
      role: 'admin',
    });
  } catch (err) {
    await TeamModel.findByIdAndDelete(createdTeam._id);
    throw err;
  }

  return {
    ...toPublicTeam(createdTeam),
    myRole: 'admin',
    memberCount: 1,
  };
}

// Retourne la liste demandée en respectant les droits de l’utilisateur.
export async function listMyTeams(userId: string): Promise<TeamListItem[]> {
  const memberships = await TeamMembershipModel.find({ userId }).sort({
    joinedAt: -1,
  });

  if (memberships.length === 0) {
    return [];
  }

  const teamIds = memberships.map((m) => m.teamId);
  const roleByTeamId = new Map<string, TeamRole>(
    memberships.map((m) => [m.teamId.toString(), m.role]),
  );

  const [teams, memberCounts] = await Promise.all([
    TeamModel.find({ _id: { $in: teamIds } }).sort({ createdAt: -1 }),
    TeamMembershipModel.aggregate<{ _id: unknown; count: number }>([
      { $match: { teamId: { $in: teamIds } } },
      { $group: { _id: '$teamId', count: { $sum: 1 } } },
    ]),
  ]);

  const countByTeamId = new Map<string, number>(
    memberCounts.map((entry) => [String(entry._id), entry.count]),
  );

  return teams.map((team) => {
    const teamIdStr = team._id.toString();
    return {
      ...toPublicTeam(team),
      myRole: roleByTeamId.get(teamIdStr) ?? 'developer',
      memberCount: countByTeamId.get(teamIdStr) ?? 1,
    };
  });
}

// Charge les membres et prépare leur représentation publique.
async function fetchFormattedTeamMembers(
  teamId: string,
): Promise<TeamMemberItem[]> {
  const memberships = await TeamMembershipModel.find({ teamId })
    .populate<{ userId: UserDocument | null }>('userId')
    .sort({ joinedAt: 1 });

  return memberships
    .filter(
      (m): m is typeof m & { userId: UserDocument } => m.userId !== null,
    )
    .map((m) => ({
      user: toUserSummary(m.userId),
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
    }));
}

// Récupère la ressource demandée après contrôle de son accès.
export async function getTeamDetails(
  teamId: string,
  requesterId: string,
): Promise<TeamDetails> {
  const { team, membership } = await requireTeamMembership(teamId, requesterId);
  const members = await fetchFormattedTeamMembers(teamId);

  return {
    ...toPublicTeam(team),
    myRole: membership.role,
    members,
  };
}

// Met à jour la ressource après validation des droits et des données.
export async function updateTeam(
  teamId: string,
  requesterId: string,
  input: UpdateTeamInput,
): Promise<PublicTeam> {
  await requireTeamMembership(teamId, requesterId, ['admin']);

  const updates: { name?: string; description?: string } = {};
  if (input.name !== undefined) {
    updates.name = input.name;
  }
  if (input.description !== undefined) {
    updates.description = input.description;
  }

  const updatedTeam = await TeamModel.findByIdAndUpdate(
    teamId,
    { $set: updates },
    { returnDocument: 'after', runValidators: true },
  );

  if (!updatedTeam) {
    throw AppError.notFound(MESSAGES.TEAMS.NOT_FOUND);
  }

  return toPublicTeam(updatedTeam);
}

// Supprime la ressource après vérification des autorisations.
export async function deleteTeam(
  teamId: string,
  requesterId: string,
): Promise<void> {
  await requireTeamMembership(teamId, requesterId, ['admin']);

  const teamProjects = await ProjectModel.find({ teamId }).select('_id');
  if (teamProjects.length > 0) {
    const projectIds = teamProjects.map((project) => project._id);
    await CommentModel.deleteMany({ projectId: { $in: projectIds } });
    await TicketHistoryModel.deleteMany({ projectId: { $in: projectIds } });
    await TicketModel.deleteMany({ projectId: { $in: projectIds } });
    await FeatureModel.deleteMany({ projectId: { $in: projectIds } });
  }

  await ProjectModel.deleteMany({ teamId });
  await TeamMembershipModel.deleteMany({ teamId });
  await TeamModel.findByIdAndDelete(teamId);
}

// Retourne la liste demandée en respectant les droits de l’utilisateur.
export async function listTeamMembers(
  teamId: string,
  requesterId: string,
): Promise<TeamMemberItem[]> {
  await requireTeamMembership(teamId, requesterId);
  return fetchFormattedTeamMembers(teamId);
}

// Ajoute la ressource après validation des autorisations.
export async function addTeamMember(
  teamId: string,
  requesterId: string,
  input: AddTeamMemberInput,
): Promise<TeamMemberItem> {
  await requireTeamMembership(teamId, requesterId, ['admin']);

  const targetUser = input.userId
    ? await UserModel.findById(input.userId)
    : await UserModel.findOne({ email: input.email });

  if (!targetUser) {
    throw AppError.notFound(MESSAGES.USERS.NOT_FOUND);
  }

  const existingMembership = await TeamMembershipModel.findOne({
    teamId,
    userId: targetUser._id,
  });

  if (existingMembership) {
    throw AppError.conflict(MESSAGES.TEAMS.MEMBER_ALREADY_EXISTS);
  }

  try {
    const createdMembership = await TeamMembershipModel.create({
      teamId,
      userId: targetUser._id,
      role: input.role,
    });

    return {
      user: toUserSummary(targetUser),
      role: createdMembership.role,
      joinedAt: createdMembership.joinedAt.toISOString(),
    };
  } catch (err) {
    if (isMongoDuplicateKeyError(err)) {
      throw AppError.conflict(MESSAGES.TEAMS.MEMBER_ALREADY_EXISTS);
    }
    throw err;
  }
}

// Met à jour la ressource après validation des droits et des données.
export async function updateTeamMemberRole(
  teamId: string,
  requesterId: string,
  targetUserId: string,
  input: UpdateTeamMemberRoleInput,
): Promise<TeamMemberItem> {
  await requireTeamMembership(teamId, requesterId, ['admin']);

  const targetMembership = await TeamMembershipModel.findOne({
    teamId,
    userId: targetUserId,
  });

  if (!targetMembership) {
    throw AppError.notFound(MESSAGES.TEAMS.MEMBER_NOT_FOUND);
  }

  if (targetMembership.role === 'admin' && input.role !== 'admin') {
    const adminCount = await TeamMembershipModel.countDocuments({
      teamId,
      role: 'admin',
    });

    if (adminCount <= 1) {
      throw AppError.badRequest(MESSAGES.TEAMS.LAST_ADMIN_REQUIRED);
    }
  }

  targetMembership.role = input.role;
  await targetMembership.save();

  const targetUser = await UserModel.findById(targetUserId);
  if (!targetUser) {
    throw AppError.notFound(MESSAGES.USERS.NOT_FOUND);
  }

  return {
    user: toUserSummary(targetUser),
    role: targetMembership.role,
    joinedAt: targetMembership.joinedAt.toISOString(),
  };
}

// Retire la ressource après vérification des autorisations.
export async function removeTeamMember(
  teamId: string,
  requesterId: string,
  targetUserId: string,
): Promise<void> {
  await requireTeamMembership(teamId, requesterId, ['admin']);

  const targetMembership = await TeamMembershipModel.findOne({
    teamId,
    userId: targetUserId,
  });

  if (!targetMembership) {
    throw AppError.notFound(MESSAGES.TEAMS.MEMBER_NOT_FOUND);
  }

  if (targetMembership.role === 'admin') {
    const adminCount = await TeamMembershipModel.countDocuments({
      teamId,
      role: 'admin',
    });

    if (adminCount <= 1) {
      throw AppError.badRequest(MESSAGES.TEAMS.LAST_ADMIN_REQUIRED);
    }
  }

  const teamProjects = await ProjectModel.find({ teamId }).select('_id');
  if (teamProjects.length > 0) {
    const projectIds = teamProjects.map((project) => project._id);
    await TicketModel.updateMany(
      { projectId: { $in: projectIds }, assignedTo: targetUserId },
      { $set: { assignedTo: null } },
    );
  }

  await TeamMembershipModel.deleteOne({ _id: targetMembership._id });
}
