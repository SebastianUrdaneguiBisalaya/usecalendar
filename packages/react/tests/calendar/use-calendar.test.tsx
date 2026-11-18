// @vitest-environment jsdom
import type { CalendarView } from "@usecalendar/core";
import { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CalendarProvider,
  useCalendarContext,
} from "../../src/calendar/calendar-context.js";
import {
  type UseCalendarOptions,
  useCalendar,
} from "../../src/calendar/use-calendar.js";
import { CalendarContextError } from "../../src/errors.js";
import { renderHook } from "../render-hook.js";

const LIMA = "America/Lima";
const day = (value: string) => Temporal.PlainDate.from(value);

beforeEach(() => {
  vi.useFakeTimers();
  // Sunday, November 15 2026, 10:00 in Lima.
  vi.setSystemTime(new Date("2026-11-15T15:00:00Z"));
});
afterEach(() => vi.useRealTimers());

const render = (options: UseCalendarOptions) =>
  renderHook((props: UseCalendarOptions) => useCalendar(props), options);

describe("useCalendar (uncontrolled)", () => {
  it("starts on today's week, from Monday", () => {
    const { result } = render({
      timeZone: LIMA,
    });
    expect(result.current.today?.toString()).toBe("2026-11-15");
    expect(result.current.view).toBe("week");
    expect(result.current.days?.map(String)).toEqual([
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
      "2026-11-15",
    ]);
    expect(result.current.range).toEqual({
      end: "2026-11-16T05:00:00.000Z",
      start: "2026-11-09T05:00:00.000Z",
    });
  });

  it("navigates by the view's step and back to today", () => {
    const onDateChange = vi.fn();
    const { result } = render({
      onDateChange,
      timeZone: LIMA,
    });
    act(() => result.current.goToNext());
    expect(result.current.date?.toString()).toBe("2026-11-22");
    act(() => result.current.setView("month"));
    act(() => result.current.goToPrevious());
    expect(result.current.date?.toString()).toBe("2026-10-22");
    act(() => result.current.goToToday());
    expect(result.current.date?.toString()).toBe("2026-11-15");
    expect(onDateChange.mock.calls.map(([date]) => String(date))).toEqual([
      "2026-11-22",
      "2026-10-22",
      "2026-11-15",
    ]);
  });

  it("follows today across midnight until the user navigates away", () => {
    const { result } = render({
      defaultView: "day",
      timeZone: LIMA,
    });
    // Midnight in Lima is 05:00 UTC.
    act(() => vi.setSystemTime(new Date("2026-11-16T05:00:01Z")));
    act(() => vi.advanceTimersToNextTimer());
    expect(result.current.date?.toString()).toBe("2026-11-16");
  });

  it("honors the initial date, view and week start", () => {
    const { result } = render({
      defaultDate: day("2026-02-10"),
      defaultView: "month",
      timeZone: LIMA,
      weekStart: "sunday",
    });
    expect(result.current.days).toHaveLength(28);
    expect(result.current.range?.start).toBe("2026-02-01T05:00:00.000Z");
  });

  it("reports the visible range once per change", () => {
    const onRangeChange = vi.fn();
    const { result, rerender } = render({
      onRangeChange,
      timeZone: LIMA,
    });
    rerender({
      onRangeChange,
      timeZone: LIMA,
    });
    expect(onRangeChange).toHaveBeenCalledTimes(1);
    act(() => result.current.setView("month"));
    expect(onRangeChange).toHaveBeenLastCalledWith(
      {
        end: "2026-12-07T05:00:00.000Z",
        start: "2026-10-26T05:00:00.000Z",
      },
      "month",
    );
    expect(onRangeChange).toHaveBeenCalledTimes(2);
  });
});

describe("useCalendar (controlled)", () => {
  it("shows the given date and view and only asks to change them", () => {
    const onDateChange = vi.fn();
    const onViewChange = vi.fn();
    const options = {
      date: day("2026-01-05"),
      onDateChange,
      onViewChange,
      timeZone: LIMA,
      view: "day" as CalendarView,
    };
    const { result, rerender } = render(options);
    act(() => result.current.goToNext());
    act(() => result.current.setView("week"));
    expect(result.current.date?.toString()).toBe("2026-01-05");
    expect(result.current.view).toBe("day");
    expect(String(onDateChange.mock.calls[0]?.[0])).toBe("2026-01-06");
    expect(onViewChange).toHaveBeenCalledWith("week");
    rerender({
      ...options,
      date: day("2026-01-06"),
      view: "week",
    });
    expect(result.current.days?.[0]?.toString()).toBe("2026-01-05");
  });

  it("asks to go to today with today's date", () => {
    const onDateChange = vi.fn();
    const { result } = render({
      date: day("2026-01-05"),
      onDateChange,
      timeZone: LIMA,
    });
    act(() => result.current.goToToday());
    expect(String(onDateChange.mock.calls[0]?.[0])).toBe("2026-11-15");
  });
});

describe("server rendering", () => {
  function Probe(props: UseCalendarOptions) {
    const { date, days, range, timeZone, today } = useCalendar(props);
    return (
      <p>
        {[
          String(date),
          String(today),
          String(days),
          String(range),
          timeZone,
        ].join("|")}
      </p>
    );
  }

  it("renders without today or the system zone, so hydration can't mismatch", () => {
    expect(renderToStaticMarkup(<Probe />)).toBe(
      "<p>null|null|null|null|UTC</p>",
    );
  });

  it("still renders a controlled date", () => {
    expect(
      renderToStaticMarkup(
        <Probe
          date={day("2026-11-15")}
          defaultView="day"
          timeZone={LIMA}
        />,
      ),
    ).toContain("2026-11-15|null|2026-11-15|");
  });
});

describe("CalendarProvider", () => {
  it("throws a CalendarContextError outside a provider", () => {
    function Orphan() {
      useCalendarContext();
      return null;
    }
    expect(() => renderToStaticMarkup(<Orphan />)).toThrow(
      CalendarContextError,
    );
  });

  it("shares the calendar state", () => {
    function Child() {
      return <p>{useCalendarContext().view}</p>;
    }
    function Parent() {
      const calendar = useCalendar({
        defaultView: "month",
      });
      return (
        <CalendarProvider calendar={calendar}>
          <Child />
        </CalendarProvider>
      );
    }
    expect(renderToStaticMarkup(<Parent />)).toBe("<p>month</p>");
  });
});
