import mongoose, { HydratedDocument, Schema, Types } from 'mongoose';

export interface ITeam {
  name: string;
  description: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type TeamDocument = HydratedDocument<ITeam>;

export interface PublicTeam {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const teamSchema = new Schema<ITeam>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
      default: '',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        ret.createdBy = String(ret.createdBy);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export function toPublicTeam(team: TeamDocument): PublicTeam {
  return {
    id: team._id.toString(),
    name: team.name,
    description: team.description,
    createdBy: team.createdBy.toString(),
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
  };
}

export const TeamModel =
  (mongoose.models.Team as mongoose.Model<ITeam>) ||
  mongoose.model<ITeam>('Team', teamSchema);

