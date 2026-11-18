import type { DateRange } from "./date-range.js";
import type { WeekStart } from "./options.js";

// Calendar days are `Temporal.PlainDate`s: a day on the calendar, not an instant. They become instants only
// with a time zone, so the same days work for whatever zone the calendar is shown in.

/** Every view the calendar can show. */
export const CALENDAR_VIEWS = [
  "day",
  "week",
  "month",
] as const;

/** Which view the calendar shows: a single day, a week, or a whole month. */
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

/** Type guard for {@link CalendarView}, for values from untyped sources (URL params, storage). */
export const isCalendarView = (value: unknown): value is CalendarView =>
  CALENDAR_VIEWS.some((view) => view === value);

/** ISO 8601 weekday (Monday = 1 … Sunday = 7) each week start names. */
const FIRST_WEEKDAY = {
  monday: 1,
  saturday: 6,
  sunday: 7,
} as const satisfies Record<WeekStart, number>;

/**
 * The first day of the week containing `date`.
 *
 * @example
 * startOfWeek(Temporal.PlainDate.from("2026-11-15"), "monday"); // 2026-11-09
 */
export const startOfWeek = (
  date: Temporal.PlainDate,
  weekStart: WeekStart,
): Temporal.PlainDate =>
  date.subtract({
    days: (date.dayOfWeek - FIRST_WEEKDAY[weekStart] + 7) % 7,
  });

const daysFrom = (
  start: Temporal.PlainDate,
  count: number,
): Temporal.PlainDate[] =>
  Array.from(
    {
      length: count,
    },
    (_, index) =>
      start.add({
        days: index,
      }),
  );

/**
 * The days a view covers around `date`: that day, its week (from `weekStart`), or every day of its month.
 *
 * @example
 * visibleDays(Temporal.PlainDate.from("2026-11-15"), "week", "monday"); // 2026-11-09 … 2026-11-15
 */
export const visibleDays = (
  date: Temporal.PlainDate,
  view: CalendarView,
  weekStart: WeekStart,
): Temporal.PlainDate[] => {
  switch (view) {
    case "day":
      return [
        date,
      ];
    case "week":
      return daysFrom(startOfWeek(date, weekStart), 7);
    case "month":
      return daysFrom(
        date.with({
          day: 1,
        }),
        date.daysInMonth,
      );
  }
};

/**
 * Moves `date` one view-sized step back (`-1`) or forward (`1`): a day, a week, or a month.
 * Months clamp the day (Jan 31 → Feb 28).
 */
export const shiftDate = (
  date: Temporal.PlainDate,
  view: CalendarView,
  step: -1 | 1,
): Temporal.PlainDate => {
  switch (view) {
    case "day":
      return date.add({
        days: step,
      });
    case "week":
      return date.add({
        weeks: step,
      });
    case "month":
      return date.add({
        months: step,
      });
  }
};

/** True for Saturdays and Sundays. */
export const isWeekend = (date: Temporal.PlainDate): boolean =>
  date.dayOfWeek >= 6;

/** `…T00:00:00.000Z` text for the start of `date` in `timeZone`. */
const startOfDayUtc = (date: Temporal.PlainDate, timeZone: string): string =>
  new Date(
    date.toZonedDateTime({
      timeZone,
    }).epochMilliseconds,
  ).toISOString();

/**
 * The UTC range from the start of `first` to the start of the day after `last`, both in `timeZone`.
 * Handy to fetch exactly the events a view shows.
 *
 * @example
 * daysToUtcRange(first, last, "America/Lima"); // { start: "2026-11-09T05:00:00.000Z", end: "2026-11-16T05:00:00.000Z" }
 */
export const daysToUtcRange = (
  first: Temporal.PlainDate,
  last: Temporal.PlainDate,
  timeZone: string,
): DateRange => ({
  end: startOfDayUtc(
    last.add({
      days: 1,
    }),
    timeZone,
  ),
  start: startOfDayUtc(first, timeZone),
});
