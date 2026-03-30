import { z } from "zod";

export const validateInputsSchema = z.object({
  config: z.unknown(),
  tokens: z.unknown().optional(),
  snapshots: z.unknown().optional(),
  urlOverride: z.string().optional()
});

export const scanComplianceSchema = z.object({
  config: z.unknown(),
  tokens: z.unknown(),
  snapshots: z.unknown(),
  urlOverride: z.string().optional()
});
