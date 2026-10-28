/** Valide la création, la modification et les filtres des tâches personnelles. */
import { z } from 'zod';
import { MESSAGES } from '../../utils/constants';
import { isRealCalendarDate } from '../../utils/date';
import { TASK_STATUSES } from './task.model';

const taskTitleSchema = z
  .string({ error: MESSAGES.TASKS.TITLE_REQUIRED })
  .trim()
  .min(1, MESSAGES.TASKS.TITLE_REQUIRED)
  .max(120, MESSAGES.TASKS.TITLE_TOO_LONG);

const taskStatusSchema = z.enum(TASK_STATUSES, {
  error: MESSAGES.TASKS.STATUS_INVALID,
});

const taskDescriptionSchema = z
  .string({ error: MESSAGES.VALIDATION.INVALID_INPUT })
  .max(1000, MESSAGES.TASKS.DESCRIPTION_TOO_LONG);

const taskDueDateSchema = z
  .union(
    [
      z
        .string({ error: MESSAGES.TASKS.DUE_DATE_INVALID })
        .refine(isRealCalendarDate, {
          message: MESSAGES.TASKS.DUE_DATE_INVALID,
        }),
      z.null(),
    ],
    { error: MESSAGES.TASKS.DUE_DATE_INVALID },
  );

export const createTaskSchema = z
  .object({
    title: taskTitleSchema,
    status: taskStatusSchema,
    description: taskDescriptionSchema.optional(),
    dueDate: taskDueDateSchema.optional(),
  })
  .strict();

export const updateTaskSchema = z
  .object({
    title: taskTitleSchema.optional(),
    status: taskStatusSchema.optional(),
    description: taskDescriptionSchema.optional(),
    dueDate: taskDueDateSchema.optional(),
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    { message: MESSAGES.VALIDATION.EMPTY_UPDATE_BODY },
  );

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
