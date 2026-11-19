import { describe, expect, it } from "vitest";
import { makeEvents } from "../bench/fixtures.js";
import {
  dragStep,
  focusSteps,
  layoutMonthView,
  layoutWeekView,
} from "../bench/scenarios.js";

// Core compiles without DOM or Node types; `performance.now()` exists in both runtimes.
declare const performance: {
  now: () => number;
};

/**
 * Median time of `run` in milliseconds, after a warm-up, so one slow sample (GC, a busy machine) doesn't fail a test.
 */
const median = (run: () => unknown, samples = 7, warmup = 2): number => {
  for (let index = 0; index < warmup; index += 1) run();
  const times = Array.from(
    {
      length: samples,
    },
    () => {
      const start = performance.now();
      run();
      return performance.now() - start;
    },
  ).sort((a, b) => a - b);
  return times[Math.floor(times.length / 2)] ?? Number.POSITIVE_INFINITY;
};

// Budgets are about 10× the median measured on a laptop (with the Temporal polyfill), so they fail on a clear
// regression (an accidental quadratic loop, a layout per event) and not on a slow or busy machine.
// For the actual numbers, run `pnpm run bench`.
describe("performance budgets", () => {
  it("lays out a week of 500 events", () => {
    const events = makeEvents({
      count: 500,
    });
    // Measured ≈14 ms.
    expect(median(() => layoutWeekView(events))).toBeLessThan(150);
  });

  it("lays out a month of 500 events", () => {
    const events = makeEvents({
      count: 500,
      days: 35,
    });
    // Measured ≈24 ms.
    expect(median(() => layoutMonthView(events))).toBeLessThan(250);
  });

  it("computes a drag step well within a frame", () => {
    let step = 0;
    expect(
      median(() => {
        for (let index = 0; index < 100; index += 1) {
          step = (step + 1) % 100;
          dragStep(step);
        }
      }),
      // Measured ≈3 ms for 100 steps.
    ).toBeLessThan(30);
  });

  it("moves keyboard focus well within a frame", () => {
    // Measured ≈0.2 ms.
    expect(median(() => focusSteps(100))).toBeLessThan(5);
  });
});
