import mongoose, { HydratedDocument, Schema, Types } from 'mongoose';

export interface IProject {
  name: string;
  key: string;
  description: string;
  teamId: Types.ObjectId;
  createdBy: Types.ObjectId;
  ticketCounter: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ProjectDocument = HydratedDocument<IProject>;

export interface PublicProject {
  id: string;
  name: string;
  key: string;
  description: string;
  teamId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    key: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 10,
    },
    description: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ticketCounter: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        ret.teamId = String(ret.teamId);
        ret.createdBy = String(ret.createdBy);
        delete ret.ticketCounter;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Enforces unique project key within the same team
projectSchema.index({ teamId: 1, key: 1 }, { unique: true });

export function toPublicProject(project: ProjectDocument): PublicProject {
  return {
    id: project._id.toString(),
    name: project.name,
    key: project.key,
    description: project.description,
    teamId: project.teamId.toString(),
    createdBy: project.createdBy.toString(),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export const ProjectModel =
  (mongoose.models.Project as mongoose.Model<IProject>) ||
  mongoose.model<IProject>('Project', projectSchema);

