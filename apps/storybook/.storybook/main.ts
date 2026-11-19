import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { mergeConfig } from "vite";

/** Absolute path of a file in the workspace packages, e.g. `react/src/index.ts`. */
const packageSource = (path: string): string =>
  fileURLToPath(new URL(`../../../packages/${path}`, import.meta.url));

const config: StorybookConfig = {
  // Manual review only: the a11y panel runs axe on demand. No test addons (see AGENTS.md).
  addons: [
    "@storybook/addon-a11y",
  ],
  core: {
    disableTelemetry: true,
  },
  framework: "@storybook/react-vite",
  stories: [
    "../src/**/*.stories.tsx",
  ],
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      plugins: [
        react(),
        tailwindcss(),
      ],
      resolve: {
        // Stories run against the packages' source, like vitest does: hot reload without a build, and never a
        // stale `dist`. `/mini` comes first so the bare `@usecalendar/react` pattern doesn't swallow it.
        alias: [
          {
            find: /^@usecalendar\/react\/mini$/,
            replacement: packageSource("react/src/mini/index.ts"),
          },
          {
            find: /^@usecalendar\/react$/,
            replacement: packageSource("react/src/index.ts"),
          },
          {
            find: /^@usecalendar\/core$/,
            replacement: packageSource("core/src/index.ts"),
          },
        ],
        dedupe: [
          "react",
          "react-dom",
        ],
      },
    }),
};

export default config;
