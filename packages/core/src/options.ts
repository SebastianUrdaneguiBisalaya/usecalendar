/** Every day a week can start on, as the calendar's first column. */
export const WEEK_STARTS = [
  "monday",
  "sunday",
  "saturday",
] as const;

/**
 * The weekday the calendar's weeks start on (first column of the week and month views).
 *
 * `"monday"` also switches week numbers to ISO 8601 numbering.
 */
export type WeekStart = (typeof WEEK_STARTS)[number];

/** Every supported clock format. */
export const TIME_FORMATS = [
  "12h",
  "24h",
] as const;

/** How times are shown: `"12h"` (e.g. `3:00 PM`) or `"24h"` (e.g. `15:00`). */
export type TimeFormat = (typeof TIME_FORMATS)[number];

/** Type guard for {@link WeekStart}, for values from untyped sources (URL params, storage). */
export const isWeekStart = (value: unknown): value is WeekStart =>
  WEEK_STARTS.some((weekStart) => weekStart === value);

/** Type guard for {@link TimeFormat}, for values from untyped sources (URL params, storage). */
export const isTimeFormat = (value: unknown): value is TimeFormat =>
  TIME_FORMATS.some((format) => format === value);
