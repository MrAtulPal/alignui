import type { PluginNode } from "./plugin.js";

export type ResolveByPathOptions = {
  type?: string;
  nth?: number; // 0-based index if multiple matches remain
};

export type ResolveByPathResult = { ok: true; node: PluginNode } | { ok: false; error: string };

function matchesType(n: PluginNode, type?: string): boolean {
  if (!type) return true;
  return (n.type ?? "") === type;
}

export function resolveNodeByPath(
  roots: PluginNode[],
  path: string[],
  opts?: ResolveByPathOptions
): ResolveByPathResult {
  if (!Array.isArray(path) || path.length === 0) return { ok: false, error: "Empty figmaPath" };

  const first = path[0]!;
  const rootMatches = roots.filter((r) => r && r.name === first);
  if (rootMatches.length === 0) {
    return { ok: false, error: `Root segment not found: "${first}"` };
  }

  let current: PluginNode;
  if (rootMatches.length === 1) {
    current = rootMatches[0]!;
  } else if (path.length === 1) {
    const filtered: PluginNode[] = rootMatches.filter((r) => matchesType(r, opts?.type));
    if (filtered.length === 0) return { ok: false, error: `No root matches figmaType="${opts?.type}" for "${first}"` };
    if (filtered.length > 1) {
      const nth = opts?.nth ?? 0;
      if (nth < 0 || nth >= filtered.length) return { ok: false, error: `Ambiguous root "${first}" (${filtered.length} matches), need figmaNth` };
      current = filtered[nth]!;
    } else {
      current = filtered[0]!;
    }
  } else {
    return { ok: false, error: `Ambiguous root "${first}" (${rootMatches.length} matches), extend figmaPath to disambiguate` };
  }

  for (let i = 1; i < path.length; i++) {
    const seg = path[i]!;
    const children: PluginNode[] = (current.children ?? []).filter((c): c is PluginNode => !!c);
    const isTarget = i === path.length - 1;
    const matches: PluginNode[] = children.filter((c: PluginNode) => c.name === seg && (isTarget ? matchesType(c, opts?.type) : true));
    if (matches.length === 0) return { ok: false, error: `Segment not found: "${seg}" (at index ${i})` };
    if (matches.length > 1) {
      if (!isTarget) {
        return { ok: false, error: `Ambiguous segment "${seg}" (${matches.length} matches), extend figmaPath to disambiguate` };
      }
      const nth = opts?.nth ?? 0;
      if (nth < 0 || nth >= matches.length) return { ok: false, error: `Ambiguous target "${seg}" (${matches.length} matches), need figmaNth` };
      current = matches[nth]!;
    } else {
      current = matches[0]!;
    }
  }

  return { ok: true, node: current };
}

export type ListPathsOptions = {
  contains?: string;
  type?: string;
  max?: number;
};

export function listPaths(roots: PluginNode[], opts?: ListPathsOptions): string[][] {
  const contains = (opts?.contains ?? "").toLowerCase();
  const type = opts?.type;
  const max = typeof opts?.max === "number" && Number.isFinite(opts.max) ? Math.max(0, opts.max) : 200;

  const out: string[][] = [];

  function walk(n: PluginNode | null, path: string[]) {
    if (!n) return;
    if (out.length >= max) return;
    const next = [...path, n.name];

    const okContains = !contains || n.name.toLowerCase().includes(contains);
    const okType = !type || (n.type ?? "") === type;
    if (okContains && okType) out.push(next);

    const kids = (n.children ?? []).filter((c): c is PluginNode => !!c);
    for (const c of kids) walk(c, next);
  }

  for (const r of roots) walk(r, []);
  return out;
}
