import type { Rule, ScanConfig, Thresholds } from "../domain/types.js";
import { isBoolean, isNumber, isRecord, isString, pushError, type ValidationError, type ValidationResult } from "../utils/validation.js";

function validateThresholds(input: unknown, path: string, errors: ValidationError[]): Thresholds | null {
  if (input === undefined) return {};
  if (!isRecord(input)) {
    pushError(errors, path, "Expected object");
    return null;
  }

  const out: Thresholds = {};
  if ("minScore" in input) {
    if (!isNumber(input.minScore)) pushError(errors, `${path}.minScore`, "Expected number");
    else out.minScore = input.minScore;
  }
  if ("failOnSeverity" in input) {
    if (input.failOnSeverity !== "error" && input.failOnSeverity !== "warn") {
      pushError(errors, `${path}.failOnSeverity`, "Expected 'error' or 'warn'");
    } else out.failOnSeverity = input.failOnSeverity;
  }
  if ("failOnUnmatchedSelectors" in input) {
    if (!isBoolean(input.failOnUnmatchedSelectors)) pushError(errors, `${path}.failOnUnmatchedSelectors`, "Expected boolean");
    else out.failOnUnmatchedSelectors = input.failOnUnmatchedSelectors;
  }
  if ("failOnMissingTokens" in input) {
    if (!isBoolean(input.failOnMissingTokens)) pushError(errors, `${path}.failOnMissingTokens`, "Expected boolean");
    else out.failOnMissingTokens = input.failOnMissingTokens;
  }
  if ("failOnMissingDesign" in input) {
    if (!isBoolean(input.failOnMissingDesign)) pushError(errors, `${path}.failOnMissingDesign`, "Expected boolean");
    else out.failOnMissingDesign = input.failOnMissingDesign;
  }
  if ("failOnMissingComputed" in input) {
    if (!isBoolean(input.failOnMissingComputed)) pushError(errors, `${path}.failOnMissingComputed`, "Expected boolean");
    else out.failOnMissingComputed = input.failOnMissingComputed;
  }

  return out;
}

function validateRuleDesign(input: unknown, path: string, errors: ValidationError[]): Rule["design"] | null {
  if (input === undefined) return undefined;
  if (!isRecord(input)) {
    pushError(errors, path, "Expected object");
    return null;
  }

  if (!Array.isArray(input.figmaPath)) pushError(errors, `${path}.figmaPath`, "Expected array of strings");
  if (Array.isArray(input.figmaPath)) {
    input.figmaPath.forEach((seg, i) => {
      if (!isString(seg)) pushError(errors, `${path}.figmaPath[${i}]`, "Expected string");
    });
  }
  if ("figmaType" in input && input.figmaType !== undefined && !isString(input.figmaType)) {
    pushError(errors, `${path}.figmaType`, "Expected string");
  }
  if ("figmaNth" in input && input.figmaNth !== undefined && !isNumber(input.figmaNth)) {
    pushError(errors, `${path}.figmaNth`, "Expected number");
  }

  if (!Array.isArray(input.figmaPath)) return null;
  const figmaPath = (input.figmaPath as unknown[]).filter(isString) as string[];
  return {
    figmaPath,
    figmaType: isString(input.figmaType) ? input.figmaType : undefined,
    figmaNth: isNumber(input.figmaNth) ? input.figmaNth : undefined
  };
}

function validateRule(input: unknown, path: string, errors: ValidationError[]): Rule | null {
  if (!isRecord(input)) {
    pushError(errors, path, "Expected object");
    return null;
  }

  if (!isString(input.id)) pushError(errors, `${path}.id`, "Expected string");
  if (!isString(input.selector)) pushError(errors, `${path}.selector`, "Expected string");
  if (!isRecord(input.properties)) pushError(errors, `${path}.properties`, "Expected object");

  const design = validateRuleDesign(input.design, `${path}.design`, errors);

  const properties: Rule["properties"] = {};
  if (isRecord(input.properties)) {
    for (const [propName, propSpec] of Object.entries(input.properties)) {
      const propPath = `${path}.properties.${propName}`;
      if (!isRecord(propSpec)) {
        pushError(errors, propPath, "Expected object");
        continue;
      }

      const hasToken = "token" in propSpec;
      const hasDesign = "design" in propSpec;
      if (!hasToken && !hasDesign) {
        pushError(errors, propPath, "Expected either { token: string } or { design: true }");
        continue;
      }
      if (hasToken && !isString((propSpec as Record<string, unknown>).token)) pushError(errors, `${propPath}.token`, "Expected string");
      if (hasDesign && (propSpec as Record<string, unknown>).design !== true) pushError(errors, `${propPath}.design`, "Expected true");

      const severity = propSpec.severity;
      if (severity !== undefined && severity !== "error" && severity !== "warn") {
        pushError(errors, `${propPath}.severity`, "Expected 'error' or 'warn'");
      }
      const tolerance = propSpec.tolerance;
      if (tolerance !== undefined) {
        if (!isRecord(tolerance)) {
          pushError(errors, `${propPath}.tolerance`, "Expected object");
        } else {
          const kind = tolerance.kind;
          const value = tolerance.value;
          if (kind !== "px" && kind !== "rgba" && kind !== "ratio") pushError(errors, `${propPath}.tolerance.kind`, "Expected 'px', 'rgba', or 'ratio'");
          if (!isNumber(value)) pushError(errors, `${propPath}.tolerance.value`, "Expected number");
        }
      }

      const typedTolerance =
        isRecord(tolerance) &&
        (tolerance.kind === "px" || tolerance.kind === "rgba" || tolerance.kind === "ratio") &&
        isNumber(tolerance.value)
          ? tolerance.kind === "px"
            ? ({ kind: "px", value: tolerance.value } as const)
            : tolerance.kind === "rgba"
              ? ({ kind: "rgba", value: tolerance.value } as const)
              : ({ kind: "ratio", value: tolerance.value } as const)
          : undefined;

      if (isString((propSpec as Record<string, unknown>).token)) {
        properties[propName] = {
          token: (propSpec as Record<string, unknown>).token as string,
          severity: severity === "warn" ? "warn" : "error",
          tolerance: typedTolerance
        };
      } else if ((propSpec as Record<string, unknown>).design === true) {
        properties[propName] = {
          design: true,
          severity: severity === "warn" ? "warn" : "error",
          tolerance: typedTolerance
        };
      }
    }
  }

  if (!isString(input.id) || !isString(input.selector) || !isRecord(input.properties)) return null;
  return { id: input.id, selector: input.selector, properties, design: design ?? undefined };
}

export function validateScanConfig(input: unknown): ValidationResult<ScanConfig> {
  const errors: ValidationError[] = [];

  if (!isRecord(input)) {
    return { ok: false, errors: [{ path: "$", message: "Expected object" }] };
  }

  if (!isString(input.url)) pushError(errors, "$.url", "Expected string");

  if (!Array.isArray(input.rules)) pushError(errors, "$.rules", "Expected array");
  const rules: Rule[] = [];
  if (Array.isArray(input.rules)) {
    input.rules.forEach((r, i) => {
      const rule = validateRule(r, `$.rules[${i}]`, errors);
      if (rule) rules.push(rule);
    });
  }

  const thresholds = validateThresholds(input.thresholds, "$.thresholds", errors);

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { url: input.url as string, rules, thresholds: thresholds ?? undefined } };
}
