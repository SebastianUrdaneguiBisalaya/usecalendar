import { defineConfig } from "tsup";

export default defineConfig({
  // Keeps the directive at the top of both bundles so the components work in
  // React Server Components frameworks (e.g. the Next.js App Router).
  banner: {
    js: '"use client";',
  },

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

  // Never bundle core or React: they come from the consumer's node_modules.
  external: [
    "@usecalendar/core",
    "react",
    "react-dom",
  ],

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

  // Rollup tree-shaking strips module-level directives such as "use client"; esbuild already drops unused code.
  treeshake: false,

  tsconfig: "tsconfig.build.json",
});
