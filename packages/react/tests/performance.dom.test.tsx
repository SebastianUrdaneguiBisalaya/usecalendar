// @vitest-environment jsdom
import type { CalendarEvent } from "@usecalendar/core";
import { act, Profiler, type ProfilerOnRenderCallback } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { BASE_DATE, makeEvents, TIME_ZONE } from "../../core/bench/fixtures.js";
import { Calendar, type CalendarProps } from "../src/calendar/calendar.js";
import "./render-hook.js";

// React's <Profiler> reports how long each commit spent rendering the calendar (`actualDuration`, development
// build). jsdom lays nothing out and paints nothing: this is the JavaScript side of a frame (rendering + layout
// math), the part the library controls. Real frame rates are checked by hand in Storybook (see CONTRIBUTING.md).
//
// Budgets are about 5× the time measured on a laptop (noted next to each), so they fail on a clear regression (a render that
// suddenly redoes much more work), not on a slow machine.

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
});

const scroll = Temporal.PlainTime.from("08:00");

/** Mounts a profiled calendar and returns how to re-render it and read the time spent since the last read. */
const mountProfiled = (
  props: Partial<CalendarProps> & Pick<CalendarProps, "events">,
) => {
  let spent = 0;
  const onRender: ProfilerOnRenderCallback = (_id, _phase, actualDuration) => {
    spent += actualDuration;
  };
  const container = document.createElement("div");
  document.body.append(container);
  const root: Root = createRoot(container);
  const render = (
    next: Partial<CalendarProps> & Pick<CalendarProps, "events">,
  ) =>
    act(() =>
      root.render(
        <Profiler
          id="calendar"
          onRender={onRender}
        >
          <Calendar
            defaultDate={BASE_DATE}
            scrollToTime={scroll}
            timeZone={TIME_ZONE}
            {...next}
          />
        </Profiler>,
      ),
    );
  render(props);
  cleanup = () => {
    act(() => root.unmount());
    container.remove();
  };
  const take = () => {
    const value = spent;
    spent = 0;
    return value;
  };
  return {
    container,
    render,
    take,
  };
};

const moveFirstTimed = (events: readonly CalendarEvent[]): CalendarEvent[] => {
  const index = events.findIndex((event) => event.allDay !== true);
  return events.map((event, at) =>
    at === index
      ? {
          ...event,
          endAt: Temporal.Instant.from(event.endAt)
            .add({
              minutes: 30,
            })
            .toString(),
          startAt: Temporal.Instant.from(event.startAt)
            .add({
              minutes: 30,
            })
            .toString(),
        }
      : event,
  );
};

describe("render budgets", () => {
  it("mounts the week view with 500 events", () => {
    const { take } = mountProfiled({
      defaultView: "week",
      events: makeEvents({
        count: 500,
      }),
    });
    const mount = take();
    expect(mount).toBeGreaterThan(0);
    // Measured ≈150 ms (development build, jsdom).
    expect(mount).toBeLessThan(800);
  });

  it("re-renders the week view after one of 500 events moves", () => {
    const events = makeEvents({
      count: 500,
    });
    const { render, take } = mountProfiled({
      defaultView: "week",
      events,
    });
    take();
    render({
      defaultView: "week",
      events: moveFirstTimed(events),
    });
    // Measured ≈65 ms: every slot and event re-renders, not only the moved one.
    expect(take()).toBeLessThan(400);
  });

  it("navigates the week view to the next week with 500 events", () => {
    const { container, take } = mountProfiled({
      defaultView: "week",
      events: makeEvents({
        count: 500,
      }),
    });
    take();
    const next = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Next"]',
    );
    expect(next).not.toBeNull();
    act(() => next?.click());
    // Measured ≈30 ms.
    expect(take()).toBeLessThan(250);
  });

  it("mounts the month view with 2000 events", () => {
    const { take } = mountProfiled({
      defaultView: "month",
      events: makeEvents({
        count: 2000,
        days: 35,
      }),
    });
    // Measured ≈190 ms.
    expect(take()).toBeLessThan(1000);
  });
});
