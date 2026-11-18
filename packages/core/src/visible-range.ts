import {
  type CalendarView,
  daysToUtcRange,
  startOfWeek,
} from "./calendar-view.js";
import type { DateRange } from "./date-range.js";
import { monthWeeks } from "./month-layout.js";
import type { WeekStart } from "./options.js";

/**
 * The first and last day a view draws around `date`. The month view draws whole weeks, so its range starts
 * and ends with the days of the neighboring months that complete the first and last rows.
 *
 * @example
 * visibleDayRange(Temporal.PlainDate.from("2026-11-15"), "month", "monday"); // 2026-10-26 … 2026-12-06
 */
export const visibleDayRange = (
  date: Temporal.PlainDate,
  view: CalendarView,
  weekStart: WeekStart,
): {
  first: Temporal.PlainDate;
  last: Temporal.PlainDate;
} => {
  if (view === "day")
    return {
      first: date,
      last: date,
    };
  if (view === "week") {
    const first = startOfWeek(date, weekStart);
    return {
      first,
      last: first.add({
        days: 6,
      }),
    };
  }
  const weeks = monthWeeks(date, weekStart);
  return {
    first: weeks[0]?.[0] ?? date,
    last: weeks.at(-1)?.at(-1) ?? date,
  };
};

/**
 * The UTC range a view draws around `date` in `timeZone`: exactly the events to fetch for it.
 *
 * @example
 * visibleRange(Temporal.PlainDate.from("2026-11-15"), "week", "monday", "America/Lima");
 * // { start: "2026-11-09T05:00:00.000Z", end: "2026-11-16T05:00:00.000Z" }
 */
export const visibleRange = (
  date: Temporal.PlainDate,
  view: CalendarView,
  weekStart: WeekStart,
  timeZone: string,
): DateRange => {
  const { first, last } = visibleDayRange(date, view, weekStart);
  return daysToUtcRange(first, last, timeZone);
};
