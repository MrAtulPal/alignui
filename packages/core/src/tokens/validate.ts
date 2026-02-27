import type { TokenMap, TokenValue } from "../domain/types.js";
import { isNumber, isRecord, isString, pushError, type ValidationError, type ValidationResult } from "../utils/validation.js";
import { isValidTokenKey } from "./path.js";

function validateTokenValue(input: unknown, path: string, errors: ValidationError[]): TokenValue | null {
  if (!isRecord(input)) {
    pushError(errors, path, "Expected object");
    return null;
  }

  const kind = input.kind;
  if (!isString(kind)) {
    pushError(errors, `${path}.kind`, "Expected string");
    return null;
  }

  if (kind === "color") {
    if (!isRecord(input.rgba)) {
      pushError(errors, `${path}.rgba`, "Expected object");
      return null;
    }
    const r = input.rgba.r;
    const g = input.rgba.g;
    const b = input.rgba.b;
    const a = input.rgba.a;
    if (!isNumber(r)) pushError(errors, `${path}.rgba.r`, "Expected number");
    if (!isNumber(g)) pushError(errors, `${path}.rgba.g`, "Expected number");
    if (!isNumber(b)) pushError(errors, `${path}.rgba.b`, "Expected number");
    if (!isNumber(a)) pushError(errors, `${path}.rgba.a`, "Expected number");
    if (errors.length > 0) return null;
    return { kind: "color", rgba: { r: r as number, g: g as number, b: b as number, a: a as number } };
  }

  if (kind === "number") {
    if (!isNumber(input.value)) pushError(errors, `${path}.value`, "Expected number");
    if (input.unit !== "px" && input.unit !== "ratio") pushError(errors, `${path}.unit`, "Expected 'px' or 'ratio'");
    if (errors.length > 0) return null;
    return { kind: "number", value: input.value as number, unit: input.unit as "px" | "ratio" };
  }

  if (kind === "string") {
    if (!isString(input.value)) pushError(errors, `${path}.value`, "Expected string");
    if (errors.length > 0) return null;
    return { kind: "string", value: input.value as string };
  }

  if (kind === "ref") {
    if (!isString(input.token)) pushError(errors, `${path}.token`, "Expected string");
    if (errors.length > 0) return null;
    return { kind: "ref", token: input.token as string };
  }

  pushError(errors, `${path}.kind`, `Unsupported kind: ${kind}`);
  return null;
}

export function validateTokenMap(input: unknown): ValidationResult<TokenMap> {
  const errors: ValidationError[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: [{ path: "$", message: "Expected object" }] };
  }

  const out: TokenMap = {};
  for (const [key, value] of Object.entries(input)) {
    const p = `$.${key}`;
    if (!isValidTokenKey(key)) pushError(errors, p, `Invalid token key: ${key}`);
    const tv = validateTokenValue(value, p, errors);
    if (tv) out[key] = tv;
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: out };
}

