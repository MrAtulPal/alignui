import type { Rule, TokenMap, TokenValue } from "../domain/types.js";
import { isValidTokenKey } from "../tokens/path.js";

export type LintIssue = { path: string; message: string };
export type LintResult = { warnings: LintIssue[]; errors: LintIssue[] };

function push(list: LintIssue[], path: string, message: string) {
  list.push({ path, message });
}

function tokenKind(v: TokenValue | null): string {
  if (!v) return "missing";
  if (v.kind === "ref") return `ref(${v.token})`;
  if (v.kind === "number") return `number(${v.unit})`;
  return v.kind;
}

export function lintRules(rules: Rule[], tokens?: TokenMap): LintResult {
  const warnings: LintIssue[] = [];
  const errors: LintIssue[] = [];

  const seenRuleIds = new Set<string>();
  const seenSelectorProp = new Set<string>();

  rules.forEach((rule, i) => {
    const rulePath = `$.rules[${i}]`;

    if (seenRuleIds.has(rule.id)) push(errors, `${rulePath}.id`, `Duplicate rule id: ${rule.id}`);
    seenRuleIds.add(rule.id);

    const propKeys = Object.keys(rule.properties);
    if (propKeys.length === 0) push(warnings, `${rulePath}.properties`, "No properties defined");

    for (const prop of propKeys) {
      const spec = rule.properties[prop]!;
      const key = `${rule.selector}\n${prop}`;
      if (seenSelectorProp.has(key)) push(warnings, `${rulePath}.properties.${prop}`, "Duplicate selector+property mapping");
      seenSelectorProp.add(key);

      if (!isValidTokenKey(spec.token)) push(warnings, `${rulePath}.properties.${prop}.token`, `Suspicious token key: ${spec.token}`);

      if (tokens) {
        const tv = tokens[spec.token] ?? null;
        if (!tv) continue;

        // Simple mismatches that usually indicate config mistakes.
        if (spec.tolerance?.kind === "rgba" && tv.kind !== "color") {
          push(warnings, `${rulePath}.properties.${prop}.tolerance`, `rgba tolerance used with ${tokenKind(tv)} token`);
        }
        if (spec.tolerance?.kind === "px" && !(tv.kind === "number" && tv.unit === "px")) {
          push(warnings, `${rulePath}.properties.${prop}.tolerance`, `px tolerance used with ${tokenKind(tv)} token`);
        }
        if (spec.tolerance?.kind === "ratio" && !(tv.kind === "number" && tv.unit === "ratio")) {
          push(warnings, `${rulePath}.properties.${prop}.tolerance`, `ratio tolerance used with ${tokenKind(tv)} token`);
        }
      }
    }
  });

  return { warnings, errors };
}
