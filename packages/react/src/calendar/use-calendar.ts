import {
  type CalendarView,
  type DateRange,
  shiftDate,
  visibleDays,
  visibleRange,
  type WeekStart,
} from "@usecalendar/core";
import { useEffect, useRef, useState } from "react";
import { useSystemTimeZone } from "../clock/use-system-time-zone.js";
import { useToday } from "../clock/use-today.js";

/** Options of {@link useCalendar}. Every option is optional; stateful ones come controlled and uncontrolled. */
export type UseCalendarOptions = {
  /**
   * The day the view is anchored on (controlled). Pair it with `onDateChange`.
   * Leave it out to let the calendar keep its own date, which follows today until the user navigates away.
   */
  date?: Temporal.PlainDate | undefined;
  /** The initial anchor day when uncontrolled. @defaultValue today */
  defaultDate?: Temporal.PlainDate | undefined;
  /** The initial view when uncontrolled. @defaultValue "week" */
  defaultView?: CalendarView | undefined;
  /** Called with the new anchor day whenever navigation changes it (next, previous, today, a picked day). */
  onDateChange?: ((date: Temporal.PlainDate) => void) | undefined;
  /**
   * Called with the UTC range the current view draws, whenever it changes: use it to fetch the events to show.
   * Not called during server rendering (today is unknown until the client hydrates, unless `date` is given).
   */
  onRangeChange?: ((range: DateRange, view: CalendarView) => void) | undefined;
  /** Called whenever the view changes. */
  onViewChange?: ((view: CalendarView) => void) | undefined;
  /** Show week numbers in the month view. @defaultValue false */
  showWeekNumbers?: boolean | undefined;
  /** Show Saturdays and Sundays in the week and month views (the day view always shows its day). @defaultValue true */
  showWeekends?: boolean | undefined;
  /** IANA time zone every day and time is shown in. @defaultValue the viewer's system time zone */
  timeZone?: string | undefined;
  /** The view to show (controlled). Pair it with `onViewChange`. */
  view?: CalendarView | undefined;
  /** First day of the week. @defaultValue "monday" */
  weekStart?: WeekStart | undefined;
};

/** The calendar's navigation state and actions, as returned by {@link useCalendar}. */
export type CalendarState = {
  /** The day the view is anchored on; `null` during server rendering when not controlled (today isn't known yet). */
  date: Temporal.PlainDate | null;
  /** Every day of the current view in order (day: 1, week: 7, month: the month's days); `null` while `date` is. */
  days: Temporal.PlainDate[] | null;
  /** Anchors the view on `day`, e.g. a day picked in a date picker. */
  goToDate: (day: Temporal.PlainDate) => void;
  /** Moves one day, week or month forward. */
  goToNext: () => void;
  /** Moves one day, week or month back. */
  goToPrevious: () => void;
  /** Goes back to today. */
  goToToday: () => void;
  /** The UTC range the current view draws (whole weeks for the month view); `null` while `date` is. */
  range: DateRange | null;
  /** Switches the view. */
  setView: (view: CalendarView) => void;
  showWeekends: boolean;
  showWeekNumbers: boolean;
  /** IANA time zone every day and time is shown in. */
  timeZone: string;
  /** Today in `timeZone`; `null` during server rendering. */
  today: Temporal.PlainDate | null;
  view: CalendarView;
  weekStart: WeekStart;
};

/**
 * Headless navigation state for a calendar: the anchored day, the view, the visible days and range, and the
 * actions that change them. Pass the result to `<Calendar calendar={…}>` (or a `CalendarProvider`) to share it
 * with the views, or bind the actions to your own buttons and keyboard shortcuts.
 *
 * @example
 * const calendar = useCalendar({ defaultView: "month", onRangeChange: (range) => fetchEvents(range) });
 * <button onClick={calendar.goToToday}>Today</button>
 */
export const useCalendar = (
  options: UseCalendarOptions = {},
): CalendarState => {
  const {
    date: controlledDate,
    defaultDate,
    defaultView = "week",
    onDateChange,
    onRangeChange,
    onViewChange,
    showWeekends = true,
    showWeekNumbers = false,
    view: controlledView,
    weekStart = "monday",
  } = options;
  const systemTimeZone = useSystemTimeZone();
  const timeZone = options.timeZone ?? systemTimeZone;
  const today = useToday(timeZone);

  // Null follows today, so the calendar moves with the clock until the user navigates away.
  const [anchor, setAnchor] = useState<Temporal.PlainDate | null>(
    defaultDate ?? null,
  );
  const [uncontrolledView, setUncontrolledView] =
    useState<CalendarView>(defaultView);
  const date = controlledDate ?? anchor ?? today;
  const view = controlledView ?? uncontrolledView;

  const changeDate = (next: Temporal.PlainDate | null) => {
    if (controlledDate === undefined) setAnchor(next);
    onDateChange?.(next ?? today ?? Temporal.Now.plainDateISO(timeZone));
  };
  const step = (direction: -1 | 1) =>
    changeDate(
      shiftDate(date ?? Temporal.Now.plainDateISO(timeZone), view, direction),
    );

  const range =
    date === null ? null : visibleRange(date, view, weekStart, timeZone);

  // Report the visible range after render, once per change (compared by its bounds, not object identity).
  // The latest callback is read from a ref, so a new inline callback doesn't re-fire it.
  const onRangeChangeRef = useRef(onRangeChange);
  onRangeChangeRef.current = onRangeChange;
  const rangeStart = range?.start;
  const rangeEnd = range?.end;
  useEffect(() => {
    if (rangeStart !== undefined && rangeEnd !== undefined)
      onRangeChangeRef.current?.(
        {
          end: rangeEnd,
          start: rangeStart,
        },
        view,
      );
  }, [
    rangeStart,
    rangeEnd,
    view,
  ]);

  return {
    date,
    days: date === null ? null : visibleDays(date, view, weekStart),
    goToDate: changeDate,
    goToNext: () => step(1),
    goToPrevious: () => step(-1),
    goToToday: () => changeDate(null),
    range,
    setView: (next) => {
      if (controlledView === undefined) setUncontrolledView(next);
      onViewChange?.(next);
    },
    showWeekends,
    showWeekNumbers,
    timeZone,
    today,
    view,
    weekStart,
  };
};
