import { access, readFile } from "node:fs/promises";
import path from "node:path";

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function findUp(startDir: string, relPath: string, maxDepth = 25): Promise<string | undefined> {
  let dir = path.resolve(startDir);
  for (let i = 0; i < maxDepth; i++) {
    const candidate = path.join(dir, relPath);
    if (await exists(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

function extractWoff2UrlsFromCss(css: string): string[] {
  const urls = new Set<string>();
  const re = /https:\/\/fonts\.gstatic\.com\/[^\s)]+\.woff2/g;
  for (const m of css.matchAll(re)) urls.add(m[0]);
  return [...urls];
}

function minifyCssForEmbedding(css: string): string {
  // Keep content identical from a CSS semantics perspective, just remove comments/extra whitespace.
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function resolveFontsAddressPath(): Promise<string> {
  const argv1Dir = process.argv[1] ? path.dirname(path.resolve(process.argv[1])) : undefined;
  const startDirs = [process.cwd(), argv1Dir].filter(Boolean) as string[];

  for (const start of startDirs) {
    const p = await findUp(start, path.join("packages", "cli", "assets", "fonts-address.txt"));
    if (p) return p;
    const p2 = await findUp(start, path.join("assets", "fonts-address.txt"));
    if (p2) return p2;
    const p3 = await findUp(start, path.join("public", "assets", "fonts-address.txt"));
    if (p3) return p3;
  }

  // As a last resort, try CWD-relative paths.
  const direct = [
    path.resolve("packages/cli/assets/fonts-address.txt"),
    path.resolve("assets/fonts-address.txt"),
    path.resolve("public/assets/fonts-address.txt")
  ];
  for (const p of direct) if (await exists(p)) return p;

  throw new Error(
    "Missing fonts-address.txt. Expected at packages/cli/assets/fonts-address.txt (repo mode) or assets/fonts-address.txt (packaged mode)."
  );
}

async function resolveFontsDir(fontsAddressPath: string): Promise<string> {
  // Typical repo layout: packages/cli/assets/fonts-address.txt -> packages/cli/assets/fonts/
  const sibling = path.join(path.dirname(fontsAddressPath), "fonts");
  if (await exists(sibling)) return sibling;

  // Packaged layout might be: <pkgRoot>/assets/fonts-address.txt -> <pkgRoot>/assets/fonts/
  const sibling2 = path.join(path.dirname(fontsAddressPath), "fonts");
  if (await exists(sibling2)) return sibling2;

  throw new Error(`Missing fonts directory next to ${fontsAddressPath} (expected ./fonts).`);
}

export async function buildInlinedFontFaceCss(): Promise<string> {
  const fontsAddressPath = await resolveFontsAddressPath();
  const fontsDir = await resolveFontsDir(fontsAddressPath);

  const raw = await readFile(fontsAddressPath, "utf8");
  const urls = extractWoff2UrlsFromCss(raw);
  if (urls.length === 0) return "";

  const urlToData = new Map<string, string>();
  const missing: string[] = [];

  for (const url of urls) {
    const base = url.split("/").pop() || "";
    const fontPath = path.join(fontsDir, base);
    if (!(await exists(fontPath))) {
      missing.push(base);
      continue;
    }
    const buf = await readFile(fontPath);
    urlToData.set(url, `data:font/woff2;base64,${buf.toString("base64")}`);
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing ${missing.length} font file(s) referenced by fonts-address.txt in ${fontsDir}:\n- ${missing.join("\n- ")}`
    );
  }

  const replaced = raw.replace(/url\((['"]?)(https:\/\/fonts\.gstatic\.com\/[^)]+?\.woff2)\1\)/g, (_m, _q, u) => {
    const data = urlToData.get(String(u));
    return data ? `url("${data}")` : _m;
  });

  return minifyCssForEmbedding(replaced);
}

