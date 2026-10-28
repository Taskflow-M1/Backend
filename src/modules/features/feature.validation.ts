/** Valide les champs et les filtres utilisés par les fonctionnalités. */
import { z } from 'zod';
import { objectIdSchema } from '../../middlewares/validate.middleware';
import { MESSAGES } from '../../utils/constants';

const featureTitleSchema = z
  .string({ error: MESSAGES.FEATURES.TITLE_REQUIRED })
  .trim()
  .min(1, MESSAGES.FEATURES.TITLE_REQUIRED)
  .max(120, MESSAGES.FEATURES.TITLE_TOO_LONG);

const featureDescriptionSchema = z
  .string({ error: MESSAGES.VALIDATION.INVALID_INPUT })
  .trim()
  .max(1000, MESSAGES.FEATURES.DESCRIPTION_TOO_LONG);

export const createFeatureSchema = z
  .object({
    projectId: objectIdSchema,
    title: featureTitleSchema,
    description: featureDescriptionSchema.optional(),
  })
  .strict();

export const updateFeatureSchema = z
  .object({
    title: featureTitleSchema.optional(),
    description: featureDescriptionSchema.optional(),
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    { message: MESSAGES.VALIDATION.EMPTY_UPDATE_BODY },
  );

export const listFeaturesQuerySchema = z
  .object({
    projectId: objectIdSchema.optional(),
  })
  .strict();

export type CreateFeatureInput = z.infer<typeof createFeatureSchema>;
export type UpdateFeatureInput = z.infer<typeof updateFeatureSchema>;
export type ListFeaturesQuery = z.infer<typeof listFeaturesQuerySchema>;
