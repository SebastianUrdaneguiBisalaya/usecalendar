// Smoke check of the packed packages, as consumers install them: packs @usecalendar/core and @usecalendar/react,
// installs both tarballs in a throwaway project outside the repo, and checks ESM and CommonJS imports of every entry,
// that the entries share their React contexts, the "use client" directive, the stylesheets and the types.
//
// Run `pnpm run build` first. Usage: `pnpm run smoke:pack` (add `-- --keep` to keep the temporary project).

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const keep = process.argv.includes("--keep");
const work = mkdtempSync(join(tmpdir(), "usecalendar-smoke-"));
const packs = join(work, "packs");
const app = join(work, "app");

const run = (command, args, cwd) =>
  execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: [
      "ignore",
      "pipe",
      "inherit",
    ],
  });
const step = (message) => console.log(`\n▸ ${message}`);
const fail = (message) => {
  throw new Error(message);
};

try {
  for (const name of [
    "core",
    "react",
  ])
    if (!existsSync(join(root, "packages", name, "dist")))
      fail(`packages/${name}/dist is missing: run \`pnpm run build\` first.`);

  step("Packing @usecalendar/core and @usecalendar/react");
  for (const name of [
    "core",
    "react",
  ])
    run(
      "pnpm",
      [
        "--filter",
        `./packages/${name}`,
        "pack",
        "--pack-destination",
        packs,
      ],
      root,
    );
  const tarballs = readdirSync(packs).map((file) => join(packs, file));
  console.log(tarballs.map((file) => `  ${file}`).join("\n"));

  step("Installing the tarballs in a temporary project");
  const reactPackage = JSON.parse(
    readFileSync(join(root, "packages/react/package.json"), "utf8"),
  );
  const pin = (name) => `${name}@${reactPackage.devDependencies[name]}`;
  run("mkdir", [
    "-p",
    app,
  ]);
  writeFileSync(
    join(app, "package.json"),
    JSON.stringify({
      name: "usecalendar-smoke",
      private: true,
      type: "module",
    }),
  );
  run(
    "npm",
    [
      "install",
      "--no-audit",
      "--no-fund",
      "--loglevel=error",
      ...tarballs,
      pin("react"),
      pin("react-dom"),
      pin("@types/react"),
      pin("temporal-polyfill"),
      pin("typescript"),
    ],
    app,
  );

  step('Checking "use client" at the top of every React bundle');
  const reactDist = join(app, "node_modules/@usecalendar/react/dist");
  const bundles = readdirSync(reactDist, {
    recursive: true,
  }).filter((file) => /\.(mjs|cjs)$/.test(file));
  for (const file of bundles)
    if (
      !readFileSync(join(reactDist, file), "utf8").startsWith('"use client";')
    )
      fail(`${file} doesn't start with "use client"`);
  console.log(`  ${bundles.length} files`);

  step("Checking the stylesheets");
  const styles = readFileSync(join(reactDist, "styles.css"), "utf8");
  for (const utility of [
    "bg-uc-primary",
    "border-uc-primary",
    "bg-uc-muted",
  ])
    if (!styles.includes(utility))
      fail(`styles.css is missing the .${utility} utility`);
  if (!readFileSync(join(reactDist, "theme.css"), "utf8").includes("@source"))
    fail("theme.css doesn't register the components with @source");

  const render = `
const html = renderToStaticMarkup(
  h(CalendarLocaleProvider, { labels: { miniCalendar: "Shared" } },
    h(MiniCalendar, { value: Temporal.PlainDate.from("2026-11-19") })),
);
const days = (html.match(/role="option"/g) ?? []).length;
if (!html.includes('aria-label="Shared"')) throw new Error("the /mini entry doesn't see the main entry's context");
if (days !== 7) throw new Error(\`expected 7 days, got \${days}\`);
if (typeof Calendar !== "function" || typeof useMiniCalendar !== "function") throw new Error("missing exports");
if (stripDays(Temporal.PlainDate.from("2026-11-19"), 3).length !== 3) throw new Error("core is broken");
console.log("  ok");
`;
  writeFileSync(
    join(app, "check.mjs"),
    `import "temporal-polyfill/global";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { stripDays } from "@usecalendar/core";
import { Calendar, CalendarLocaleProvider } from "@usecalendar/react";
import { MiniCalendar, useMiniCalendar } from "@usecalendar/react/mini";
${render}`,
  );
  writeFileSync(
    join(app, "check.cjs"),
    `require("temporal-polyfill/global");
const { createElement: h } = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { stripDays } = require("@usecalendar/core");
const { Calendar, CalendarLocaleProvider } = require("@usecalendar/react");
const { MiniCalendar, useMiniCalendar } = require("@usecalendar/react/mini");
${render}`,
  );
  step("Importing every entry as ES modules");
  console.log(
    run(
      "node",
      [
        "check.mjs",
      ],
      app,
    ).trimEnd(),
  );
  step("Requiring every entry as CommonJS");
  console.log(
    run(
      "node",
      [
        "check.cjs",
      ],
      app,
    ).trimEnd(),
  );

  step("Type-checking every entry from ESM (.mts) and CommonJS (.cts)");
  const types = `import type { CalendarEvent, DateRange } from "@usecalendar/core";
import type { CalendarProps } from "@usecalendar/react";
import type { MiniCalendarProps, MiniCalendarState } from "@usecalendar/react/mini";
export const event: CalendarEvent<{ room: string }> = { id: "1", title: "Review", startAt: "2026-11-19T15:00:00Z", endAt: "2026-11-19T16:00:00Z", data: { room: "A" } };
export const props: CalendarProps<{ room: string }> = { events: [event], onRangeChange: (range: DateRange) => void range };
export const mini: MiniCalendarProps = { days: "auto", align: "center" };
// @ts-expect-error days is a number or "auto"
export const bad: MiniCalendarProps = { days: "many" };
export type State = MiniCalendarState;
`;
  writeFileSync(join(app, "types.mts"), types);
  writeFileSync(join(app, "types.cts"), types);
  writeFileSync(
    join(app, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        lib: [
          "ES2023",
          "ESNext.Temporal",
          "DOM",
        ],
        module: "nodenext",
        moduleResolution: "nodenext",
        noEmit: true,
        skipLibCheck: false,
        strict: true,
        types: [],
      },
      files: [
        "types.mts",
        "types.cts",
      ],
    }),
  );
  run(
    join(app, "node_modules/.bin/tsc"),
    [
      "-p",
      ".",
    ],
    app,
  );
  console.log("  ok");

  console.log("\n✓ Packed packages work as ESM and CommonJS, with types.");
} catch (error) {
  console.error(`\n✗ ${error instanceof Error ? error.message : error}`);
  if (error?.stdout) console.error(error.stdout);
  process.exitCode = 1;
} finally {
  if (keep) console.log(`\nKept ${work}`);
  else
    rmSync(work, {
      force: true,
      recursive: true,
    });
}
