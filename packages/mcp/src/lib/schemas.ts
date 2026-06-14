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

export const compareLiveUiToFigmaSchema = z.object({
  request: z.string(),
  liveUrl: z.string(),
  selector: z.string(),
  figmaFileOrUrl: z.string(),
  figmaNodeIdOrComponentName: z.string(),
  urlOverride: z.string().optional(),
  prerequisites: z
    .object({
      playwrightMcpConfigured: z.boolean().optional(),
      figmaMcpConfigured: z.boolean().optional(),
      figmaAuthenticated: z.boolean().optional()
    })
    .optional(),
  liveCapture: z
    .object({
      text: z.string().optional(),
      computed: z.record(z.string())
    })
    .optional(),
  figmaDesign: z
    .object({
      componentName: z.string().optional(),
      tokenNamespace: z.string().optional(),
      thresholds: z
        .object({
          minScore: z.number().optional(),
          failOnSeverity: z.enum(["error", "warn"]).optional(),
          failOnUnmatchedSelectors: z.boolean().optional(),
          failOnMissingTokens: z.boolean().optional(),
          failOnMissingComputed: z.boolean().optional()
        })
        .optional(),
      properties: z.record(
        z.object({
          expected: z.string(),
          tolerance: z
            .object({
              kind: z.enum(["px", "rgba", "ratio"]),
              value: z.number()
            })
            .optional(),
          severity: z.enum(["error", "warn"]).optional(),
          tokenKey: z.string().optional()
        })
      )
    })
    .optional()
});
