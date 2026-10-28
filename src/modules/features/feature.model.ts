/** Modèle MongoDB d'une fonctionnalité regroupant des tickets d'un projet. */
import mongoose, { HydratedDocument, Schema, Types } from 'mongoose';

export interface IFeature {
  title: string;
  description: string;
  projectId: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type FeatureDocument = HydratedDocument<IFeature>;

export interface PublicFeature {
  id: string;
  title: string;
  description: string;
  projectId: string;
  createdBy: string;
  ticketCount: number;
  doneTicketCount: number;
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
}

const featureSchema = new Schema<IFeature>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },
    description: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
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
        ret.projectId = String(ret.projectId);
        ret.createdBy = String(ret.createdBy);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

featureSchema.index({ projectId: 1, createdAt: -1 });

export function toPublicFeature(feature: FeatureDocument): PublicFeature {
  return {
    id: feature._id.toString(),
    title: feature.title,
    description: feature.description,
    projectId: feature.projectId.toString(),
    createdBy: feature.createdBy.toString(),
    ticketCount: 0,
    doneTicketCount: 0,
    progressPercent: 0,
    createdAt: feature.createdAt.toISOString(),
    updatedAt: feature.updatedAt.toISOString(),
  };
}

export const FeatureModel =
  (mongoose.models.Feature as mongoose.Model<IFeature>) ||
  mongoose.model<IFeature>('Feature', featureSchema);
