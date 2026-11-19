import type { CalendarEvent } from "@usecalendar/core";
import { act, Profiler, type ProfilerOnRenderCallback } from "react";
import { createRoot } from "react-dom/client";
import { BASE_DATE, TIME_ZONE } from "../../core/bench/fixtures.js";
import { Calendar, type CalendarProps } from "../src/calendar/calendar.js";

// React only runs effects synchronously inside `act` when it knows it's under test.
(
  globalThis as {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

/** Props of a profiled calendar: everything optional but `events`. */
export type ProfiledProps = Partial<CalendarProps> &
  Pick<CalendarProps, "events">;

/** A calendar mounted in jsdom inside React's `<Profiler>`. */
export type ProfiledCalendar = {
  container: HTMLElement;
  /** Re-renders with new props. */
  render: (props: ProfiledProps) => void;
  /** Milliseconds React spent rendering commits since the last call (`actualDuration`, development build). */
  take: () => number;
  unmount: () => void;
};

const SCROLL = Temporal.PlainTime.from("08:00");

/** Mounts `<Calendar>` on the fixture date and zone, inside a `<Profiler>` that adds up commit times. */
export const mountProfiled = (props: ProfiledProps): ProfiledCalendar => {
  let spent = 0;
  const onRender: ProfilerOnRenderCallback = (_id, _phase, actualDuration) => {
    spent += actualDuration;
  };
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const render = (next: ProfiledProps) =>
    act(() =>
      root.render(
        <Profiler
          id="calendar"
          onRender={onRender}
        >
          <Calendar
            defaultDate={BASE_DATE}
            scrollToTime={SCROLL}
            timeZone={TIME_ZONE}
            {...next}
          />
        </Profiler>,
      ),
    );
  render(props);
  return {
    container,
    render,
    take: () => {
      const value = spent;
      spent = 0;
      return value;
    },
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
};

/** `events` with the first timed event moved 30 minutes later, as after a drag. */
export const moveFirstTimed = (
  events: readonly CalendarEvent[],
): CalendarEvent[] => {
  const index = events.findIndex((event) => event.allDay !== true);
  const later = (instant: string) =>
    Temporal.Instant.from(instant)
      .add({
        minutes: 30,
      })
      .toString();
  return events.map((event, at) =>
    at === index
      ? {
          ...event,
          endAt: later(event.endAt),
          startAt: later(event.startAt),
        }
      : event,
  );
};

/** Clicks the toolbar's "Next" button and returns the commit time it caused. */
export const clickNext = (calendar: ProfiledCalendar): number => {
  calendar.take();
  const next = calendar.container.querySelector<HTMLButtonElement>(
    'button[aria-label="Next"]',
  );
  if (next === null) throw new Error("No Next button");
  act(() => next.click());
  return calendar.take();
};
