/** Valide les équipes, les invitations de membres et les changements de rôle. */
import { z } from 'zod';
import { objectIdSchema } from '../../middlewares/validate.middleware';
import { MESSAGES } from '../../utils/constants';
import { TEAM_ROLES } from './team-membership.model';

const teamNameSchema = z
  .string({ error: MESSAGES.TEAMS.NAME_REQUIRED })
  .trim()
  .min(1, MESSAGES.TEAMS.NAME_REQUIRED)
  .max(100, MESSAGES.TEAMS.NAME_TOO_LONG);

const teamDescriptionSchema = z
  .string({ error: MESSAGES.VALIDATION.INVALID_INPUT })
  .trim()
  .max(500, MESSAGES.TEAMS.DESCRIPTION_TOO_LONG);

const teamRoleSchema = z.enum(TEAM_ROLES, {
  error: MESSAGES.TEAMS.ROLE_INVALID,
});

const memberEmailSchema = z
  .string({ error: MESSAGES.AUTH.EMAIL_INVALID })
  .trim()
  .toLowerCase()
  .max(254, MESSAGES.AUTH.EMAIL_INVALID)
  .pipe(z.email(MESSAGES.AUTH.EMAIL_INVALID));

export const createTeamSchema = z
  .object({
    name: teamNameSchema,
    description: teamDescriptionSchema.optional(),
  })
  .strict();

export const updateTeamSchema = z
  .object({
    name: teamNameSchema.optional(),
    description: teamDescriptionSchema.optional(),
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    { message: MESSAGES.VALIDATION.EMPTY_UPDATE_BODY },
  );

export const addTeamMemberSchema = z
  .object({
    userId: objectIdSchema.optional(),
    email: memberEmailSchema.optional(),
    role: teamRoleSchema,
  })
  .strict()
  .refine(
    (data) => {
      const hasUserId = data.userId !== undefined;
      const hasEmail = data.email !== undefined;
      return (hasUserId && !hasEmail) || (!hasUserId && hasEmail);
    },
    { message: MESSAGES.TEAMS.MEMBER_IDENTIFIER_REQUIRED },
  );

export const updateTeamMemberRoleSchema = z
  .object({
    role: teamRoleSchema,
  })
  .strict();

export const teamMemberParamsSchema = z
  .object({
    id: objectIdSchema,
    userId: objectIdSchema,
  })
  .strict();

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>;
export type UpdateTeamMemberRoleInput = z.infer<
  typeof updateTeamMemberRoleSchema
>;
