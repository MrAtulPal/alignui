import { isNumber, isRecord, isString, pushError, type ValidationError, type ValidationResult } from "../utils/validation.js";

export type PluginFill = {
  type?: string;
  name?: string;
  hex?: string;
};

export type PluginLineHeight = {
  unit?: string;
  value?: number;
};

export type PluginFontName = {
  family?: string;
  style?: string;
};

export type PluginNode = {
  name: string;
  type?: string;
  children?: Array<PluginNode | null>;
  fills?: PluginFill[];
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  cornerRadius?: number;
  fontSize?: number;
  fontName?: PluginFontName;
  lineHeight?: PluginLineHeight;
};

function validateFill(input: unknown, path: string, errors: ValidationError[]): PluginFill | null {
  if (!isRecord(input)) {
    pushError(errors, path, "Expected object");
    return null;
  }
  if ("type" in input && input.type !== undefined && !isString(input.type)) pushError(errors, `${path}.type`, "Expected string");
  if ("name" in input && input.name !== undefined && !isString(input.name)) pushError(errors, `${path}.name`, "Expected string");
  if ("hex" in input && input.hex !== undefined && !isString(input.hex)) pushError(errors, `${path}.hex`, "Expected string");
  return { type: isString(input.type) ? input.type : undefined, name: isString(input.name) ? input.name : undefined, hex: isString(input.hex) ? input.hex : undefined };
}

function validateNode(input: unknown, path: string, errors: ValidationError[]): PluginNode | null {
  if (!isRecord(input)) {
    pushError(errors, path, "Expected object");
    return null;
  }
  // Some plugin exports omit "name" (e.g. VECTOR nodes). We coerce to "" instead of failing the whole file.
  if ("type" in input && input.type !== undefined && !isString(input.type)) pushError(errors, `${path}.type`, "Expected string");

  if ("children" in input && input.children !== undefined && !Array.isArray(input.children)) {
    pushError(errors, `${path}.children`, "Expected array");
  }
  if ("fills" in input && input.fills !== undefined && !Array.isArray(input.fills)) {
    pushError(errors, `${path}.fills`, "Expected array");
  }

  const numFields: Array<keyof Pick<
    PluginNode,
    "paddingTop" | "paddingRight" | "paddingBottom" | "paddingLeft" | "cornerRadius" | "fontSize"
  >> = ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "cornerRadius", "fontSize"];
  for (const f of numFields) {
    if (f in input && (input as Record<string, unknown>)[f] !== undefined && !isNumber((input as Record<string, unknown>)[f])) {
      pushError(errors, `${path}.${f}`, "Expected number");
    }
  }

  if ("fontName" in input && input.fontName !== undefined) {
    if (!isRecord(input.fontName)) pushError(errors, `${path}.fontName`, "Expected object");
    else {
      if ("family" in input.fontName && input.fontName.family !== undefined && !isString(input.fontName.family)) {
        pushError(errors, `${path}.fontName.family`, "Expected string");
      }
      if ("style" in input.fontName && input.fontName.style !== undefined && !isString(input.fontName.style)) {
        pushError(errors, `${path}.fontName.style`, "Expected string");
      }
    }
  }

  if ("lineHeight" in input && input.lineHeight !== undefined) {
    if (!isRecord(input.lineHeight)) pushError(errors, `${path}.lineHeight`, "Expected object");
    else {
      if ("unit" in input.lineHeight && input.lineHeight.unit !== undefined && !isString(input.lineHeight.unit)) {
        pushError(errors, `${path}.lineHeight.unit`, "Expected string");
      }
      if ("value" in input.lineHeight && input.lineHeight.value !== undefined && !isNumber(input.lineHeight.value)) {
        pushError(errors, `${path}.lineHeight.value`, "Expected number");
      }
    }
  }

  const children: Array<PluginNode | null> | undefined = Array.isArray(input.children)
    ? (input.children as unknown[]).map((c, i) => {
        if (c === null) return null;
        return validateNode(c, `${path}.children[${i}]`, errors);
      })
    : undefined;

  const fills: PluginFill[] | undefined = Array.isArray(input.fills)
    ? (input.fills as unknown[]).map((f, i) => validateFill(f, `${path}.fills[${i}]`, errors)).filter((x): x is PluginFill => x !== null)
    : undefined;

  return {
    name: isString(input.name) ? input.name : "",
    type: isString(input.type) ? input.type : undefined,
    children,
    fills,
    paddingTop: isNumber((input as Record<string, unknown>).paddingTop) ? ((input as Record<string, unknown>).paddingTop as number) : undefined,
    paddingRight: isNumber((input as Record<string, unknown>).paddingRight) ? ((input as Record<string, unknown>).paddingRight as number) : undefined,
    paddingBottom: isNumber((input as Record<string, unknown>).paddingBottom) ? ((input as Record<string, unknown>).paddingBottom as number) : undefined,
    paddingLeft: isNumber((input as Record<string, unknown>).paddingLeft) ? ((input as Record<string, unknown>).paddingLeft as number) : undefined,
    cornerRadius: isNumber((input as Record<string, unknown>).cornerRadius) ? ((input as Record<string, unknown>).cornerRadius as number) : undefined,
    fontSize: isNumber((input as Record<string, unknown>).fontSize) ? ((input as Record<string, unknown>).fontSize as number) : undefined,
    fontName: isRecord(input.fontName)
      ? { family: isString(input.fontName.family) ? input.fontName.family : undefined, style: isString(input.fontName.style) ? input.fontName.style : undefined }
      : undefined,
    lineHeight: isRecord(input.lineHeight)
      ? { unit: isString(input.lineHeight.unit) ? input.lineHeight.unit : undefined, value: isNumber(input.lineHeight.value) ? input.lineHeight.value : undefined }
      : undefined
  };
}

export function parsePluginExport(input: unknown): ValidationResult<PluginNode[]> {
  const errors: ValidationError[] = [];
  if (!Array.isArray(input)) {
    return { ok: false, errors: [{ path: "$", message: "Expected array (plugin export root)" }] };
  }

  const roots: PluginNode[] = [];
  input.forEach((n, i) => {
    const node = validateNode(n, `$.${i}`, errors);
    if (node) roots.push(node);
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: roots };
}
