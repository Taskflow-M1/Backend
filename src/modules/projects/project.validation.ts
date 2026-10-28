import { z } from 'zod';
import { objectIdSchema } from '../../middlewares/validate.middleware';
import { MESSAGES } from '../../utils/constants';

const PROJECT_KEY_REGEX = /^[A-Z][A-Z0-9]{1,9}$/;

const projectNameSchema = z
  .string({ error: MESSAGES.PROJECTS.NAME_REQUIRED })
  .trim()
  .min(1, MESSAGES.PROJECTS.NAME_REQUIRED)
  .max(100, MESSAGES.PROJECTS.NAME_TOO_LONG);

const projectKeySchema = z
  .string({ error: MESSAGES.PROJECTS.KEY_INVALID })
  .trim()
  .toUpperCase()
  .regex(PROJECT_KEY_REGEX, MESSAGES.PROJECTS.KEY_INVALID);

const projectDescriptionSchema = z
  .string({ error: MESSAGES.VALIDATION.INVALID_INPUT })
  .trim()
  .max(1000, MESSAGES.PROJECTS.DESCRIPTION_TOO_LONG);

export const createProjectSchema = z
  .object({
    teamId: objectIdSchema,
    name: projectNameSchema,
    key: projectKeySchema,
    description: projectDescriptionSchema.optional(),
  })
  .strict();

export const updateProjectSchema = z
  .object({
    name: projectNameSchema.optional(),
    key: projectKeySchema.optional(),
    description: projectDescriptionSchema.optional(),
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    { message: MESSAGES.VALIDATION.EMPTY_UPDATE_BODY },
  );

export const listProjectsQuerySchema = z
  .object({
    teamId: objectIdSchema.optional(),
  })
  .strict();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
