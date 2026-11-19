import { isWeekend, startOfWeek } from "./calendar-view.js";
import type { WeekStart } from "./options.js";

/**
 * Every way a date strip can line up around a day; see {@link stripStart}.
 */
export const STRIP_ALIGNS = [
  "week",
  "start",
  "center",
] as const;

/**
 * How a date strip lines up around a day:
 * - `"week"`: pages of the strip's length counted from the start of the day's week, like a week view.
 * - `"start"`: the day comes first.
 * - `"center"`: the day sits in the middle (left of the middle for an even length).
 */
export type StripAlign = (typeof STRIP_ALIGNS)[number];

/** Every distance the previous/next arrows of a date strip can move; see {@link shiftStrip}. */
export const STRIP_STEPS = [
  "page",
  "day",
] as const;

/** How far the previous/next arrows move a date strip: a whole `"page"` of days, or one `"day"`. */
export type StripStep = (typeof STRIP_STEPS)[number];

/** Options shared by the date strip functions. */
export type StripOptions = {
  /**
   * Whether Saturdays and Sundays are shown. When `false` they're skipped: the strip still shows its full number of
   * days, and every count of days below is in shown days.
   *
   * @defaultValue true
   */
  showWeekends?: boolean | undefined;
};

/** The earliest and latest days that can be picked; either bound may be left out. Both are inclusive. */
export type DateLimits = {
  /** Last day that can be picked. */
  max?: Temporal.PlainDate | undefined;
  /** First day that can be picked. */
  min?: Temporal.PlainDate | undefined;
};

const shown = (day: Temporal.PlainDate, showWeekends: boolean) =>
  showWeekends || !isWeekend(day);

/** The first shown day on or after `day` (`direction` 1) or on or before it (`-1`). */
const nearestShown = (
  day: Temporal.PlainDate,
  showWeekends: boolean,
  direction: -1 | 1,
): Temporal.PlainDate => {
  let current = day;
  while (!shown(current, showWeekends))
    current = current.add({
      days: direction,
    });
  return current;
};

/**
 * Moves `days` shown days from `day` (back when negative). Starting on a hidden day counts from the nearest shown
 * day in the direction of travel.
 *
 * @example
 * addStripDays(Temporal.PlainDate.from("2026-11-20"), 1, { showWeekends: false }); // Monday 2026-11-23
 */
export const addStripDays = (
  day: Temporal.PlainDate,
  days: number,
  { showWeekends = true }: StripOptions = {},
): Temporal.PlainDate => {
  const direction = days < 0 ? -1 : 1;
  let current = nearestShown(day, showWeekends, direction);
  for (let moved = 0; moved < Math.abs(Math.trunc(days)); moved++)
    current = nearestShown(
      current.add({
        days: direction,
      }),
      showWeekends,
      direction,
    );
  return current;
};

/**
 * The `count` days a strip starting at `start` shows, in order. Hidden weekends are skipped, and a hidden `start`
 * moves to the next shown day.
 *
 * @example
 * stripDays(Temporal.PlainDate.from("2026-11-18"), 7); // 2026-11-18 … 2026-11-24
 */
export const stripDays = (
  start: Temporal.PlainDate,
  count: number,
  options: StripOptions = {},
): Temporal.PlainDate[] => {
  const days: Temporal.PlainDate[] = [];
  let current = addStripDays(start, 0, options);
  for (let index = 0; index < count; index++) {
    days.push(current);
    current = addStripDays(current, 1, options);
  }
  return days;
};

/** Shown days from `from` up to (not including) `to`; `from` must not come after `to`. */
const shownBetween = (
  from: Temporal.PlainDate,
  to: Temporal.PlainDate,
  showWeekends: boolean,
): number => {
  let count = 0;
  for (
    let day = from;
    Temporal.PlainDate.compare(day, to) < 0;
    day = day.add({
      days: 1,
    })
  )
    if (shown(day, showWeekends)) count++;
  return count;
};

/**
 * Where a strip of `count` days that contains `day` starts, for the given alignment. A hidden `day` (a weekend while
 * weekends are hidden) is placed as the next shown day.
 *
 * @example
 * const day = Temporal.PlainDate.from("2026-11-19"); // a Thursday
 * stripStart(day, 7, { align: "week", weekStart: "monday" }); // Monday 2026-11-16
 * stripStart(day, 3, { align: "week", weekStart: "monday" }); // Monday 2026-11-16 (Mon–Wed, then Thu–Sat)
 * stripStart(day, 5, { align: "center" }); // 2026-11-17
 */
export const stripStart = (
  day: Temporal.PlainDate,
  count: number,
  {
    align = "week",
    showWeekends = true,
    weekStart = "monday",
  }: StripOptions & {
    /** @defaultValue "week" */
    align?: StripAlign | undefined;
    /** First day of the week, for `align: "week"`. @defaultValue "monday" */
    weekStart?: WeekStart | undefined;
  } = {},
): Temporal.PlainDate => {
  const options = {
    showWeekends,
  };
  const target = addStripDays(day, 0, options);
  const length = Math.max(1, Math.trunc(count));
  switch (align) {
    case "start":
      return target;
    case "center":
      return addStripDays(target, -Math.floor((length - 1) / 2), options);
    case "week": {
      const weekFirst = addStripDays(
        startOfWeek(target, weekStart),
        0,
        options,
      );
      const offset = shownBetween(weekFirst, target, showWeekends);
      return addStripDays(
        weekFirst,
        Math.floor(offset / length) * length,
        options,
      );
    }
  }
};

/**
 * The start of the previous (`-1`) or next (`1`) strip: `count` shown days away for the `"page"` step, one for
 * `"day"`.
 *
 * @example
 * shiftStrip(Temporal.PlainDate.from("2026-11-16"), 7, 1); // 2026-11-23
 * shiftStrip(Temporal.PlainDate.from("2026-11-16"), 7, -1, { step: "day" }); // 2026-11-15
 */
export const shiftStrip = (
  start: Temporal.PlainDate,
  count: number,
  direction: -1 | 1,
  {
    showWeekends = true,
    step = "page",
  }: StripOptions & {
    /** @defaultValue "page" */
    step?: StripStep | undefined;
  } = {},
): Temporal.PlainDate =>
  addStripDays(start, direction * (step === "page" ? Math.trunc(count) : 1), {
    showWeekends,
  });

/**
 * True when `day` is within `limits` (both bounds inclusive).
 *
 * @example
 * isDayInRange(day, { min: today }); // false for days before today
 */
export const isDayInRange = (
  day: Temporal.PlainDate,
  { max, min }: DateLimits,
): boolean =>
  (min === undefined || Temporal.PlainDate.compare(day, min) >= 0) &&
  (max === undefined || Temporal.PlainDate.compare(day, max) <= 0);

/**
 * `day`, moved inside `limits` when it's outside them. With `min` after `max`, `min` wins.
 *
 * @example
 * clampDay(Temporal.PlainDate.from("2026-01-01"), { min: Temporal.PlainDate.from("2026-03-01") }); // 2026-03-01
 */
export const clampDay = (
  day: Temporal.PlainDate,
  { max, min }: DateLimits,
): Temporal.PlainDate => {
  if (min !== undefined && Temporal.PlainDate.compare(day, min) < 0) return min;
  if (max !== undefined && Temporal.PlainDate.compare(day, max) > 0)
    return min !== undefined && Temporal.PlainDate.compare(min, max) > 0
      ? min
      : max;
  return day;
};

/** Where focus goes in a date strip after a key press; see {@link nextStripFocus}. */
export type StripFocus = {
  /** Index of the day to focus among the strip's shown days, after `shift` is applied. */
  index: number;
  /** Move the strip before focusing (as the previous/next arrows would), or `null` to keep it. */
  shift: {
    direction: -1 | 1;
    step: StripStep;
  } | null;
};

/**
 * Where keyboard focus moves for a key press in a date strip of `count` days, or `null` when the key isn't a strip
 * key. Focus keys are fixed (WAI-ARIA listbox pattern), not configurable.
 *
 * - `←`/`→`: previous/next day. Past an edge the strip moves by `step` and focus keeps going: with `"page"` it lands
 *   on the far end of the new page, with `"day"` it stays on the edge as the days slide by.
 * - `Home`/`End`: first/last day shown.
 * - `PageUp`/`PageDown`: the same position in the previous/next page.
 *
 * @example
 * nextStripFocus(6, "ArrowRight", 7); // { index: 0, shift: { direction: 1, step: "page" } }
 * nextStripFocus(3, "Home", 7); // { index: 0, shift: null }
 */
export const nextStripFocus = (
  index: number,
  key: string,
  count: number,
  step: StripStep = "page",
): StripFocus | null => {
  const last = Math.max(0, count - 1);
  switch (key) {
    case "ArrowLeft":
      return index > 0
        ? {
            index: index - 1,
            shift: null,
          }
        : {
            index: step === "page" ? last : 0,
            shift: {
              direction: -1,
              step,
            },
          };
    case "ArrowRight":
      return index < last
        ? {
            index: index + 1,
            shift: null,
          }
        : {
            index: step === "page" ? 0 : last,
            shift: {
              direction: 1,
              step,
            },
          };
    case "Home":
      return {
        index: 0,
        shift: null,
      };
    case "End":
      return {
        index: last,
        shift: null,
      };
    case "PageUp":
    case "PageDown":
      return {
        index,
        shift: {
          direction: key === "PageUp" ? -1 : 1,
          step: "page",
        },
      };
    default:
      return null;
  }
};
