import mongoose, { HydratedDocument, Schema, Types } from 'mongoose';

export const TASK_STATUSES = ['todo', 'doing', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface ITask {
  ownerId: Types.ObjectId;
  title: string;
  status: TaskStatus;
  description: string;
  dueDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskDocument = HydratedDocument<ITask>;

export interface PublicTask {
  id: string;
  title: string;
  status: TaskStatus;
  description: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

const taskSchema = new Schema<ITask>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },
    status: {
      type: String,
      required: true,
      enum: TASK_STATUSES,
    },
    description: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    dueDate: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.ownerId;
        return ret;
      },
    },
  },
);

taskSchema.index({ ownerId: 1, createdAt: -1 });

// Transforme le document MongoDB en objet public sans donnée sensible.
export function toPublicTask(task: TaskDocument): PublicTask {
  return {
    id: task._id.toString(),
    title: task.title,
    status: task.status,
    description: task.description,
    dueDate: task.dueDate,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export const TaskModel =
  (mongoose.models.Task as mongoose.Model<ITask>) ||
  mongoose.model<ITask>('Task', taskSchema);
