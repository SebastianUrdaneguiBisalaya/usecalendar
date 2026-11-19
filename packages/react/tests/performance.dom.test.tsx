// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { makeEvents } from "../../core/bench/fixtures.js";
import {
  clickNext,
  mountProfiled,
  moveFirstTimed,
  type ProfiledCalendar,
} from "../bench/profiled.js";

// React's <Profiler> reports how long each commit spent rendering the calendar (`actualDuration`, development
// build). jsdom lays nothing out and paints nothing: this is the JavaScript side of a frame (rendering + layout
// math), the part the library controls. Real frame rates are checked by hand in Storybook (see CONTRIBUTING.md).
//
// Budgets are about 5× the time measured on a laptop (noted next to each), so they fail on a clear regression (a
// render that suddenly redoes much more work), not on a slow machine. `pnpm run bench:report` records the numbers.

let mounted: ProfiledCalendar | undefined;
afterEach(() => {
  mounted?.unmount();
  mounted = undefined;
});

const mount = (...args: Parameters<typeof mountProfiled>) => {
  mounted = mountProfiled(...args);
  return mounted;
};

describe("render budgets", () => {
  it("mounts the week view with 500 events", () => {
    const { take } = mount({
      defaultView: "week",
      events: makeEvents({
        count: 500,
      }),
    });
    const time = take();
    expect(time).toBeGreaterThan(0);
    // Measured ≈135 ms (development build, jsdom).
    expect(time).toBeLessThan(700);
  });

  it("re-renders the week view after one of 500 events moves", () => {
    const events = makeEvents({
      count: 500,
    });
    const calendar = mount({
      defaultView: "week",
      events,
    });
    calendar.take();
    calendar.render({
      defaultView: "week",
      events: moveFirstTimed(events),
    });
    // Measured ≈40 ms: the layout is memoized, but every slot and event still re-renders.
    expect(calendar.take()).toBeLessThan(200);
  });

  it("navigates the week view to the next week with 500 events", () => {
    const calendar = mount({
      defaultView: "week",
      events: makeEvents({
        count: 500,
      }),
    });
    // Measured ≈20 ms.
    expect(clickNext(calendar)).toBeLessThan(120);
  });

  it("mounts the month view with 2000 events", () => {
    const { take } = mount({
      defaultView: "month",
      events: makeEvents({
        count: 2000,
        days: 35,
      }),
    });
    // Measured ≈140 ms.
    expect(take()).toBeLessThan(700);
  });
});
