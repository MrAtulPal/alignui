declare module "html-minifier-terser" {
  // Minimal shim: we only need the runtime `minify` API.
  export function minify(html: string, options?: unknown): Promise<string>;
}

