import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { arch, cpus, platform, release, totalmem } from "node:os";
import { join } from "node:path";
import { version as reactVersion } from "react";
import { expect, it } from "vitest";
import { makeEvents } from "../../core/bench/fixtures.js";
import {
  measure,
  measureReported,
  type Stats,
} from "../../core/bench/measure.js";
import {
  dragStep,
  focusSteps,
  layoutMonthView,
  layoutWeekView,
} from "../../core/bench/scenarios.js";
import { clickNext, mountProfiled, moveFirstTimed } from "./profiled.js";

/** Event counts every scaling scenario runs with. */
const SIZES = [
  10,
  50,
  100,
  250,
  500,
  1000,
  2000,
  3000,
] as const;

/** One frame at 60 Hz, in milliseconds. */
const FRAME_MS = 1000 / 60;

/** Time spent sampling each case; large cases stop at `minSamples`. */
const SETTINGS = {
  budgetMs: 500,
  maxSamples: 200,
  minSamples: 5,
  warmup: 2,
} as const;

/** React cases mount a whole calendar per sample: fewer samples, same time bound. */
const REACT_SETTINGS = {
  ...SETTINGS,
  minSamples: 3,
  warmup: 1,
} as const;

type Group = "core" | "react";

type Result = Stats & {
  /** Event count, or `null` for scenarios that don't depend on it. */
  events: number | null;
  /** Median as a share of a 60 Hz frame (1 = the whole 16.7 ms). */
  frameShare: number;
};

type Scenario = {
  description: string;
  group: Group;
  id: string;
  results: Result[];
  title: string;
};

const withFrameShare = (events: number | null, stats: Stats): Result => ({
  events,
  ...stats,
  frameShare: Math.round((stats.median / FRAME_MS) * 1000) / 1000,
});

const scaling = (
  group: Group,
  id: string,
  title: string,
  description: string,
  run: (events: number) => Stats,
): Scenario => ({
  description,
  group,
  id,
  results: SIZES.map((count) => withFrameShare(count, run(count))),
  title,
});

const git = (command: string): string | null => {
  try {
    return execSync(`git ${command}`, {
      encoding: "utf8",
      stdio: [
        "ignore",
        "pipe",
        "ignore",
      ],
    }).trim();
  } catch {
    return null;
  }
};

const csv = (scenarios: readonly Scenario[]): string => {
  const header = [
    "group",
    "scenario",
    "events",
    "median_ms",
    "mean_ms",
    "p75_ms",
    "p99_ms",
    "min_ms",
    "max_ms",
    "ops_per_s",
    "samples",
    "frame_share",
  ];
  const rows = scenarios.flatMap((scenario) =>
    scenario.results.map((result) =>
      [
        scenario.group,
        scenario.id,
        result.events ?? "",
        result.median,
        result.mean,
        result.p75,
        result.p99,
        result.min,
        result.max,
        result.opsPerSecond,
        result.samples,
        result.frameShare,
      ].join(","),
    ),
  );
  return `${[
    header.join(","),
    ...rows,
  ].join("\n")}\n`;
};

it("writes the benchmark report", () => {
  const started = Date.now();
  const scenarios: Scenario[] = [
    scaling(
      "core",
      "week-layout",
      "Week view layout",
      "7 × layoutDay over the timed events + layoutWeek/fitWeek for the all-day lane: what TimeGridView computes per render.",
      (count) => {
        const events = makeEvents({
          count,
        });
        return measure(() => layoutWeekView(events), SETTINGS);
      },
    ),
    scaling(
      "core",
      "month-layout",
      "Month view layout",
      "monthWeeks + layoutWeek/fitWeek for every week row: what MonthView computes per render. Events spread over 5 weeks.",
      (count) => {
        const events = makeEvents({
          count,
          days: 35,
        });
        return measure(() => layoutMonthView(events), SETTINGS);
      },
    ),
    {
      description:
        "moveRange + resizeRange + sweepRange: the range math of one pointer move while dragging.",
      group: "core",
      id: "drag-step",
      results: [
        withFrameShare(
          null,
          measure(() => dragStep(7), SETTINGS),
        ),
      ],
      title: "Drag step",
    },
    {
      description:
        "100 arrow-key moves with nextFocus across a week of 7 × 20 events.",
      group: "core",
      id: "focus-100-moves",
      results: [
        withFrameShare(
          null,
          measure(() => focusSteps(100), SETTINGS),
        ),
      ],
      title: "Keyboard focus (100 moves)",
    },
    scaling(
      "react",
      "mount-week",
      "Mount the week view",
      'Commit time of mounting <Calendar defaultView="week"> (React <Profiler>, development build, jsdom).',
      (count) => {
        const events = makeEvents({
          count,
        });
        return measureReported(() => {
          const calendar = mountProfiled({
            defaultView: "week",
            events,
          });
          const time = calendar.take();
          calendar.unmount();
          return time;
        }, REACT_SETTINGS);
      },
    ),
    scaling(
      "react",
      "move-one-event",
      "Move one event (week view)",
      "Commit time of re-rendering the week view after one event's times change, as after a drag.",
      (count) => {
        const events = makeEvents({
          count,
        });
        const moved = moveFirstTimed(events);
        const calendar = mountProfiled({
          defaultView: "week",
          events,
        });
        let flip = false;
        const stats = measureReported(() => {
          calendar.take();
          flip = !flip;
          calendar.render({
            defaultView: "week",
            events: flip ? moved : events,
          });
          return calendar.take();
        }, REACT_SETTINGS);
        calendar.unmount();
        return stats;
      },
    ),
    scaling(
      "react",
      "next-week",
      "Go to the next week",
      "Commit time of the toolbar's Next button in the week view (events spread over five weeks).",
      (count) => {
        const events = makeEvents({
          count,
          days: 35,
        });
        const calendar = mountProfiled({
          defaultView: "week",
          events,
        });
        const stats = measureReported(
          () => clickNext(calendar),
          REACT_SETTINGS,
        );
        calendar.unmount();
        return stats;
      },
    ),
    scaling(
      "react",
      "mount-month",
      "Mount the month view",
      'Commit time of mounting <Calendar defaultView="month"> with events spread over five weeks.',
      (count) => {
        const events = makeEvents({
          count,
          days: 35,
        });
        return measureReported(() => {
          const calendar = mountProfiled({
            defaultView: "month",
            events,
          });
          const time = calendar.take();
          calendar.unmount();
          return time;
        }, REACT_SETTINGS);
      },
    ),
  ];

  const date = new Date();
  const commit = git("rev-parse --short HEAD");
  const cpu = cpus()[0];
  const report = {
    meta: {
      branch: git("rev-parse --abbrev-ref HEAD"),
      commit,
      cpu: {
        cores: cpus().length,
        model: cpu?.model.trim() ?? null,
      },
      date: date.toISOString(),
      dirty: (git("status --porcelain") ?? "") !== "",
      durationSeconds: Math.round((Date.now() - started) / 100) / 10,
      memoryGb: Math.round(totalmem() / 1024 ** 3),
      node: process.version,
      os: {
        arch: arch(),
        platform: platform(),
        release: release(),
      },
      react: {
        build: "development",
        environment: "jsdom",
        version: reactVersion,
      },
      temporal: (
        globalThis as {
          __ucNativeTemporal?: boolean;
        }
      ).__ucNativeTemporal
        ? "native"
        : "temporal-polyfill",
    },
    scenarios,
    schema: 1,
    settings: {
      core: SETTINGS,
      frameMs: Math.round(FRAME_MS * 1000) / 1000,
      react: REACT_SETTINGS,
      sizes: SIZES,
      unit: "ms",
    },
  };

  // jsdom gives modules an http(s) `import.meta.url`: locate the repo with git, else from the package's cwd.
  const directory = join(
    git("rev-parse --show-toplevel") ?? join(process.cwd(), "../.."),
    "benchmarks/results/",
  );
  mkdirSync(directory, {
    recursive: true,
  });
  const stamp = `${date.toISOString().slice(0, 19).replaceAll(":", "-")}Z_${commit ?? "nogit"}`;
  const json = `${JSON.stringify(report, null, 2)}\n`;
  const table = csv(scenarios);
  for (const name of [
    "latest",
    stamp,
  ]) {
    writeFileSync(`${directory}${name}.json`, json);
    writeFileSync(`${directory}${name}.csv`, table);
  }
  process.stdout.write(
    `\nBenchmark report: benchmarks/results/${stamp}.json (+ latest.json, .csv)\n`,
  );
  expect(scenarios.length).toBeGreaterThan(0);
});
