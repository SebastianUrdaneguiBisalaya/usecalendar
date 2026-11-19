import {
  addStripDays,
  type CalendarHotkeys,
  hotkeyActionFor,
  nextStripFocus,
  resolveKeymap,
  type StripStep,
} from "@usecalendar/core";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useCalendarKeymap } from "../hotkeys/keymap-context.js";
import { isMacPlatform } from "../hotkeys/platform.js";
import type { CalendarFormatters } from "../locale/formatters.js";
import type { CalendarLabelsInput } from "../locale/labels.js";
import { useCalendarLocale } from "../locale/locale-context.js";
import { Chevron } from "../utils/chevron.js";
import { cn } from "../utils/cn.js";
import { useElementWidth } from "../utils/use-element-width.js";
import {
  type UseMiniCalendarOptions,
  useMiniCalendar,
} from "./use-mini-calendar.js";

/** Class names for each part of a {@link MiniCalendar}, merged after the defaults so they win. */
export type MiniCalendarClassNames = {
  /** A day. It exposes `data-day` (the ISO date) and `data-today`, `data-selected`, `data-disabled`. */
  day?: string | undefined;
  /** The number of a day, e.g. `"23"`. */
  dayNumber?: string | undefined;
  /** The row of days (the listbox). */
  days?: string | undefined;
  /** Added to disabled days. */
  disabled?: string | undefined;
  /** The month above a day's number, e.g. `"Nov"`. */
  month?: string | undefined;
  /** The button that shows the next days. */
  next?: string | undefined;
  /** The button that shows the previous days. */
  previous?: string | undefined;
  /** The outer element. */
  root?: string | undefined;
  /** Added to the selected day. */
  selected?: string | undefined;
  /** Added to today. */
  today?: string | undefined;
};

/** What `renderDay` gets for each day of a {@link MiniCalendar}. */
export type MiniCalendarDayRenderProps = {
  /** The day. */
  day: Temporal.PlainDate;
  /** The formatted day number, e.g. `"23"`. */
  dayNumber: string;
  /** The default content (month and day number), to wrap or add to, e.g. with an event dot below. */
  defaultContent: ReactNode;
  /** Whether the day can't be selected. */
  isDisabled: boolean;
  /** Whether the day is selected. */
  isSelected: boolean;
  /** Whether the day is today. */
  isToday: boolean;
  /** The formatted month, e.g. `"Nov"`. */
  month: string;
};

/** Props of {@link MiniCalendar}. */
export type MiniCalendarProps = Omit<UseMiniCalendarOptions, "days"> & {
  /** Extra classes for the root element, merged after the defaults. */
  className?: string | undefined;
  /** Extra classes per part. */
  classNames?: MiniCalendarClassNames | undefined;
  /**
   * Number of days shown at once, or `"auto"` to fit as many as the width allows (each at least `minDayWidth`).
   * `"auto"` measures after mounting, so server rendering and the first paint show 7.
   *
   * @defaultValue 7
   */
  days?: number | "auto" | undefined;
  /** Partial overrides for the dates shown (`monthShort`, `dayNumber`, `fullDate`), on top of any `CalendarLocaleProvider`. */
  formatters?: Partial<CalendarFormatters> | undefined;
  /**
   * The strip's own shortcuts: `true` for the defaults, `false` to turn them off, or per-action overrides, in the
   * same format as `<Calendar hotkeys>`. The strip reads `openFocused` (select the focused day, Enter/Space),
   * `previous`/`next` (page, k/j) and `goToToday` (show and focus today, t). Arrows, Home/End and PageUp/PageDown
   * always move focus.
   *
   * @defaultValue the nearest `CalendarKeymapProvider`'s (`<Calendar>`'s) shortcuts, else the defaults
   */
  hotkeys?: CalendarHotkeys | undefined;
  /** Partial overrides for the strip's text (`miniCalendar`, `previousDays`, `nextDays`), on top of any `CalendarLocaleProvider`. */
  labels?: CalendarLabelsInput | undefined;
  /** BCP 47 locale for the dates shown, e.g. `"es-PE"`. @defaultValue the `CalendarLocaleProvider`'s, else "en-US" */
  locale?: string | undefined;
  /** Minimum width of a day in pixels, gap included, for `days="auto"`. @defaultValue 48 */
  minDayWidth?: number | undefined;
  /** Draws a day's content inside its cell (the cell keeps its role, state and keyboard handling). */
  renderDay?: ((props: MiniCalendarDayRenderProps) => ReactNode) | undefined;
};

const STRIP_ACTIONS = [
  "openFocused",
  "previous",
  "next",
  "goToToday",
] as const;

const DEFAULT_DAYS = 7;

const ARROW =
  "m-0 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-uc border-0 bg-transparent p-0 text-uc-foreground outline-none hover:bg-uc-accent hover:text-uc-accent-foreground focus-visible:ring-2 focus-visible:ring-uc-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-uc-foreground";

/**
 * A horizontal strip of days with previous/next arrows: today is highlighted softly and the selected day is filled.
 * Pass `calendar` (from `useCalendar`) to keep it in sync with a full `<Calendar>`.
 *
 * @example
 * const [day, setDay] = useState(Temporal.Now.plainDateISO());
 * <MiniCalendar value={day} onValueChange={setDay} days="auto" />
 */
export function MiniCalendar({
  className,
  classNames,
  days: daysProp = DEFAULT_DAYS,
  formatters: formattersProp,
  hotkeys,
  labels: labelsProp,
  locale: localeProp,
  minDayWidth = 48,
  renderDay,
  ...options
}: MiniCalendarProps) {
  const { ref: daysRef, width } = useElementWidth<HTMLDivElement>();
  const count =
    daysProp === "auto"
      ? width > 0
        ? Math.max(1, Math.floor(width / Math.max(1, minDayWidth)))
        : DEFAULT_DAYS
      : daysProp;
  const strip = useMiniCalendar({
    ...options,
    days: count,
  });
  const { days, selected, today } = strip;

  const parent = useCalendarLocale();
  const formatters =
    formattersProp === undefined
      ? parent.formatters
      : {
          ...parent.formatters,
          ...formattersProp,
        };
  const labels =
    labelsProp === undefined
      ? parent.labels
      : {
          ...parent.labels,
          ...labelsProp,
          views: {
            ...parent.labels.views,
            ...labelsProp.views,
          },
        };
  const context = {
    locale: localeProp ?? parent.locale,
    timeFormat: parent.timeFormat,
    timeZone: options.timeZone ?? options.calendar?.timeZone ?? "UTC",
  };

  const parentKeymap = useCalendarKeymap().keymap;
  const keymap = useMemo(
    () => (hotkeys === undefined ? parentKeymap : resolveKeymap(hotkeys)),
    [
      hotkeys,
      parentKeymap,
    ],
  );

  const id = useId();
  const dayId = (day: Temporal.PlainDate) => `${id}-${day.toString()}`;
  const [focused, setFocused] = useState<string | null>(null);
  // A day to focus once the strip has paged to it.
  const pendingFocus = useRef<string | null>(null);
  useEffect(() => {
    if (pendingFocus.current === null) return;
    const element = document.getElementById(pendingFocus.current);
    if (element !== null) {
      element.focus();
      pendingFocus.current = null;
    }
  });

  const shownKey = (day: Temporal.PlainDate | null) =>
    day !== null && days.some((shown) => shown.equals(day))
      ? day.toString()
      : null;
  // The tab stop: the day last focused, else the selected day, else today, else the first day shown.
  const activeKey =
    (focused !== null && days.some((day) => day.toString() === focused)
      ? focused
      : null) ??
    shownKey(selected) ??
    shownKey(today) ??
    days[0]?.toString();

  const focusDay = (day: Temporal.PlainDate) => {
    setFocused(day.toString());
    const element = document.getElementById(dayId(day));
    if (element !== null && days.some((shown) => shown.equals(day)))
      element.focus();
    else pendingFocus.current = dayId(day);
  };

  /** Pages the strip and focuses the day at `index` of the new page. */
  const pageTo = (direction: -1 | 1, step: StripStep, index: number) => {
    if (!(direction === 1 ? strip.canGoNext : strip.canGoPrevious)) return;
    const start = strip.startAfter(direction, step);
    if (start === null) return;
    strip.setStart(start);
    focusDay(
      addStripDays(start, index, {
        showWeekends: strip.showWeekends,
      }),
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!(event.target instanceof HTMLElement)) return;
    const key = event.target.getAttribute("data-day");
    const index = days.findIndex((day) => day.toString() === key);
    const day = days[index];
    if (day === undefined) return;

    if (!event.altKey && !event.ctrlKey && !event.metaKey) {
      const next = nextStripFocus(index, event.key, days.length, strip.step);
      if (next !== null) {
        event.preventDefault();
        if (next.shift === null) {
          const target = days[next.index];
          if (target !== undefined) focusDay(target);
        } else pageTo(next.shift.direction, next.shift.step, next.index);
        return;
      }
    }

    const action = hotkeyActionFor(
      event,
      keymap,
      isMacPlatform(),
      STRIP_ACTIONS,
    );
    if (action === null) return;
    event.preventDefault();
    switch (action) {
      case "openFocused":
        strip.select(day);
        return;
      case "previous":
      case "next":
        pageTo(action === "next" ? 1 : -1, strip.step, index);
        return;
      case "goToToday":
        if (today === null) return;
        if (shownKey(today) === null) strip.showDay(today);
        focusDay(today);
        return;
    }
  };

  return (
    <div
      className={cn(
        "flex w-full min-w-0 items-center gap-1 bg-uc-background text-uc-foreground",
        classNames?.root,
        className,
      )}
    >
      <button
        aria-label={labels.previousDays}
        className={cn(ARROW, classNames?.previous)}
        disabled={!strip.canGoPrevious}
        onClick={strip.goToPrevious}
        title={labels.previousDays}
        type="button"
      >
        <Chevron direction="left" />
      </button>
      <div
        aria-label={labels.miniCalendar}
        aria-orientation="horizontal"
        className={cn("flex min-w-0 flex-1 gap-1", classNames?.days)}
        onKeyDown={onKeyDown}
        ref={daysRef}
        role="listbox"
        tabIndex={days.length === 0 ? 0 : undefined}
      >
        {days.map((day) => {
          const key = day.toString();
          const isToday = today?.equals(day) === true;
          const isSelected = selected?.equals(day) === true;
          const isDisabled = strip.isDayDisabled(day);
          const month = formatters.monthShort(day, context);
          const dayNumber = formatters.dayNumber(day, context);
          const defaultContent = (
            <>
              <span
                className={cn(
                  "max-w-full truncate text-uc-muted-foreground text-xs leading-4",
                  isSelected && "text-uc-primary-foreground",
                  classNames?.month,
                )}
              >
                {month}
              </span>
              <span
                className={cn(
                  "font-semibold text-sm tabular-nums leading-5",
                  classNames?.dayNumber,
                )}
              >
                {dayNumber}
              </span>
            </>
          );
          return (
            // biome-ignore lint/a11y/useKeyWithClickEvents: the listbox's onKeyDown handles Enter/Space on the focused day.
            <div
              aria-current={isToday ? "date" : undefined}
              aria-disabled={isDisabled || undefined}
              aria-label={formatters.fullDate(day, context)}
              aria-selected={isSelected}
              className={cn(
                "flex min-w-0 flex-1 cursor-pointer select-none flex-col items-center justify-center gap-0.5 rounded-uc border border-transparent border-solid px-1 py-1.5 text-uc-foreground outline-none hover:bg-uc-accent hover:text-uc-accent-foreground focus-visible:ring-2 focus-visible:ring-uc-ring",
                classNames?.day,
                isToday && "border-uc-border bg-uc-muted",
                isToday && classNames?.today,
                isSelected &&
                  "border-uc-primary bg-uc-primary text-uc-primary-foreground hover:bg-uc-primary hover:text-uc-primary-foreground",
                isSelected && classNames?.selected,
                isDisabled &&
                  "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-uc-foreground",
                isDisabled && classNames?.disabled,
              )}
              data-day={key}
              data-disabled={isDisabled || undefined}
              data-selected={isSelected || undefined}
              data-today={isToday || undefined}
              id={dayId(day)}
              key={key}
              onClick={() => {
                setFocused(key);
                strip.select(day);
              }}
              onFocus={() => setFocused(key)}
              role="option"
              tabIndex={key === activeKey ? 0 : -1}
            >
              {renderDay === undefined
                ? defaultContent
                : renderDay({
                    day,
                    dayNumber,
                    defaultContent,
                    isDisabled,
                    isSelected,
                    isToday,
                    month,
                  })}
            </div>
          );
        })}
      </div>
      <button
        aria-label={labels.nextDays}
        className={cn(ARROW, classNames?.next)}
        disabled={!strip.canGoNext}
        onClick={strip.goToNext}
        title={labels.nextDays}
        type="button"
      >
        <Chevron direction="right" />
      </button>
    </div>
  );
}
