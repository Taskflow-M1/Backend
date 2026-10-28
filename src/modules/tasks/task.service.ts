/**
 * Applique le CRUD des tâches en filtrant toujours par propriétaire.
 * Ce filtrage empêche un utilisateur d'accéder aux tâches d'un autre compte.
 */
import { AppError } from '../../utils/app-error';
import { MESSAGES } from '../../utils/constants';
import { ITask, PublicTask, TaskModel, toPublicTask } from './task.model';
import { CreateTaskInput, UpdateTaskInput } from './task.validation';

export async function listTasksByOwner(ownerId: string): Promise<PublicTask[]> {
  const tasks = await TaskModel.find({ ownerId }).sort({ createdAt: -1 });
  return tasks.map(toPublicTask);
}

export async function createTaskForOwner(
  ownerId: string,
  input: CreateTaskInput,
): Promise<PublicTask> {
  const createdTask = await TaskModel.create({
    ownerId,
    title: input.title,
    status: input.status,
    description: input.description ?? '',
    dueDate: input.dueDate ?? null,
  });

  return toPublicTask(createdTask);
}

export async function getTaskByIdForOwner(
  ownerId: string,
  taskId: string,
): Promise<PublicTask> {
  const task = await TaskModel.findOne({ _id: taskId, ownerId });

  if (!task) {
    throw AppError.notFound(MESSAGES.TASKS.NOT_FOUND);
  }

  return toPublicTask(task);
}

export async function updateTaskForOwner(
  ownerId: string,
  taskId: string,
  input: UpdateTaskInput,
): Promise<PublicTask> {
  const updates: Partial<
    Pick<ITask, 'title' | 'status' | 'description' | 'dueDate'>
  > = {};

  if (input.title !== undefined) {
    updates.title = input.title;
  }
  if (input.status !== undefined) {
    updates.status = input.status;
  }
  if (input.description !== undefined) {
    updates.description = input.description;
  }
  if (input.dueDate !== undefined) {
    updates.dueDate = input.dueDate;
  }

  const updatedTask = await TaskModel.findOneAndUpdate(
    { _id: taskId, ownerId },
    { $set: updates },
    { returnDocument: 'after', runValidators: true },
  );

  if (!updatedTask) {
    throw AppError.notFound(MESSAGES.TASKS.NOT_FOUND);
  }

  return toPublicTask(updatedTask);
}

export async function deleteTaskForOwner(
  ownerId: string,
  taskId: string,
): Promise<void> {
  const deletedTask = await TaskModel.findOneAndDelete({
    _id: taskId,
    ownerId,
  });

  if (!deletedTask) {
    throw AppError.notFound(MESSAGES.TASKS.NOT_FOUND);
  }
}
