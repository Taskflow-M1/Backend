/** Valide les filtres optionnels du tableau de bord. */
import { z } from 'zod';
import { objectIdSchema } from '../../middlewares/validate.middleware';
import { MESSAGES } from '../../utils/constants';

export const dashboardQuerySchema = z
  .object({
    teamId: objectIdSchema.optional(),
    projectId: objectIdSchema.optional(),
  })
  .strict();

export const teamActivityQuerySchema = z
  .object({
    limit: z
      .string({ error: MESSAGES.DASHBOARD.LIMIT_INVALID })
      .trim()
      .regex(/^\d+$/, MESSAGES.DASHBOARD.LIMIT_INVALID)
      .transform(Number)
      .pipe(
        z
          .number()
          .int(MESSAGES.DASHBOARD.LIMIT_INVALID)
          .min(1, MESSAGES.DASHBOARD.LIMIT_INVALID)
          .max(50, MESSAGES.DASHBOARD.LIMIT_INVALID),
      )
      .optional(),
  })
  .strict();

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
export type TeamActivityQuery = z.infer<typeof teamActivityQuerySchema>;
