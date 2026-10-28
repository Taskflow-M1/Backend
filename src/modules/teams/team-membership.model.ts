import mongoose, { HydratedDocument, Schema, Types } from 'mongoose';

export const TEAM_ROLES = [
  'admin',
  'project_manager',
  'developer',
  'tester',
] as const;

export type TeamRole = (typeof TEAM_ROLES)[number];

export interface ITeamMembership {
  teamId: Types.ObjectId;
  userId: Types.ObjectId;
  role: TeamRole;
  joinedAt: Date;
}

export type TeamMembershipDocument = HydratedDocument<ITeamMembership>;

const teamMembershipSchema = new Schema<ITeamMembership>({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  role: {
    type: String,
    required: true,
    enum: TEAM_ROLES,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensures a user can only appear once per team
teamMembershipSchema.index({ teamId: 1, userId: 1 }, { unique: true });

export const TeamMembershipModel =
  (mongoose.models.TeamMembership as mongoose.Model<ITeamMembership>) ||
  mongoose.model<ITeamMembership>('TeamMembership', teamMembershipSchema);
