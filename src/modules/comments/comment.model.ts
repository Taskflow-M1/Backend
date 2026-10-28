/** Modèle MongoDB d'un commentaire rattaché à un ticket et à son auteur. */
import mongoose, { HydratedDocument, Schema, Types } from 'mongoose';
import { UserSummary } from '../users/user.model';

export interface IComment {
  ticketId: Types.ObjectId;
  projectId: Types.ObjectId;
  authorId: Types.ObjectId;
  content: string;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CommentDocument = HydratedDocument<IComment>;

export interface PublicComment {
  id: string;
  ticketId: string;
  projectId: string;
  authorId: string;
  author: UserSummary | null;
  content: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

const commentSchema = new Schema<IComment>(
  {
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 2000,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        ret.ticketId = String(ret.ticketId);
        ret.projectId = String(ret.projectId);
        ret.authorId = String(ret.authorId);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

commentSchema.index({ ticketId: 1, createdAt: 1 });

export function toPublicComment(
  comment: CommentDocument,
  usersById?: ReadonlyMap<string, UserSummary>,
): PublicComment {
  const authorIdStr = comment.authorId.toString();

  return {
    id: comment._id.toString(),
    ticketId: comment.ticketId.toString(),
    projectId: comment.projectId.toString(),
    authorId: authorIdStr,
    author: usersById?.get(authorIdStr) ?? null,
    content: comment.content,
    isEdited: comment.isEdited,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}

export const CommentModel =
  (mongoose.models.Comment as mongoose.Model<IComment>) ||
  mongoose.model<IComment>('Comment', commentSchema);
