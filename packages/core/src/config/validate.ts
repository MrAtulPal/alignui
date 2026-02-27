import type { Rule, ScanConfig, Thresholds } from "../domain/types.js";

export type ValidationError = { path: string; message: string };
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: ValidationError[] };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function push(errors: ValidationError[], path: string, message: string) {
  errors.push({ path, message });
}

function validateThresholds(input: unknown, path: string, errors: ValidationError[]): Thresholds | null {
  if (input === undefined) return {};
  if (!isRecord(input)) {
    push(errors, path, "Expected object");
    return null;
  }

  const out: Thresholds = {};
  if ("minScore" in input) {
    if (!isNumber(input.minScore)) push(errors, `${path}.minScore`, "Expected number");
    else out.minScore = input.minScore;
  }
  if ("failOnSeverity" in input) {
    if (input.failOnSeverity !== "error" && input.failOnSeverity !== "warn") {
      push(errors, `${path}.failOnSeverity`, "Expected 'error' or 'warn'");
    } else out.failOnSeverity = input.failOnSeverity;
  }
  if ("failOnUnmatchedSelectors" in input) {
    if (!isBoolean(input.failOnUnmatchedSelectors)) push(errors, `${path}.failOnUnmatchedSelectors`, "Expected boolean");
    else out.failOnUnmatchedSelectors = input.failOnUnmatchedSelectors;
  }
  if ("failOnMissingTokens" in input) {
    if (!isBoolean(input.failOnMissingTokens)) push(errors, `${path}.failOnMissingTokens`, "Expected boolean");
    else out.failOnMissingTokens = input.failOnMissingTokens;
  }
  if ("failOnMissingComputed" in input) {
    if (!isBoolean(input.failOnMissingComputed)) push(errors, `${path}.failOnMissingComputed`, "Expected boolean");
    else out.failOnMissingComputed = input.failOnMissingComputed;
  }

  return out;
}

function validateRule(input: unknown, path: string, errors: ValidationError[]): Rule | null {
  if (!isRecord(input)) {
    push(errors, path, "Expected object");
    return null;
  }

  if (!isString(input.id)) push(errors, `${path}.id`, "Expected string");
  if (!isString(input.selector)) push(errors, `${path}.selector`, "Expected string");
  if (!isRecord(input.properties)) push(errors, `${path}.properties`, "Expected object");

  const properties: Rule["properties"] = {};
  if (isRecord(input.properties)) {
    for (const [propName, propSpec] of Object.entries(input.properties)) {
      const propPath = `${path}.properties.${propName}`;
      if (!isRecord(propSpec)) {
        push(errors, propPath, "Expected object");
        continue;
      }
      if (!isString(propSpec.token)) push(errors, `${propPath}.token`, "Expected string");
      const severity = propSpec.severity;
      if (severity !== undefined && severity !== "error" && severity !== "warn") {
        push(errors, `${propPath}.severity`, "Expected 'error' or 'warn'");
      }
      const tolerance = propSpec.tolerance;
      if (tolerance !== undefined) {
        if (!isRecord(tolerance)) {
          push(errors, `${propPath}.tolerance`, "Expected object");
        } else {
          const kind = tolerance.kind;
          const value = tolerance.value;
          if (kind !== "px" && kind !== "rgba") push(errors, `${propPath}.tolerance.kind`, "Expected 'px' or 'rgba'");
          if (!isNumber(value)) push(errors, `${propPath}.tolerance.value`, "Expected number");
        }
      }

      if (isString(propSpec.token)) {
        const typed: Rule["properties"][string] = {
          token: propSpec.token,
          severity: severity === "warn" ? "warn" : "error",
          tolerance:
            isRecord(tolerance) && (tolerance.kind === "px" || tolerance.kind === "rgba") && isNumber(tolerance.value)
              ? (tolerance.kind === "px"
                  ? { kind: "px", value: tolerance.value }
                  : { kind: "rgba", value: tolerance.value })
              : undefined
        };
        properties[propName] = typed;
      }
    }
  }

  if (!isString(input.id) || !isString(input.selector) || !isRecord(input.properties)) return null;
  return { id: input.id, selector: input.selector, properties };
}

export function validateScanConfig(input: unknown): ValidationResult<ScanConfig> {
  const errors: ValidationError[] = [];

  if (!isRecord(input)) {
    return { ok: false, errors: [{ path: "$", message: "Expected object" }] };
  }

  if (!isString(input.url)) push(errors, "$.url", "Expected string");

  if (!Array.isArray(input.rules)) push(errors, "$.rules", "Expected array");
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

