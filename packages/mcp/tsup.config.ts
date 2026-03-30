import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  bundle: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  shims: false,
  outDir: "dist",
  noExternal: [/^@designlatch\//],
  external: ["@modelcontextprotocol/sdk", "zod"]
});
