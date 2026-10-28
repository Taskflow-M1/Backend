import { AppError } from '../../utils/app-error';
import { MESSAGES } from '../../utils/constants';
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
import { TicketModel } from '../tickets/ticket.model';
import {
  FeatureDocument,
  FeatureModel,
  IFeature,
  PublicFeature,
  toPublicFeature,
} from './feature.model';
import { CreateFeatureInput, UpdateFeatureInput } from './feature.validation';

interface FeatureTicketStats {
  total: number;
  done: number;
}

async function attachFeaturesProgress(
  features: FeatureDocument[],
): Promise<PublicFeature[]> {
  if (features.length === 0) {
    return [];
  }

  const featureIds = features.map((feature) => feature._id);
  const aggregated = await TicketModel.aggregate<{
    _id: unknown;
    total: number;
    done: number;
  }>([
    { $match: { featureId: { $in: featureIds } } },
    {
      $group: {
        _id: '$featureId',
        total: { $sum: 1 },
        done: {
          $sum: {
            $cond: [{ $eq: ['$status', 'done'] }, 1, 0],
          },
        },
      },
    },
  ]);

  const statsByFeatureId = new Map<string, FeatureTicketStats>(
    aggregated.map((entry) => [
      String(entry._id),
      { total: entry.total, done: entry.done },
    ]),
  );

  return features.map((feature) => {
    const stats = statsByFeatureId.get(feature._id.toString());
    const ticketCount = stats?.total ?? 0;
    const doneTicketCount = stats?.done ?? 0;
    const progressPercent =
      ticketCount === 0 ? 0 : Math.round((doneTicketCount / ticketCount) * 100);

    return {
      ...toPublicFeature(feature),
      ticketCount,
      doneTicketCount,
      progressPercent,
    };
  });
}

export async function requireFeatureAccess(
  featureId: string,
  userId: string,
  allowedRoles?: readonly TeamRole[],
): Promise<{
  feature: FeatureDocument;
  project: ProjectDocument;
  membership: TeamMembershipDocument;
}> {
  const feature = await FeatureModel.findById(featureId);
  if (!feature) {
    throw AppError.notFound(MESSAGES.FEATURES.NOT_FOUND);
  }

  const { project, membership } = await requireProjectAccess(
    feature.projectId.toString(),
    userId,
  );

  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    throw AppError.forbidden(MESSAGES.FEATURES.MANAGE_FORBIDDEN);
  }

  return { feature, project, membership };
}

export async function createFeature(
  creatorId: string,
  input: CreateFeatureInput,
): Promise<PublicFeature> {
  const { membership } = await requireProjectAccess(input.projectId, creatorId);

  if (!PROJECT_MANAGER_ROLES.includes(membership.role)) {
    throw AppError.forbidden(MESSAGES.FEATURES.MANAGE_FORBIDDEN);
  }

  const createdFeature = await FeatureModel.create({
    projectId: input.projectId,
    title: input.title,
    description: input.description ?? '',
    createdBy: creatorId,
  });

  return toPublicFeature(createdFeature);
}

export async function listAccessibleFeatures(
  userId: string,
  projectId?: string,
): Promise<PublicFeature[]> {
  if (projectId) {
    await requireProjectAccess(projectId, userId);
    const features = await FeatureModel.find({ projectId }).sort({
      createdAt: -1,
    });
    return attachFeaturesProgress(features);
  }

  const memberships = await TeamMembershipModel.find({ userId }).select(
    'teamId',
  );
  if (memberships.length === 0) {
    return [];
  }

  const teamIds = memberships.map((membership) => membership.teamId);
  const accessibleProjects = await ProjectModel.find({
    teamId: { $in: teamIds },
  }).select('_id');

  if (accessibleProjects.length === 0) {
    return [];
  }

  const projectIds = accessibleProjects.map((project) => project._id);
  const features = await FeatureModel.find({
    projectId: { $in: projectIds },
  }).sort({ createdAt: -1 });

  return attachFeaturesProgress(features);
}

export async function getFeatureById(
  featureId: string,
  userId: string,
): Promise<PublicFeature> {
  const { feature } = await requireFeatureAccess(featureId, userId);
  const [enriched] = await attachFeaturesProgress([feature]);
  return enriched;
}

export async function updateFeature(
  featureId: string,
  userId: string,
  input: UpdateFeatureInput,
): Promise<PublicFeature> {
  await requireFeatureAccess(featureId, userId, PROJECT_MANAGER_ROLES);

  const updates: Partial<Pick<IFeature, 'title' | 'description'>> = {};
  if (input.title !== undefined) {
    updates.title = input.title;
  }
  if (input.description !== undefined) {
    updates.description = input.description;
  }

  const updatedFeature = await FeatureModel.findByIdAndUpdate(
    featureId,
    { $set: updates },
    { returnDocument: 'after', runValidators: true },
  );

  if (!updatedFeature) {
    throw AppError.notFound(MESSAGES.FEATURES.NOT_FOUND);
  }

  const [enriched] = await attachFeaturesProgress([updatedFeature]);
  return enriched;
}

export async function deleteFeature(
  featureId: string,
  userId: string,
): Promise<void> {
  await requireFeatureAccess(featureId, userId, PROJECT_MANAGER_ROLES);
  await TicketModel.updateMany({ featureId }, { $set: { featureId: null } });
  await FeatureModel.findByIdAndDelete(featureId);
}
