import type { TokenMap, TokenValue } from "../domain/types.js";

export type ResolveResult = {
  resolved: TokenMap;
  errors: string[];
};

export function resolveTokenMap(input: TokenMap): ResolveResult {
  const resolved: TokenMap = {};
  const errors: string[] = [];

  const state = new Map<string, "resolving" | "done">();

  function resolveKey(key: string, stack: string[]): TokenValue | null {
    const v = input[key];
    if (!v) return null;

    const st = state.get(key);
    if (st === "done") return resolved[key] ?? null;
    if (st === "resolving") {
      errors.push(`Token reference cycle: ${[...stack, key].join(" -> ")}`);
      return v;
    }

    state.set(key, "resolving");
    let out: TokenValue = v;

    if (v.kind === "ref") {
      const target = v.token;
      const next = resolveKey(target, [...stack, key]);
      if (!next) {
        errors.push(`Missing token reference: ${key} -> ${target}`);
        out = v;
      } else if (next.kind === "ref") {
        // If the referenced token is still unresolved, keep as ref.
        out = next;
      } else {
        out = next;
      }
    }

    resolved[key] = out;
    state.set(key, "done");
    return out;
  }

  for (const key of Object.keys(input)) resolveKey(key, []);
  return { resolved, errors };
}

