import { z } from 'zod';
import { MESSAGES } from '../../utils/constants';

const emailSchema = z
  .string({ error: MESSAGES.AUTH.EMAIL_INVALID })
  .trim()
  .toLowerCase()
  .max(254, MESSAGES.AUTH.EMAIL_INVALID)
  .pipe(z.email(MESSAGES.AUTH.EMAIL_INVALID));

export const registerSchema = z
  .object({
    email: emailSchema,
    password: z
      .string({ error: MESSAGES.AUTH.PASSWORD_REQUIRED })
      .min(8, MESSAGES.AUTH.PASSWORD_TOO_SHORT)
      .max(128, MESSAGES.AUTH.PASSWORD_TOO_LONG),
    firstName: z
      .string({ error: MESSAGES.AUTH.FIRST_NAME_INVALID })
      .trim()
      .min(1, MESSAGES.AUTH.FIRST_NAME_INVALID)
      .max(60, MESSAGES.AUTH.FIRST_NAME_INVALID)
      .optional(),
    lastName: z
      .string({ error: MESSAGES.AUTH.LAST_NAME_INVALID })
      .trim()
      .min(1, MESSAGES.AUTH.LAST_NAME_INVALID)
      .max(60, MESSAGES.AUTH.LAST_NAME_INVALID)
      .optional(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z
      .string({ error: MESSAGES.AUTH.PASSWORD_REQUIRED })
      .min(1, MESSAGES.AUTH.PASSWORD_REQUIRED)
      .max(128, MESSAGES.AUTH.PASSWORD_TOO_LONG),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

