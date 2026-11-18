import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Test against core's source, like `tsconfig.json` does, so tests never run on a stale core build.
      "@usecalendar/core": fileURLToPath(
        new URL("../core/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    setupFiles: [
      "./tests/setup.ts",
    ],
  },
});
