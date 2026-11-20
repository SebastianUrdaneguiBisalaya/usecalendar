import type { CalendarHotkeys } from "@usecalendar/core";
import { type CSSProperties, type ReactNode, useRef } from "react";
import { CalendarKeymapProvider } from "../hotkeys/keymap-context.js";
import {
  type CalendarHotkeyHandlers,
  type CalendarHotkeysScope,
  useCalendarHotkeys,
} from "../hotkeys/use-calendar-hotkeys.js";
import {
  type CalendarLocaleOptions,
  CalendarLocaleProvider,
} from "../locale/locale-context.js";
import {
  MonthView,
  type MonthViewClassNames,
  type MonthViewProps,
} from "../month/month-view.js";
import {
  TimeGridView,
  type TimeGridViewClassNames,
  type TimeGridViewProps,
} from "../time-grid/time-grid-view.js";
import { cn } from "../utils/cn.js";
import { CalendarProvider } from "./calendar-context.js";
import {
  CalendarToolbar,
  type CalendarToolbarClassNames,
} from "./calendar-toolbar.js";
import {
  type CalendarState,
  type UseCalendarOptions,
  useCalendar,
} from "./use-calendar.js";

/** Class names for each part of a {@link Calendar}, merged after the defaults so they win. */
export type CalendarClassNames = {
  /** Parts of the month view. */
  month?: MonthViewClassNames | undefined;
  /** The outer element. */
  root?: string | undefined;
  /** Parts of the day and week views. */
  timeGrid?: TimeGridViewClassNames | undefined;
  /** Parts of the default toolbar. */
  toolbar?: CalendarToolbarClassNames | undefined;
  /** The element holding the current view, under the toolbar. */
  view?: string | undefined;
};

/** Props of {@link Calendar}. */
export type CalendarProps<TData = unknown> = UseCalendarOptions &
  CalendarLocaleOptions &
  Pick<MonthViewProps<TData>, "onDayClick" | "renderMorePopover"> &
  Omit<TimeGridViewProps<TData>, "className" | "classNames"> & {
    /**
     * State from your own {@link useCalendar} call, to drive the calendar from outside (e.g. a date picker in a
     * sidebar). When given, the navigation options (`date`, `view`, `weekStart`, `onRangeChange`, …) passed here are
     * ignored: pass them to `useCalendar` instead.
     */
    calendar?: CalendarState | undefined;
    /** Extra classes for the root element, merged after the defaults. */
    className?: string | undefined;
    /** Extra classes per part, including each view's own parts. */
    classNames?: CalendarClassNames | undefined;
    /**
     * Handlers for the global shortcuts, merged over the navigation defaults (today, next, previous, views).
     * `goToDate`, `newEvent`, `deleteEvent` and `close` only fire when given a handler.
     *
     * @example
     * hotkeyHandlers={{ newEvent: () => openEventForm(), goToDate: () => openDatePicker() }}
     */
    hotkeyHandlers?: CalendarHotkeyHandlers | undefined;
    /**
     * Keyboard shortcuts: `true` for tempi's keymap (`CALENDAR_KEYMAP`), `false` to turn them off, or per-action
     * overrides. Applies to the global shortcuts and to the grids' (Enter, Alt+arrows, …).
     *
     * @defaultValue true
     */
    hotkeys?: CalendarHotkeys | undefined;
    /**
     * Where the global shortcuts listen: `"document"` (anywhere on the page) or `"calendar"` (only while focus is
     * inside it).
     *
     * @defaultValue "document"
     */
    hotkeysScope?: CalendarHotkeysScope | undefined;
    /** Draws one event in the month view, replacing the default `EventChip`; see `MonthView`'s `renderEvent`. */
    renderMonthEvent?: MonthViewProps<TData>["renderEvent"];
    /** Inline styles for the root element, e.g. a fixed height or `--uc-*` token overrides. */
    style?: CSSProperties | undefined;
    /**
     * The header above the view: `true` for the default `CalendarToolbar`, `false` for none, or a function returning
     * your own (it receives the calendar's state; `CalendarToolbar` and `useCalendarContext` work inside it).
     *
     * @defaultValue true
     */
    toolbar?: boolean | ((calendar: CalendarState) => ReactNode) | undefined;
  };

/**
 * A complete Google Calendar-style calendar: toolbar, and the month, week or day view for the current `view`. It
 * draws the `events` you pass and reports every user intent through callbacks; it never stores or changes events.
 *
 * Every navigation option is controlled or uncontrolled (`view`/`defaultView`, `date`/`defaultDate`); use
 * `onRangeChange` to fetch the events of the visible range. Keyboard shortcuts are on by default (`hotkeys`).
 *
 * The parts are exported too, to compose your own layout: `useCalendar` + `CalendarProvider` + `MonthView` /
 * `TimeGridView` / `CalendarToolbar`, with `CalendarLocaleProvider`, `CalendarKeymapProvider` and
 * `useCalendarHotkeys`.
 *
 * @example
 * <Calendar
 *   events={events}
 *   defaultView="week"
 *   onRangeChange={(range) => fetchEvents(range)}
 *   onEventClick={(event) => openEditor(event.data)}
 *   onSlotClick={(range) => createEvent(range)}
 *   onEventChange={(event, range) => saveTimes(event.id, range)}
 * />
 */
export function Calendar<TData = unknown>(props: CalendarProps<TData>) {
  const {
    allDayCollapsed,
    calendar: external,
    className,
    classNames,
    date,
    defaultAllDayCollapsed,
    defaultDate,
    defaultEventDuration,
    defaultView,
    draftRange,
    editable,
    eventPopover,
    events,
    formatters,
    hotkeyHandlers,
    hotkeys,
    hotkeysScope,
    hourHeight,
    isEventEditable,
    labels,
    locale,
    onAllDayCollapsedChange,
    onDateChange,
    onDayClick,
    onEventChange,
    onEventClick,
    onRangeChange,
    onRangeSelect,
    onSlotClick,
    onViewChange,
    renderAllDayEvent,
    renderEvent,
    renderEventPopover,
    renderEventWrapper,
    renderMonthEvent,
    renderMorePopover,
    scrollToTime,
    selectedEventId,
    showWeekends,
    showWeekNumbers,
    slotMinutes,
    snapMinutes,
    style,
    timeFormat,
    timeZone,
    toolbar = true,
    view,
    weekStart,
  } = props;
  // Hooks run unconditionally; with an external state, this one only idles (it has no callbacks to call).
  const internal = useCalendar(
    external === undefined
      ? {
          date,
          defaultDate,
          defaultView,
          onDateChange,
          onRangeChange,
          onViewChange,
          showWeekends,
          showWeekNumbers,
          timeZone,
          view,
          weekStart,
        }
      : {},
  );
  const calendar = external ?? internal;
  const root = useRef<HTMLDivElement>(null);
  useCalendarHotkeys({
    calendar,
    handlers: hotkeyHandlers,
    hotkeys,
    scope: hotkeysScope,
    target: root,
  });

  return (
    <CalendarProvider calendar={calendar}>
      <CalendarLocaleProvider
        formatters={formatters}
        labels={labels}
        locale={locale}
        timeFormat={timeFormat}
      >
        <CalendarKeymapProvider hotkeys={hotkeys}>
          <div
            className={cn(
              "flex h-full min-h-0 flex-col bg-uc-background text-uc-foreground",
              classNames?.root,
              className,
            )}
            data-uc-calendar=""
            data-view={calendar.view}
            ref={root}
            style={style}
          >
            {toolbar === true ? (
              <CalendarToolbar classNames={classNames?.toolbar} />
            ) : toolbar === false ? null : (
              toolbar(calendar)
            )}
            <div className={cn("min-h-0 flex-1", classNames?.view)}>
              {calendar.view === "month" ? (
                <MonthView
                  classNames={classNames?.month}
                  eventPopover={eventPopover}
                  events={events}
                  onDayClick={onDayClick}
                  onEventClick={onEventClick}
                  renderEvent={renderMonthEvent}
                  renderEventPopover={renderEventPopover}
                  renderEventWrapper={renderEventWrapper}
                  renderMorePopover={renderMorePopover}
                />
              ) : (
                <TimeGridView
                  allDayCollapsed={allDayCollapsed}
                  classNames={classNames?.timeGrid}
                  defaultAllDayCollapsed={defaultAllDayCollapsed}
                  defaultEventDuration={defaultEventDuration}
                  draftRange={draftRange}
                  editable={editable}
                  eventPopover={eventPopover}
                  events={events}
                  hourHeight={hourHeight}
                  isEventEditable={isEventEditable}
                  onAllDayCollapsedChange={onAllDayCollapsedChange}
                  onEventChange={onEventChange}
                  onEventClick={onEventClick}
                  onRangeSelect={onRangeSelect}
                  onSlotClick={onSlotClick}
                  renderAllDayEvent={renderAllDayEvent}
                  renderEvent={renderEvent}
                  renderEventPopover={renderEventPopover}
                  renderEventWrapper={renderEventWrapper}
                  scrollToTime={scrollToTime}
                  selectedEventId={selectedEventId}
                  slotMinutes={slotMinutes}
                  snapMinutes={snapMinutes}
                />
              )}
            </div>
          </div>
        </CalendarKeymapProvider>
      </CalendarLocaleProvider>
    </CalendarProvider>
  );
}
