import type { ConfigDefaults, Rule, RuleDefaults, ScanConfig, Thresholds } from "../domain/types.js";
import { isBoolean, isNumber, isRecord, isString, pushError, type ValidationError, type ValidationResult } from "../utils/validation.js";

function validateDefaults(input: unknown, path: string, errors: ValidationError[]): ConfigDefaults | null {
  if (input === undefined) return {};
  if (!isRecord(input)) {
    pushError(errors, path, "Expected object");
    return null;
  }

  const out: ConfigDefaults = {};
  if ("severity" in input) {
    if (input.severity !== "error" && input.severity !== "warn") pushError(errors, `${path}.severity`, "Expected 'error' or 'warn'");
    else out.severity = input.severity;
  }
  if ("tolerance" in input) {
    if (!isRecord(input.tolerance)) {
      pushError(errors, `${path}.tolerance`, "Expected object");
    } else {
      const tol: Record<string, unknown> = input.tolerance as any;
      const t: ConfigDefaults["tolerance"] = {};
      if ("px" in tol) {
        if (!isNumber(tol.px)) pushError(errors, `${path}.tolerance.px`, "Expected number");
        else t.px = tol.px;
      }
      if ("rgba" in tol) {
        if (!isNumber(tol.rgba)) pushError(errors, `${path}.tolerance.rgba`, "Expected number");
        else t.rgba = tol.rgba;
      }
      if ("ratio" in tol) {
        if (!isNumber(tol.ratio)) pushError(errors, `${path}.tolerance.ratio`, "Expected number");
        else t.ratio = tol.ratio;
      }
      out.tolerance = t;
    }
  }

  return out;
}

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
  if ("failOnMissingComputed" in input) {
    if (!isBoolean(input.failOnMissingComputed)) pushError(errors, `${path}.failOnMissingComputed`, "Expected boolean");
    else out.failOnMissingComputed = input.failOnMissingComputed;
  }

  return out;
}

function validateRule(input: unknown, path: string, errors: ValidationError[]): Rule | null {
  if (!isRecord(input)) {
    pushError(errors, path, "Expected object");
    return null;
  }

  if (!isString(input.id)) pushError(errors, `${path}.id`, "Expected string");
  if (!isString(input.selector)) pushError(errors, `${path}.selector`, "Expected string");
  if (!isRecord(input.properties)) pushError(errors, `${path}.properties`, "Expected object");
  const defaults = validateDefaults((input as any).defaults, `${path}.defaults`, errors) as RuleDefaults | null;

  const properties: Rule["properties"] = {};
  if (isRecord(input.properties)) {
    for (const [propName, propSpec] of Object.entries(input.properties)) {
      const propPath = `${path}.properties.${propName}`;
      if (!isRecord(propSpec)) {
        pushError(errors, propPath, "Expected object");
        continue;
      }
      if (!isString(propSpec.token)) pushError(errors, `${propPath}.token`, "Expected string");
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

      if (isString(propSpec.token)) {
        const typed: Rule["properties"][string] = {
          token: propSpec.token,
          severity: severity === "warn" ? "warn" : "error",
          tolerance:
            isRecord(tolerance) &&
            (tolerance.kind === "px" || tolerance.kind === "rgba" || tolerance.kind === "ratio") &&
            isNumber(tolerance.value)
              ? tolerance.kind === "px"
                ? { kind: "px", value: tolerance.value }
                : tolerance.kind === "rgba"
                  ? { kind: "rgba", value: tolerance.value }
                  : { kind: "ratio", value: tolerance.value }
              : undefined
        };
        properties[propName] = typed;
      }
    }
  }

  if (!isString(input.id) || !isString(input.selector) || !isRecord(input.properties)) return null;
  return { id: input.id, selector: input.selector, properties, defaults: defaults ?? undefined };
}

export function validateScanConfig(input: unknown): ValidationResult<ScanConfig> {
  const errors: ValidationError[] = [];

  if (!isRecord(input)) {
    return { ok: false, errors: [{ path: "$", message: "Expected object" }] };
  }

  if (!isString(input.url)) pushError(errors, "$.url", "Expected string");

  const defaults = validateDefaults((input as any).defaults, "$.defaults", errors);

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
  return { ok: true, value: { url: input.url as string, rules, defaults: defaults ?? undefined, thresholds: thresholds ?? undefined } };
}
