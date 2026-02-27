export type ValidationError = { path: string; message: string };
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: ValidationError[] };

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function isString(v: unknown): v is string {
  return typeof v === "string";
}

export function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}

export function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function pushError(errors: ValidationError[], path: string, message: string) {
  errors.push({ path, message });
}

