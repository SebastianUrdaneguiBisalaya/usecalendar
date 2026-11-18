import { describe, expect, it } from "vitest";
import {
  daysToUtcRange,
  isCalendarView,
  isWeekend,
  shiftDate,
  startOfWeek,
  visibleDays,
} from "../src/calendar-view.js";

const date = (value: string) => Temporal.PlainDate.from(value);
const texts = (days: Temporal.PlainDate[]) => days.map((day) => day.toString());

describe("visibleDays", () => {
  const sunday = date("2026-11-15");

  it("day view shows only that day", () => {
    expect(texts(visibleDays(sunday, "day", "monday"))).toEqual([
      "2026-11-15",
    ]);
  });

  it("week view starts on the configured first weekday", () => {
    expect(texts(visibleDays(sunday, "week", "monday"))).toEqual([
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
      "2026-11-15",
    ]);
    expect(visibleDays(sunday, "week", "sunday")[0]?.toString()).toBe(
      "2026-11-15",
    );
    expect(visibleDays(sunday, "week", "saturday")[0]?.toString()).toBe(
      "2026-11-14",
    );
  });

  it("month view shows every day of the month", () => {
    const days = visibleDays(date("2026-02-10"), "month", "monday");
    expect(days).toHaveLength(28);
    expect(days[0]?.toString()).toBe("2026-02-01");
    expect(days.at(-1)?.toString()).toBe("2026-02-28");
  });

  it("month view includes February 29 in a leap year", () => {
    expect(visibleDays(date("2028-02-01"), "month", "monday")).toHaveLength(29);
  });
});

describe("startOfWeek", () => {
  it("a first weekday is its own week start", () => {
    expect(startOfWeek(date("2026-11-16"), "monday").toString()).toBe(
      "2026-11-16",
    );
    expect(startOfWeek(date("2026-11-14"), "saturday").toString()).toBe(
      "2026-11-14",
    );
    expect(startOfWeek(date("2026-11-15"), "sunday").toString()).toBe(
      "2026-11-15",
    );
  });

  it("goes back to the previous week start, across months and years", () => {
    expect(startOfWeek(date("2026-01-01"), "monday").toString()).toBe(
      "2025-12-29",
    );
    expect(startOfWeek(date("2026-11-14"), "sunday").toString()).toBe(
      "2026-11-08",
    );
  });
});

describe("shiftDate", () => {
  it("moves by one day, week or month and crosses years", () => {
    expect(shiftDate(date("2026-12-31"), "day", 1).toString()).toBe(
      "2027-01-01",
    );
    expect(shiftDate(date("2026-11-15"), "week", -1).toString()).toBe(
      "2026-11-08",
    );
    expect(shiftDate(date("2026-01-10"), "month", -1).toString()).toBe(
      "2025-12-10",
    );
  });

  it("clamps the day when the next month is shorter", () => {
    expect(shiftDate(date("2026-01-31"), "month", 1).toString()).toBe(
      "2026-02-28",
    );
  });
});

describe("isWeekend", () => {
  it("Saturday and Sunday are weekend days", () => {
    expect(
      [
        date("2026-11-13"),
        date("2026-11-14"),
        date("2026-11-15"),
      ].map(isWeekend),
    ).toEqual([
      false,
      true,
      true,
    ]);
  });
});

describe("isCalendarView", () => {
  it("accepts only known views", () => {
    expect(isCalendarView("week")).toBe(true);
    expect(isCalendarView("year")).toBe(false);
    expect(isCalendarView(undefined)).toBe(false);
  });
});

describe("daysToUtcRange", () => {
  it("converts local midnights in the time zone to UTC instants", () => {
    expect(
      daysToUtcRange(date("2026-11-09"), date("2026-11-15"), "America/Lima"),
    ).toEqual({
      end: "2026-11-16T05:00:00.000Z",
      start: "2026-11-09T05:00:00.000Z",
    });
    expect(
      daysToUtcRange(date("2026-11-15"), date("2026-11-15"), "Asia/Tokyo"),
    ).toEqual({
      end: "2026-11-15T15:00:00.000Z",
      start: "2026-11-14T15:00:00.000Z",
    });
  });

  it("a day across a DST change is 23 hours long", () => {
    expect(
      daysToUtcRange(
        date("2026-03-08"),
        date("2026-03-08"),
        "America/New_York",
      ),
    ).toEqual({
      end: "2026-03-09T04:00:00.000Z",
      start: "2026-03-08T05:00:00.000Z",
    });
  });
});
