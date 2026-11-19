import { bench, describe } from "vitest";
import { makeEvents } from "./fixtures.js";
import {
  dragStep,
  focusSteps,
  layoutMonthView,
  layoutWeekView,
} from "./scenarios.js";

// Numbers for comparing changes on your machine: `pnpm run bench`. Run with the Temporal polyfill (Node has no native
// Temporal yet), which is slower than a native implementation, so treat them as relative, not absolute.
// The pass/fail limits live in tests/performance.test.ts.

const SIZES = [
  50,
  500,
  2000,
] as const;

describe("week view layout (7 × layoutDay + all-day lane)", () => {
  for (const count of SIZES) {
    const events = makeEvents({
      count,
    });
    bench(`${count} events`, () => {
      layoutWeekView(events);
    });
  }
});

describe("month view layout (monthWeeks + layoutWeek + fitWeek per row)", () => {
  for (const count of SIZES) {
    const events = makeEvents({
      count,
      days: 35,
    });
    bench(`${count} events`, () => {
      layoutMonthView(events);
    });
  }
});

describe("per pointer move", () => {
  let step = 0;
  bench("moveRange + resizeRange + sweepRange", () => {
    step = (step + 1) % 100;
    dragStep(step);
  });
});

describe("keyboard focus", () => {
  bench("100 arrow-key moves (nextFocus)", () => {
    focusSteps(100);
  });
});
