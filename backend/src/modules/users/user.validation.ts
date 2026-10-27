import { z } from 'zod';
import { MESSAGES } from '../../utils/constants';

const MAX_HTTP_AVATAR_URL_LENGTH = 2048;
const MAX_DATA_AVATAR_URL_LENGTH = 150_000;

// Restricts inline Data URLs to safe raster formats (blocks SVG script execution)
const SAFE_DATA_IMAGE_REGEX =
  /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/;

function isValidHttpAvatarUrl(value: string): boolean {
  if (value.length > MAX_HTTP_AVATAR_URL_LENGTH) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

const avatarUrlSchema = z
  .union([z.string({ error: MESSAGES.USERS.AVATAR_INVALID }), z.null()], {
    error: MESSAGES.USERS.AVATAR_INVALID,
  })
  .transform((value) => {
    if (value === null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  })
  .superRefine((value, ctx) => {
    if (value === null) {
      return;
    }

    if (value.startsWith('data:')) {
      if (value.length > MAX_DATA_AVATAR_URL_LENGTH) {
        ctx.addIssue({
          code: 'custom',
          message: MESSAGES.USERS.AVATAR_TOO_LARGE,
        });
        return;
      }

      if (!SAFE_DATA_IMAGE_REGEX.test(value)) {
        ctx.addIssue({
          code: 'custom',
          message: MESSAGES.USERS.AVATAR_INVALID,
        });
      }
      return;
    }

    if (!isValidHttpAvatarUrl(value)) {
      ctx.addIssue({
        code: 'custom',
        message: MESSAGES.USERS.AVATAR_INVALID,
      });
    }
  });

export const updateProfileSchema = z
  .object({
    firstName: z
      .string({ error: MESSAGES.AUTH.FIRST_NAME_INVALID })
      .trim()
      .max(60, MESSAGES.USERS.FIRST_NAME_TOO_LONG)
      .optional(),
    lastName: z
      .string({ error: MESSAGES.AUTH.LAST_NAME_INVALID })
      .trim()
      .max(60, MESSAGES.USERS.LAST_NAME_TOO_LONG)
      .optional(),
    avatarUrl: avatarUrlSchema.optional(),
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    { message: MESSAGES.VALIDATION.EMPTY_UPDATE_BODY },
  );

export const updatePasswordSchema = z
  .object({
    currentPassword: z
      .string({ error: MESSAGES.AUTH.PASSWORD_REQUIRED })
      .min(1, MESSAGES.AUTH.PASSWORD_REQUIRED)
      .max(128, MESSAGES.AUTH.PASSWORD_TOO_LONG),
    newPassword: z
      .string({ error: MESSAGES.AUTH.PASSWORD_REQUIRED })
      .min(8, MESSAGES.AUTH.PASSWORD_TOO_SHORT)
      .max(128, MESSAGES.AUTH.PASSWORD_TOO_LONG),
    confirmPassword: z
      .string({ error: MESSAGES.AUTH.PASSWORD_REQUIRED })
      .min(1, MESSAGES.AUTH.PASSWORD_REQUIRED)
      .max(128, MESSAGES.AUTH.PASSWORD_TOO_LONG)
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.confirmPassword !== undefined &&
      data.confirmPassword !== data.newPassword
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: MESSAGES.USERS.PASSWORD_CONFIRM_MISMATCH,
      });
    }

    if (data.newPassword === data.currentPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['newPassword'],
        message: MESSAGES.USERS.PASSWORD_SAME_AS_OLD,
      });
    }
  });

export const searchUsersQuerySchema = z
  .object({
    search: z
      .string({ error: MESSAGES.VALIDATION.INVALID_INPUT })
      .trim()
      .max(100, MESSAGES.VALIDATION.INVALID_INPUT)
      .optional(),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type SearchUsersQuery = z.infer<typeof searchUsersQuerySchema>;

