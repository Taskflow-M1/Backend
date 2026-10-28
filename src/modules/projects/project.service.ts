/**
 * Gère le cycle de vie des projets et applique les droits issus de l'équipe.
 * La suppression nettoie également les données métier dépendantes.
 */
import { AppError } from '../../utils/app-error';
import { MESSAGES } from '../../utils/constants';
import { CommentModel } from '../comments/comment.model';
import { FeatureModel } from '../features/feature.model';
import {
  TeamMembershipDocument,
  TeamMembershipModel,
  TeamRole,
} from '../teams/team-membership.model';
import { requireTeamMembership } from '../teams/team.service';
import { TicketHistoryModel } from '../tickets/ticket-history.model';
import { TicketModel } from '../tickets/ticket.model';
import {
  IProject,
  ProjectDocument,
  ProjectModel,
  PublicProject,
  toPublicProject,
} from './project.model';
import { CreateProjectInput, UpdateProjectInput } from './project.validation';

export const PROJECT_MANAGER_ROLES: readonly TeamRole[] = [
  'admin',
  'project_manager',
];

export interface ProjectWithRole extends PublicProject {
  myRole: TeamRole;
}

function isMongoDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 11000
  );
}

export async function requireProjectAccess(
  projectId: string,
  userId: string,
  allowedRoles?: readonly TeamRole[],
): Promise<{
  project: ProjectDocument;
  membership: TeamMembershipDocument;
}> {
  const project = await ProjectModel.findById(projectId);
  if (!project) {
    throw AppError.notFound(MESSAGES.PROJECTS.NOT_FOUND);
  }

  const membership = await TeamMembershipModel.findOne({
    teamId: project.teamId,
    userId,
  });

  if (!membership) {
    throw AppError.forbidden(MESSAGES.TEAMS.ACCESS_DENIED);
  }

  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    throw AppError.forbidden(MESSAGES.PROJECTS.MANAGE_FORBIDDEN);
  }

  return { project, membership };
}

export async function createProject(
  creatorId: string,
  input: CreateProjectInput,
): Promise<ProjectWithRole> {
  const { membership } = await requireTeamMembership(input.teamId, creatorId);

  if (!PROJECT_MANAGER_ROLES.includes(membership.role)) {
    throw AppError.forbidden(MESSAGES.PROJECTS.MANAGE_FORBIDDEN);
  }

  const duplicateKey = await ProjectModel.exists({
    teamId: input.teamId,
    key: input.key,
  });

  if (duplicateKey) {
    throw AppError.conflict(MESSAGES.PROJECTS.KEY_ALREADY_USED);
  }

  try {
    const createdProject = await ProjectModel.create({
      teamId: input.teamId,
      name: input.name,
      key: input.key,
      description: input.description ?? '',
      createdBy: creatorId,
    });

    return {
      ...toPublicProject(createdProject),
      myRole: membership.role,
    };
  } catch (err) {
    if (isMongoDuplicateKeyError(err)) {
      throw AppError.conflict(MESSAGES.PROJECTS.KEY_ALREADY_USED);
    }
    throw err;
  }
}

export async function listAccessibleProjects(
  userId: string,
  teamId?: string,
): Promise<ProjectWithRole[]> {
  if (teamId) {
    const { membership } = await requireTeamMembership(teamId, userId);
    const projects = await ProjectModel.find({ teamId }).sort({
      createdAt: -1,
    });

    return projects.map((project) => ({
      ...toPublicProject(project),
      myRole: membership.role,
    }));
  }

  const memberships = await TeamMembershipModel.find({ userId });
  if (memberships.length === 0) {
    return [];
  }

  const teamIds = memberships.map((m) => m.teamId);
  const roleByTeamId = new Map<string, TeamRole>(
    memberships.map((m) => [m.teamId.toString(), m.role]),
  );

  const projects = await ProjectModel.find({ teamId: { $in: teamIds } }).sort({
    createdAt: -1,
  });

  return projects.map((project) => ({
    ...toPublicProject(project),
    myRole: roleByTeamId.get(project.teamId.toString()) ?? 'developer',
  }));
}

export async function getProjectById(
  projectId: string,
  userId: string,
): Promise<ProjectWithRole> {
  const { project, membership } = await requireProjectAccess(projectId, userId);

  return {
    ...toPublicProject(project),
    myRole: membership.role,
  };
}

export async function updateProject(
  projectId: string,
  userId: string,
  input: UpdateProjectInput,
): Promise<ProjectWithRole> {
  const { project, membership } = await requireProjectAccess(
    projectId,
    userId,
    PROJECT_MANAGER_ROLES,
  );

  if (input.key !== undefined && input.key !== project.key) {
    const duplicateKey = await ProjectModel.exists({
      teamId: project.teamId,
      key: input.key,
      _id: { $ne: project._id },
    });

    if (duplicateKey) {
      throw AppError.conflict(MESSAGES.PROJECTS.KEY_ALREADY_USED);
    }
  }

  const updates: Partial<Pick<IProject, 'name' | 'key' | 'description'>> = {};
  if (input.name !== undefined) {
    updates.name = input.name;
  }
  if (input.key !== undefined) {
    updates.key = input.key;
  }
  if (input.description !== undefined) {
    updates.description = input.description;
  }

  try {
    const previousKey = project.key;
    const updatedProject = await ProjectModel.findByIdAndUpdate(
      projectId,
      { $set: updates },
      { returnDocument: 'after', runValidators: true },
    );

    if (!updatedProject) {
      throw AppError.notFound(MESSAGES.PROJECTS.NOT_FOUND);
    }

    if (updatedProject.key !== previousKey) {
      const existingTickets = await TicketModel.find({ projectId }).select(
        '_id ticketNumber',
      );
      if (existingTickets.length > 0) {
        await TicketModel.bulkWrite(
          existingTickets.map((ticket) => ({
            updateOne: {
              filter: { _id: ticket._id },
              update: {
                $set: { key: `${updatedProject.key}-${ticket.ticketNumber}` },
              },
            },
          })),
        );
      }
    }

    return {
      ...toPublicProject(updatedProject),
      myRole: membership.role,
    };
  } catch (err) {
    if (isMongoDuplicateKeyError(err)) {
      throw AppError.conflict(MESSAGES.PROJECTS.KEY_ALREADY_USED);
    }
    throw err;
  }
}

export async function deleteProject(
  projectId: string,
  userId: string,
): Promise<void> {
  await requireProjectAccess(projectId, userId, PROJECT_MANAGER_ROLES);
  await CommentModel.deleteMany({ projectId });
  await TicketHistoryModel.deleteMany({ projectId });
  await TicketModel.deleteMany({ projectId });
  await FeatureModel.deleteMany({ projectId });
  await ProjectModel.findByIdAndDelete(projectId);
}
