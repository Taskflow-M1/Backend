import { z } from 'zod';
import { MESSAGES } from '../../utils/constants';

export const commentContentSchema = z
  .string({ error: MESSAGES.COMMENTS.CONTENT_REQUIRED })
  .trim()
  .min(1, MESSAGES.COMMENTS.CONTENT_REQUIRED)
  .max(2000, MESSAGES.COMMENTS.CONTENT_TOO_LONG);

export const createCommentSchema = z
  .object({
    content: commentContentSchema,
  })
  .strict();

export const updateCommentSchema = z
  .object({
    content: commentContentSchema,
  })
  .strict();

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
