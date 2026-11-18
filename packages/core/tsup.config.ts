import { defineConfig } from "tsup";

export default defineConfig({
  bundle: true,

  clean: true,

  dts: {
    // tsup injects `baseUrl` into the declaration build, which TypeScript 6 flags as deprecated.
    compilerOptions: {
      ignoreDeprecations: "6.0",
    },
    resolve: true,
  },
  entry: {
    index: "src/index.ts",
  },

  format: [
    "esm",
    "cjs",
  ],

  minify: false,

  outDir: "dist",

  outExtension({ format }) {
    return {
      js: format === "esm" ? ".mjs" : ".cjs",
    };
  },

  platform: "neutral",

  skipNodeModulesBundle: true,

  sourcemap: true,

  splitting: false,

  target: "es2022",

  treeshake: true,
});
