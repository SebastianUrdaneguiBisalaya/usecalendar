import {
  addStripDays,
  isDayInRange,
  type StripAlign,
  type StripStep,
  shiftStrip,
  stripDays,
  stripStart,
  type WeekStart,
} from "@usecalendar/core";
import { useEffect, useRef, useState } from "react";
import type { CalendarState } from "../calendar/use-calendar.js";
import { useSystemTimeZone } from "../clock/use-system-time-zone.js";
import { useToday } from "../clock/use-today.js";

/** Options of {@link useMiniCalendar}. Every option is optional; stateful ones come controlled and uncontrolled. */
export type UseMiniCalendarOptions = {
  /**
   * How the strip lines up around the selected day (or today) when it first shows or jumps to a day:
   * `"week"` pages from the start of the week, `"start"` puts the day first, `"center"` puts it in the middle.
   *
   * @defaultValue "week"
   */
  align?: StripAlign | undefined;
  /**
   * A full calendar's state (from `useCalendar`) to stay in sync with: its anchored day is the selected day unless
   * `value` is given, selecting a day calls its `goToDate`, and its `weekStart`, `showWeekends` and `timeZone` are
   * the defaults of the options below.
   */
  calendar?: CalendarState | undefined;
  /** Number of days shown at once. @defaultValue 7 */
  days?: number | undefined;
  /** The initial first day shown when uncontrolled. @defaultValue the strip lined up (see `align`) around the selected day or today */
  defaultStart?: Temporal.PlainDate | undefined;
  /** The initially selected day when uncontrolled. @defaultValue none */
  defaultValue?: Temporal.PlainDate | null | undefined;
  /** Return `true` to make a day unselectable (it stays visible and focusable, but is marked disabled). */
  isDayDisabled?: ((day: Temporal.PlainDate) => boolean) | undefined;
  /** Last day that can be selected (inclusive); the strip doesn't page past it. */
  maxDate?: Temporal.PlainDate | undefined;
  /** First day that can be selected (inclusive); the strip doesn't page before it. */
  minDate?: Temporal.PlainDate | undefined;
  /**
   * Called with the first and last day shown, whenever they change: use it to fetch data for those days, e.g.
   * dots for days with events. Not called while the days are unknown (server rendering without `value` or `start`).
   */
  onRangeChange?:
    | ((first: Temporal.PlainDate, last: Temporal.PlainDate) => void)
    | undefined;
  /** Called with the new first day whenever the strip pages (arrows, keyboard, jumping to a day). */
  onStartChange?: ((start: Temporal.PlainDate) => void) | undefined;
  /** Called with the day the user selects. */
  onValueChange?: ((day: Temporal.PlainDate) => void) | undefined;
  /** Show Saturdays and Sundays; when `false` they're skipped. @defaultValue `calendar.showWeekends`, else true */
  showWeekends?: boolean | undefined;
  /** The first day shown (controlled). Pair it with `onStartChange`. */
  start?: Temporal.PlainDate | undefined;
  /** How far the previous/next arrows move: a whole `"page"` of days, or one `"day"`. @defaultValue "page" */
  step?: StripStep | undefined;
  /** IANA time zone that decides which day is today. @defaultValue `calendar.timeZone`, else the viewer's system time zone */
  timeZone?: string | undefined;
  /** The selected day (controlled), or `null` for none. Pair it with `onValueChange`. */
  value?: Temporal.PlainDate | null | undefined;
  /** First day of the week, for `align: "week"`. @defaultValue `calendar.weekStart`, else "monday" */
  weekStart?: WeekStart | undefined;
};

/** The mini calendar's state and actions, as returned by {@link useMiniCalendar}. */
export type MiniCalendarState = {
  /** Whether the strip can page forward without passing `maxDate`. */
  canGoNext: boolean;
  /** Whether the strip can page back without passing `minDate`. */
  canGoPrevious: boolean;
  /** The days shown, in order; empty while unknown (server rendering without `value` or `start`). */
  days: Temporal.PlainDate[];
  /** Pages the strip forward by `step`. */
  goToNext: () => void;
  /** Pages the strip back by `step`. */
  goToPrevious: () => void;
  /** Whether `day` can't be selected (outside `minDate`/`maxDate`, or `isDayDisabled` returns `true`). */
  isDayDisabled: (day: Temporal.PlainDate) => boolean;
  /** Selects `day`, unless it's disabled. */
  select: (day: Temporal.PlainDate) => void;
  /** The selected day, or `null` for none. */
  selected: Temporal.PlainDate | null;
  /** Moves the strip to show `day`, lined up by `align`. */
  showDay: (day: Temporal.PlainDate) => void;
  /** Whether Saturdays and Sundays are shown. */
  showWeekends: boolean;
  /** The first day shown; `null` while unknown. */
  start: Temporal.PlainDate | null;
  /** The start the strip would have after paging `direction` by `step` (or a whole page), or `null` while unknown. */
  startAfter: (
    direction: -1 | 1,
    step?: StripStep,
  ) => Temporal.PlainDate | null;
  /** Sets the first day shown. */
  setStart: (start: Temporal.PlainDate) => void;
  /** How far the arrows move. */
  step: StripStep;
  /** Today in the strip's time zone; `null` during server rendering. */
  today: Temporal.PlainDate | null;
};

/**
 * Headless state for a horizontal day strip: the days shown, the selected day and the paging actions. `MiniCalendar`
 * is built on it; use it directly to draw your own strip.
 *
 * @example
 * const strip = useMiniCalendar({ days: 5, align: "center", onValueChange: setDay });
 * strip.days.map((day) => <button onClick={() => strip.select(day)}>{day.day}</button>);
 */
export const useMiniCalendar = (
  options: UseMiniCalendarOptions = {},
): MiniCalendarState => {
  const {
    align = "week",
    calendar,
    defaultStart,
    defaultValue = null,
    maxDate,
    minDate,
    onRangeChange,
    onStartChange,
    onValueChange,
    start: controlledStart,
    step = "page",
    value: controlledValue,
  } = options;
  const count = Math.max(1, Math.trunc(options.days ?? 7));
  const showWeekends = options.showWeekends ?? calendar?.showWeekends ?? true;
  const weekStart = options.weekStart ?? calendar?.weekStart ?? "monday";
  const systemTimeZone = useSystemTimeZone();
  const today = useToday(
    options.timeZone ?? calendar?.timeZone ?? systemTimeZone,
  );

  const [uncontrolledValue, setUncontrolledValue] =
    useState<Temporal.PlainDate | null>(defaultValue);
  // Null lines the strip up around the selected day (or today) again, so it follows them until the user pages.
  const [uncontrolledStart, setUncontrolledStart] =
    useState<Temporal.PlainDate | null>(defaultStart ?? null);

  const selected =
    controlledValue !== undefined
      ? controlledValue
      : calendar !== undefined
        ? calendar.date
        : uncontrolledValue;
  const stripOptions = {
    showWeekends,
  };
  const lineUp = (day: Temporal.PlainDate) =>
    stripStart(day, count, {
      align,
      showWeekends,
      weekStart,
    });
  const anchor = selected ?? today;
  const start =
    controlledStart ??
    uncontrolledStart ??
    (anchor === null ? null : lineUp(anchor));
  const days = start === null ? [] : stripDays(start, count, stripOptions);
  const isShown = (day: Temporal.PlainDate) =>
    days.some((shown) => shown.equals(day));

  // A selection made outside the strip (controlled `value`, the full calendar) jumps the strip to it.
  const selectedKey = selected?.toString() ?? null;
  const [seenSelected, setSeenSelected] = useState(selectedKey);
  if (seenSelected !== selectedKey) {
    setSeenSelected(selectedKey);
    if (selected !== null && uncontrolledStart !== null && !isShown(selected))
      setUncontrolledStart(null);
  }

  const setStart = (next: Temporal.PlainDate) => {
    if (controlledStart === undefined) setUncontrolledStart(next);
    onStartChange?.(next);
  };

  const first = days[0];
  const last = days[days.length - 1];
  const canGoPrevious =
    first !== undefined &&
    (minDate === undefined ||
      Temporal.PlainDate.compare(
        addStripDays(first, -1, stripOptions),
        minDate,
      ) >= 0);
  const canGoNext =
    last !== undefined &&
    (maxDate === undefined ||
      Temporal.PlainDate.compare(
        addStripDays(last, 1, stripOptions),
        maxDate,
      ) <= 0);
  const startAfter = (direction: -1 | 1, by: StripStep = step) =>
    start === null
      ? null
      : shiftStrip(start, count, direction, {
          showWeekends,
          step: by,
        });
  const page = (direction: -1 | 1) => {
    const next = startAfter(direction);
    if (next !== null && (direction === 1 ? canGoNext : canGoPrevious))
      setStart(next);
  };

  const isDayDisabled = (day: Temporal.PlainDate) =>
    !isDayInRange(day, {
      max: maxDate,
      min: minDate,
    }) || options.isDayDisabled?.(day) === true;

  const select = (day: Temporal.PlainDate) => {
    if (isDayDisabled(day)) return;
    // Pin the strip where it is, so picking a day never re-lines it up (e.g. re-centers it) under the pointer.
    if (
      controlledStart === undefined &&
      uncontrolledStart === null &&
      start !== null
    )
      setUncontrolledStart(start);
    if (controlledValue === undefined && calendar === undefined)
      setUncontrolledValue(day);
    onValueChange?.(day);
    calendar?.goToDate(day);
  };

  // Report the days shown after render, once per change (compared as text, not by object identity).
  const onRangeChangeRef = useRef(onRangeChange);
  onRangeChangeRef.current = onRangeChange;
  const firstKey = first?.toString();
  const lastKey = last?.toString();
  useEffect(() => {
    if (firstKey !== undefined && lastKey !== undefined)
      onRangeChangeRef.current?.(
        Temporal.PlainDate.from(firstKey),
        Temporal.PlainDate.from(lastKey),
      );
  }, [
    firstKey,
    lastKey,
  ]);

  return {
    canGoNext,
    canGoPrevious,
    days,
    goToNext: () => page(1),
    goToPrevious: () => page(-1),
    isDayDisabled,
    select,
    selected,
    setStart,
    showDay: (day) => setStart(lineUp(day)),
    showWeekends,
    start,
    startAfter,
    step,
    today,
  };
};
