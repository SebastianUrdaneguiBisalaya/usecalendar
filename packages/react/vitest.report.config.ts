import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// `pnpm run bench:report`: runs bench/report.run.tsx once, sequentially, and writes benchmarks/results at the repo
// root. Separate from the test config so `pnpm run test` never runs it.
export default defineConfig({
  resolve: {
    alias: {
      "@usecalendar/core": fileURLToPath(
        new URL("../core/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "jsdom",
    fileParallelism: false,
    include: [
      "bench/report.run.tsx",
    ],
    setupFiles: [
      "./bench/setup-report.ts",
    ],
    testTimeout: 15 * 60 * 1000,
  },
});
