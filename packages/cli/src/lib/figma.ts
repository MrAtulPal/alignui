type FigmaApiError = { status?: number; err?: string; message?: string; error?: boolean };

async function figmaGetJson<T>(url: string, figmaToken: string): Promise<T> {
  const res = await fetch(url, { headers: { "X-Figma-Token": figmaToken } });
  const text = await res.text();
  let json: unknown;
  try {
    json = text.length ? (JSON.parse(text) as unknown) : null;
  } catch {
    throw new Error(`Figma API: invalid JSON response (HTTP ${res.status})`);
  }
  if (!res.ok) {
    const e = (json ?? {}) as FigmaApiError;
    const msg = e.message ?? e.err ?? `HTTP ${res.status}`;
    throw new Error(`Figma API error (HTTP ${res.status}): ${msg}`);
  }
  return json as T;
}

export type FigmaLocalVariablesResponse = {
  status: number;
  error: boolean;
  meta: {
    variables: Record<
      string,
      {
        id: string;
        name: string;
        key: string;
        variableCollectionId: string;
        resolvedType: "BOOLEAN" | "FLOAT" | "STRING" | "COLOR";
        valuesByMode: Record<string, unknown>;
        remote?: boolean;
      }
    >;
    variableCollections: Record<
      string,
      {
        id: string;
        name: string;
        key: string;
        modes: Array<{ modeId: string; name: string }>;
      }
    >;
  };
};

export async function getLocalVariables(fileKey: string, figmaToken: string): Promise<FigmaLocalVariablesResponse> {
  const url = `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}/variables/local`;
  return figmaGetJson<FigmaLocalVariablesResponse>(url, figmaToken);
}

