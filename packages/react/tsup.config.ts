import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { defineConfig } from "tsup";

const USE_CLIENT = '"use client";';

/**
 * CommonJS code splitting rewrites the split output, putting `"use strict"` and helper functions above the banner,
 * where `"use client"` is no longer a directive. Moves it back to the very top of every `.cjs` file.
 */
const hoistUseClient = async (directory: string): Promise<void> => {
  for (const entry of await readdir(directory, {
    recursive: true,
  })) {
    if (!entry.endsWith(".cjs")) continue;
    const file = join(directory, entry);
    const code = await readFile(file, "utf8");
    if (code.startsWith(USE_CLIENT)) continue;
    await writeFile(file, `${USE_CLIENT}\n${code.replace(USE_CLIENT, "")}`);
  }
};

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
  // `@usecalendar/react/mini` is its own entry, so apps can import the day strip without the grid views.
  entry: {
    index: "src/index.ts",
    "mini/index": "src/mini/index.ts",
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

  onSuccess: () => hoistUseClient("dist"),

  outDir: "dist",

  outExtension({ format }) {
    return {
      js: format === "esm" ? ".mjs" : ".cjs",
    };
  },

  platform: "neutral",

  skipNodeModulesBundle: true,

  sourcemap: true,

  // Code shared by both entries (the locale and keymap contexts, `cn`, `useToday`) lives in shared chunks instead of
  // being copied into each entry: a copied React context would make a provider from one entry invisible to the
  // other. tsup splits CommonJS output too when this is set explicitly.
  splitting: true,

  target: "es2022",

  // Rollup tree-shaking strips module-level directives such as "use client"; esbuild already drops unused code.
  treeshake: false,

  tsconfig: "tsconfig.build.json",
});
