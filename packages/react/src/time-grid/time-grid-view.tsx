import {
  ariaKeyShortcut,
  belongsInAllDayLane,
  type CalendarEvent,
  type DayEvents,
  type DaySegment,
  fitWeek,
  focusKey,
  type GridFocus,
  type GridHotkeyAction,
  isWeekend,
  isWorkingTime,
  layoutDay,
  layoutWeek,
  moveRange,
  nextFocus,
  rangeAt,
  resizeRange,
  SLOT_MINUTES,
  SNAP_MINUTES,
  type TimeRange,
  visibleDays,
  type WeekSegment,
  type WorkingHours,
  wallTime,
} from "@usecalendar/core";
import {
  type ComponentPropsWithRef,
  type FocusEvent,
  Fragment,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useCalendarContext } from "../calendar/calendar-context.js";
import { useNow } from "../clock/use-now.js";
import { EventBlock, type EventBlockProps } from "../events/event-block.js";
import type { EventChipProps } from "../events/event-chip.js";
import {
  type EventPopoverClassNames,
  type EventPopoverOptions,
  type EventPopoverTriggerProps,
  useEventPopover,
} from "../events/event-popover.js";
import { eventLook } from "../events/event-style.js";
import type { RenderEventWrapperProps } from "../events/render-event-wrapper.js";
import { useCalendarKeymap } from "../hotkeys/keymap-context.js";
import { useIsMac } from "../hotkeys/platform.js";
import { useEventKeyboardHint } from "../hotkeys/use-event-keyboard-hint.js";
import {
  type CalendarLocale,
  useCalendarLocale,
} from "../locale/locale-context.js";
import { cn } from "../utils/cn.js";
import { composeHandlers, mergeRefs } from "../utils/merge-props.js";
import { AllDayLane, AllDayToggle } from "./all-day-lane.js";
import { CurrentTimeLine } from "./current-time-line.js";
import {
  ALL_DAY_LANE_REM,
  attributeValue,
  boxStyle,
  DAY_HEADER_REM,
  type EventSizing,
  eventSizing,
  GUTTER_REM,
  gridStyle,
  HOUR_HEIGHT_REM,
  hourHeightRem,
  slotsPerDay,
} from "./grid-geometry.js";
import { useTimeGridDrag } from "./use-time-grid-drag.js";

/** Rows the all-day lane keeps when collapsed. */
const COLLAPSED_LANES = 2;

/** The grid actions that move or resize the focused event. */
const EDIT_ACTIONS = [
  "moveEventUp",
  "moveEventDown",
  "moveEventToPreviousDay",
  "moveEventToNextDay",
  "shortenEvent",
  "extendEvent",
] as const satisfies readonly GridHotkeyAction[];
type EditAction = (typeof EDIT_ACTIONS)[number];
const isEditAction = (action: GridHotkeyAction | null): action is EditAction =>
  EDIT_ACTIONS.some((edit) => edit === action);

/** New times for a keyboard edit: moves by one snap step or one day, resizes by one snap step. */
const rescheduleBy = (
  action: EditAction,
  event: TimeRange,
  timeZone: string,
  snapMinutes: number,
): TimeRange => {
  const move = (days: number, minutes: number) =>
    moveRange(
      event,
      {
        days,
        minutes,
      },
      timeZone,
      snapMinutes,
    );
  const resize = (minutes: number) =>
    resizeRange(
      event,
      Temporal.Instant.from(event.endAt).toZonedDateTimeISO(timeZone).add({
        minutes,
      }),
      snapMinutes,
    );
  switch (action) {
    case "moveEventUp":
      return move(0, -snapMinutes);
    case "moveEventDown":
      return move(0, snapMinutes);
    case "moveEventToPreviousDay":
      return move(-1, 0);
    case "moveEventToNextDay":
      return move(1, 0);
    case "shortenEvent":
      return resize(-snapMinutes);
    case "extendEvent":
      return resize(snapMinutes);
  }
};

/** Reads a `focusKey` back. Event ids may contain `:` themselves. */
const parseFocusKey = (key: string): GridFocus => {
  const [day, slot, ...eventId] = key.split(":");
  return {
    day: Number(day),
    eventId: eventId.length === 0 ? null : eventId.join(":"),
    slot: Number(slot),
  };
};

/** Class names for each part of a {@link TimeGridView}, merged after the defaults so they win. */
export type TimeGridViewClassNames = EventPopoverClassNames & {
  /** The button around each all-day event bar. */
  allDayEvent?: string | undefined;
  /** The all-day lane under the day headers. */
  allDayLane?: string | undefined;
  /** The "+N more" button of a collapsed all-day lane. */
  allDayMore?: string | undefined;
  /** The button that collapses or expands the all-day lane. */
  allDayToggle?: string | undefined;
  /**
   * The header cell above each hour column. It holds the all-day toggle and, with `secondaryTimeZones`, the time
   * zone's name.
   */
  corner?: string | undefined;
  /** The current-time line. */
  currentTime?: string | undefined;
  /** A day header. It exposes `aria-current="date"` for today. */
  dayHeader?: string | undefined;
  /** The day number in a day header. */
  dayNumber?: string | undefined;
  /** The button around each timed event (placement, focus ring, selection); see `renderEvent` for its content. */
  event?: string | undefined;
  /** The preview of a new or dragged event's times. */
  ghost?: string | undefined;
  /** The ARIA grid inside the scrolling root. */
  grid?: string | undefined;
  /** An hour label in the gutter. */
  hour?: string | undefined;
  /** A time slot outside `workingHours`, added to `slot`. It exposes `data-off-hours`. */
  offHours?: string | undefined;
  /** The scrolling root element. */
  root?: string | undefined;
  /** An hour label in a `secondaryTimeZones` column. */
  secondaryHour?: string | undefined;
  /**
   * A time slot cell. It exposes `data-hour-start` on the slots that start an hour, and `data-off-hours` on the ones
   * outside `workingHours`.
   */
  slot?: string | undefined;
  /** Today's day number (the filled badge), added to `dayNumber`. */
  today?: string | undefined;
  /** The weekday name in a day header. */
  weekday?: string | undefined;
};

/** Props of {@link TimeGridView}. */
export type TimeGridViewProps<TData = unknown> = EventPopoverOptions<TData> & {
  /** Whether the all-day lane is collapsed to two rows (controlled). Pair it with `onAllDayCollapsedChange`. */
  allDayCollapsed?: boolean | undefined;
  /** Extra classes for the root element, merged after the defaults. */
  className?: string | undefined;
  /** Extra classes per part. */
  classNames?: TimeGridViewClassNames | undefined;
  /** The initial collapsed state of the all-day lane when uncontrolled. @defaultValue false */
  defaultAllDayCollapsed?: boolean | undefined;
  /** Length in minutes of the range `onSlotClick` proposes. @defaultValue 60 */
  defaultEventDuration?: number | undefined;
  /**
   * A new event's times to preview on the grid, e.g. while your form for it is open after `onSlotClick` or
   * `onRangeSelect`. All-day ranges (24 hours or more) aren't previewed.
   */
  draftRange?: TimeRange | null | undefined;
  /**
   * Whether events can be moved and resized (pointer and keyboard). Editing also needs `onEventChange`.
   *
   * @defaultValue true
   */
  editable?: boolean | undefined;
  /**
   * The events to show. Timed events are placed by their times; all-day ones, and timed ones lasting 24 hours or
   * more, go in the all-day lane. Recurring events must already be expanded into occurrences.
   */
  events: readonly CalendarEvent<TData>[];
  /** Turns editing off for single events, e.g. read-only calendars or events the user doesn't own. */
  isEventEditable?: ((event: CalendarEvent<TData>) => boolean) | undefined;
  /** Called when the user expands or collapses the all-day lane. */
  onAllDayCollapsedChange?: ((collapsed: boolean) => void) | undefined;
  /**
   * Called when the user moves or resizes an event (by dragging, or with the keyboard shortcuts), with its proposed
   * new times. The calendar doesn't change the event: update your `events` to accept it, or leave them to reject it.
   */
  onEventChange?:
    | ((event: CalendarEvent<TData>, range: TimeRange) => void)
    | undefined;
  /**
   * Called when an event is clicked, or the `openFocused` shortcut (Enter/Space) is pressed on it (also when that
   * opens the event popover).
   */
  onEventClick?: ((event: CalendarEvent<TData>) => void) | undefined;
  /** Called when the user drags over empty slots, with the swept range (snapped to `snapMinutes`). */
  onRangeSelect?: ((range: TimeRange) => void) | undefined;
  /**
   * Called when an empty slot is clicked, or the `openFocused` shortcut (Enter/Space) is pressed on it, with a range
   * of `defaultEventDuration` minutes starting at the slot.
   */
  onSlotClick?: ((range: TimeRange) => void) | undefined;
  /**
   * Draws the bar of an all-day event, replacing the default `EventChip`. The result goes inside a button that
   * handles the click.
   */
  renderAllDayEvent?: ((chip: EventChipProps<TData>) => ReactNode) | undefined;
  /**
   * Draws one timed event, replacing the default `EventBlock`. Receives the block's props (spread them into an
   * `EventBlock` to keep the default look). The result goes inside a button that places it, handles the click and
   * the drag, and holds the resize handle.
   *
   * @example
   * renderEvent={(block) => <EventBlock {...block} classNames={{ title: "font-semibold" }} />}
   */
  renderEvent?: ((block: EventBlockProps<TData>) => ReactNode) | undefined;
  /** Wraps each clickable event (timed and all-day), e.g. in a context menu. */
  renderEventWrapper?:
    | ((props: RenderEventWrapperProps<TData>) => ReactNode)
    | undefined;
  /**
   * Height of one hour in the grid: a number in rem, or any CSS length (`"64px"`, `"4rem"`). Every row, event and
   * the current-time line scale with it; `slotMinutes` splits it into rows. Numbers in rem follow the user's font size.
   *
   * @defaultValue 3
   * @example
   * hourHeight={4} // roomier: 64px per hour at the default font size
   * hourHeight="40px" // denser: fits a working day on a small screen
   */
  hourHeight?: number | string | undefined;
  /**
   * Time to scroll to when the grid mounts.
   *
   * @defaultValue one hour before the current hour
   */
  scrollToTime?: Temporal.PlainTime | undefined;
  /**
   * More hour columns, left of the calendar's own, showing the same instants in other time zones. Each column header
   * shows `label`, or the zone's short name (`formatters.timeZoneName`, e.g. `"GMT-5"`); the calendar's column gets
   * its name too. Zones whose offset differs by a fraction of an hour (India, Nepal) show minutes, e.g. `"7:30 PM"`.
   *
   * @example
   * secondaryTimeZones={[{ timeZone: "Asia/Kolkata", label: "IST" }]}
   */
  secondaryTimeZones?: readonly TimeGridTimeZone[] | undefined;
  /** The event shown as selected (`aria-pressed` and a ring), e.g. the one open in your side panel. */
  selectedEventId?: string | null | undefined;
  /** Length of one row in minutes; must divide 60 evenly. The hour height (`hourHeight`) doesn't change. @defaultValue 30 */
  slotMinutes?: number | undefined;
  /** Step that dragged and keyboard-edited times snap to; must divide 60 evenly. @defaultValue 15 */
  snapMinutes?: number | undefined;
  /**
   * Working hours, in the calendar's time zone. Slots starting outside them get `data-off-hours` and a muted
   * background (`classNames.offHours`). Only marks the grid: it doesn't stop anything from being scheduled there.
   *
   * @example
   * workingHours={{ days: [1, 2, 3, 4, 5], start: Temporal.PlainTime.from("09:00"), end: Temporal.PlainTime.from("18:00") }}
   */
  workingHours?: WorkingHours | undefined;
};

/** A time zone shown in an extra hour column of the {@link TimeGridView}. */
export type TimeGridTimeZone = {
  /** Column header. @defaultValue the zone's short name from `formatters.timeZoneName`, e.g. `"GMT-5"` */
  label?: string | undefined;
  /** IANA time zone, e.g. `"Asia/Kolkata"`. */
  timeZone: string;
};

/**
 * Day or week time grid: hours down the side, one column per day, events placed by their times with overlapping
 * ones side by side, an all-day lane under the day headers, and a line at the current time. It scrolls to the
 * current hour when it mounts.
 *
 * It's an ARIA grid with one row per slot and a single tab stop (roving focus): arrows move between days and slots
 * (↑/↓ also stop at each event starting in a slot), Home/End and PageUp/PageDown jump. Enter/Space (`openFocused`)
 * clicks the focused slot or event; Alt+arrows move the focused event and Alt+Shift+↑/↓ change its end.
 *
 * With the pointer: drag over empty slots to select a range, drag an event to move it, drag its bottom edge to
 * resize it; Escape cancels a drag. Every change is only proposed through a callback.
 *
 * Shows the calendar's day (`view: "day"`) or week, from the nearest `<Calendar>` or `CalendarProvider`.
 *
 * @example
 * <TimeGridView
 *   events={events}
 *   onSlotClick={(range) => openNewEvent(range)}
 *   onEventChange={(event, range) => saveTimes(event.id, range)}
 * />
 */
export function TimeGridView<TData = unknown>({
  allDayCollapsed: controlledCollapsed,
  className,
  classNames,
  defaultAllDayCollapsed = false,
  defaultEventDuration = 60,
  draftRange,
  editable = true,
  eventPopover,
  events,
  hourHeight = HOUR_HEIGHT_REM,
  isEventEditable,
  onAllDayCollapsedChange,
  onEventChange,
  onEventClick,
  onRangeSelect,
  onSlotClick,
  renderAllDayEvent,
  renderEvent,
  renderEventPopover,
  renderEventWrapper,
  scrollToTime,
  secondaryTimeZones,
  selectedEventId,
  slotMinutes = SLOT_MINUTES,
  snapMinutes = SNAP_MINUTES,
  workingHours,
}: TimeGridViewProps<TData>) {
  const { date, showWeekends, timeZone, today, view, weekStart } =
    useCalendarContext();
  const { formatters, labels, locale, timeFormat } = useCalendarLocale();
  const { gridActionFor, keymap } = useCalendarKeymap();
  const isMac = useIsMac();
  const keyboardHint = useEventKeyboardHint();
  const now = useNow();
  const [focus, setFocus] = useState<GridFocus | null>(null);
  const [uncontrolledCollapsed, setUncontrolledCollapsed] = useState(
    defaultAllDayCollapsed,
  );
  const collapsed = controlledCollapsed ?? uncontrolledCollapsed;
  const setCollapsed = (next: boolean) => {
    if (controlledCollapsed === undefined) setUncontrolledCollapsed(next);
    onAllDayCollapsedChange?.(next);
  };
  // An event moved from the keyboard can land in another slot, which remounts it: focus follows it there.
  const refocusId = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // `useId` returns characters (`:`, `«`) that aren't valid in a CSS `anchor-name`.
  const id = useId().replace(/[^\w-]/g, "");
  const popover = useEventPopover({
    classNames,
    eventPopover,
    events,
    id,
    renderEventPopover,
  });
  const openEvent = (event: CalendarEvent<TData>, element: HTMLElement) => {
    onEventClick?.(event);
    popover.toggle(event, element);
  };

  // Everything below is derived from these values; memoized on them so a drag, a focus move or a clock tick doesn't
  // redo the layout. `date` is keyed by its string so a new but equal `PlainDate` doesn't count as a change.
  const dateKey = date?.toString() ?? null;
  const days = useMemo(() => {
    if (dateKey === null) return [];
    const anchor = Temporal.PlainDate.from(dateKey);
    return view === "day"
      ? visibleDays(anchor, "day", weekStart)
      : visibleDays(anchor, "week", weekStart).filter(
          (day) => showWeekends || !isWeekend(day),
        );
  }, [
    dateKey,
    showWeekends,
    view,
    weekStart,
  ]);
  const ready = days.length > 0;

  // Short events are sized in rem; the layout needs that in minutes, so it needs the hour height in rem. Numbers and
  // rem strings give it directly (server rendering included); other CSS lengths are measured once mounted, and use
  // the default until then.
  const knownHourRem = hourHeightRem(hourHeight);
  const [measuredHourRem, setMeasuredHourRem] = useState<number | null>(null);
  useEffect(() => {
    // Runs again whenever `hourHeight` changes, to measure the new length.
    if (!ready || hourHeightRem(hourHeight) !== null) return;
    const slot =
      scrollRef.current?.querySelector<HTMLElement>('[role="gridcell"]');
    const rootPx = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    );
    const slotPx = slot?.getBoundingClientRect().height ?? 0;
    if (slotPx > 0 && rootPx > 0)
      setMeasuredHourRem(((slotPx / rootPx) * 60) / slotMinutes);
  }, [
    hourHeight,
    ready,
    slotMinutes,
  ]);
  const hourRem = knownHourRem ?? measuredHourRem ?? HOUR_HEIGHT_REM;
  const sizing = useMemo(
    () => eventSizing(hourRem),
    [
      hourRem,
    ],
  );
  const canEdit = (event: CalendarEvent<TData>) =>
    editable &&
    onEventChange !== undefined &&
    (isEventEditable?.(event) ?? true);

  const applyChange = (event: CalendarEvent<TData>, range: TimeRange) => {
    if (range.startAt === event.startAt && range.endAt === event.endAt) return;
    onEventChange?.(event, range);
  };
  const drag = useTimeGridDrag<TData>({
    days,
    onCreate: (range) => onRangeSelect?.(range),
    onReschedule: applyChange,
    slotMinutes,
    snapMinutes,
    timeZone,
  });

  // Scroll to the starting time once the grid is drawn (after hydration when the date isn't controlled).
  // Only then: later date, zone or slot changes keep the user's scroll position, so the effect reads the latest
  // options from a ref instead of depending on them.
  const scrollOptions = useRef({
    scrollToTime,
    slotMinutes,
    timeZone,
  });
  scrollOptions.current = {
    scrollToTime,
    slotMinutes,
    timeZone,
  };
  useEffect(() => {
    const node = scrollRef.current;
    const slot = node?.querySelector<HTMLElement>('[role="gridcell"]');
    if (!ready || node === null || slot === null || slot === undefined) return;
    const {
      scrollToTime: time,
      slotMinutes: step,
      timeZone: zone,
    } = scrollOptions.current;
    const minute =
      time === undefined
        ? Math.max(0, Temporal.Now.zonedDateTimeISO(zone).hour - 1) * 60
        : time.hour * 60 + time.minute;
    node.scrollTop = (minute / step) * slot.offsetHeight;
  }, [
    ready,
  ]);

  const layout = useMemo(
    () => layoutGrid(events, days, timeZone, slotMinutes, sizing.minMinutes),
    [
      days,
      events,
      sizing.minMinutes,
      slotMinutes,
      timeZone,
    ],
  );
  const slotLabels = useMemo(
    () =>
      labelSlots(days, slotMinutes, {
        formatters,
        locale,
        timeFormat,
        timeZone,
      }),
    [
      days,
      formatters,
      locale,
      slotMinutes,
      timeFormat,
      timeZone,
    ],
  );
  // Keyed by content, so a new array with the same zones (an inline prop) doesn't redo the labels.
  const zonesKey = JSON.stringify(
    (secondaryTimeZones ?? []).map(({ label, timeZone: zone }) => [
      zone,
      label ?? null,
    ]),
  );
  const zoneColumns = useMemo(
    () =>
      labelTimeZones(
        JSON.parse(zonesKey) as [
          string,
          string | null,
        ][],
        days,
        slotMinutes,
        {
          formatters,
          locale,
          timeFormat,
          timeZone,
        },
      ),
    [
      days,
      formatters,
      locale,
      slotMinutes,
      timeFormat,
      timeZone,
      zonesKey,
    ],
  );
  const workingKey =
    workingHours === undefined
      ? null
      : `${workingHours.days.join(",")}|${workingHours.start}|${workingHours.end}`;
  // `offHours[day][slot]`; empty without `workingHours`.
  const offHours = useMemo(() => {
    if (workingKey === null) return [];
    const [weekdays = "", start = "", end = ""] = workingKey.split("|");
    const hours: WorkingHours = {
      days: weekdays === "" ? [] : weekdays.split(",").map(Number),
      end: Temporal.PlainTime.from(end),
      start: Temporal.PlainTime.from(start),
    };
    return days.map((day) =>
      Array.from(
        {
          length: slotsPerDay(slotMinutes),
        },
        (_, slot) => !isWorkingTime(day, slot * slotMinutes, hours),
      ),
    );
  }, [
    days,
    slotMinutes,
    workingKey,
  ]);
  const eventTimes = useMemo(() => {
    const context = {
      locale,
      timeFormat,
      timeZone,
    };
    return new Map(
      layout.timed.map((event) => [
        event.id,
        formatters.timeRange(event.startAt, event.endAt, context),
      ]),
    );
  }, [
    formatters,
    layout.timed,
    locale,
    timeFormat,
    timeZone,
  ]);

  const rootClassName = cn(
    "h-full overflow-auto bg-uc-background text-uc-foreground",
    classNames?.root,
    className,
  );
  if (!ready)
    return (
      <div
        className={rootClassName}
        ref={scrollRef}
      >
        <div
          aria-label={labels.grid}
          className={classNames?.grid}
          role="grid"
        />
      </div>
    );

  const context = {
    locale,
    timeFormat,
    timeZone,
  };
  const slotCount = slotsPerDay(slotMinutes);
  const slots = Array.from(
    {
      length: slotCount,
    },
    (_, slot) => slot,
  );
  const { dayEvents, laneSegments, segmentsBySlot, timed } = layout;
  const slotOf = (minute: number) => Math.floor(minute / slotMinutes);
  // The same few class lists repeat in every row: merge them once instead of once per cell.
  const cornerClassName = cn(
    "sticky top-0 left-0 z-30 border-uc-border border-b bg-uc-background",
    classNames?.corner,
  );
  const hourClassName = cn(
    "sticky left-0 z-10 bg-uc-background pr-2 text-right text-[0.7rem] text-uc-muted-foreground",
    classNames?.hour,
  );
  const secondaryHourClassName = cn(
    "sticky left-0 z-10 bg-uc-background pr-2 text-right text-[0.7rem] text-uc-muted-foreground",
    classNames?.secondaryHour,
  );
  const slotBase =
    "border-uc-border border-l outline-none focus-visible:bg-uc-accent";
  const hourSlot = [
    slotBase,
    "border-t",
  ];
  const halfSlot = [
    slotBase,
    "border-t border-t-uc-border/40 border-dashed",
  ];
  const offHoursBase = [
    "bg-uc-muted/60",
    classNames?.slot,
    classNames?.offHours,
  ];
  const hourSlotClassName = cn(hourSlot, classNames?.slot);
  const halfSlotClassName = cn(halfSlot, classNames?.slot);
  const offHourSlotClassName = cn(hourSlot, offHoursBase);
  const offHalfSlotClassName = cn(halfSlot, offHoursBase);
  // Hour columns: one per secondary zone, then the calendar's own, then the days.
  const gutters = zoneColumns.columns.length + 1;
  const stickyLeft = (column: number) =>
    column === 0
      ? undefined
      : {
          left: `${column * GUTTER_REM}rem`,
        };
  const mainLeft = stickyLeft(gutters - 1);

  const laneCount = Math.max(
    0,
    ...laneSegments.map((segment) => segment.lane + 1),
  );
  const collapsible = laneCount > COLLAPSED_LANES;
  const lanes = collapsible && collapsed ? COLLAPSED_LANES : laneCount;
  const lane = fitWeek(laneSegments, days.length, Math.max(lanes, 1));
  const headerRem =
    DAY_HEADER_REM + (lanes > 0 ? lanes * ALL_DAY_LANE_REM + 0.25 : 0);
  const allDayTitles = (column: number) =>
    laneSegments
      .filter(
        (segment) =>
          column >= segment.firstColumn &&
          column < segment.firstColumn + segment.span,
      )
      .map((segment) => segment.item.title);

  const todayIndex =
    today === null ? -1 : days.findIndex((day) => day.equals(today));
  // Until the user moves focus, the tab stop is the current hour today, or 8:00 on the first day.
  const nowHour =
    now === null
      ? null
      : Temporal.Instant.fromEpochMilliseconds(now).toZonedDateTimeISO(timeZone)
          .hour;
  const fallbackFocus: GridFocus =
    todayIndex === -1 || nowHour === null
      ? {
          day: 0,
          eventId: null,
          slot: slotOf(8 * 60),
        }
      : {
          day: todayIndex,
          eventId: null,
          slot: slotOf(nowHour * 60),
        };
  // Focus kept from a previous range may point at a day, slot or event that is no longer shown.
  const focusValid =
    focus !== null &&
    focus.day < days.length &&
    focus.slot < slotCount &&
    (focus.eventId === null ||
      dayEvents[focus.day]?.some((event) => event.id === focus.eventId) ===
        true);
  const current = focusValid ? focus : fallbackFocus;
  const activeKey = focusKey(current);

  const eventShortcuts = EDIT_ACTIONS.flatMap((action) =>
    keymap[action].map((combo) => ariaKeyShortcut(combo, isMac)),
  ).join(" ");

  const wrap = (children: ReactElement, event: CalendarEvent<TData>) =>
    renderEventWrapper === undefined
      ? children
      : renderEventWrapper({
          children,
          event,
        });

  const slotRange = (dayIndex: number, slot: number): TimeRange | null => {
    const day = days[dayIndex];
    return day === undefined
      ? null
      : rangeAt(day, slot * slotMinutes, defaultEventDuration, timeZone);
  };
  const clickSlot = (dayIndex: number, slot: number) => {
    const range = slotRange(dayIndex, slot);
    if (range !== null) onSlotClick?.(range);
  };

  const refocus = (node: HTMLElement | null, eventId: string) => {
    if (node === null || refocusId.current !== eventId) return;
    // Still focused where it was: the app hasn't moved it yet (or rejected the change); keep waiting.
    if (node === document.activeElement) return;
    refocusId.current = null;
    node.focus();
  };

  const onFocus = (event: FocusEvent<HTMLDivElement>) => {
    const key =
      event.target instanceof HTMLElement
        ? event.target.getAttribute("data-focus-key")
        : null;
    if (key === null) return;
    const next = parseFocusKey(key);
    // Focus moved on to something else: stop following a moved event.
    if (next.eventId !== refocusId.current) refocusId.current = null;
    setFocus(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const key = target.getAttribute("data-focus-key");
    // Keys on the all-day toggle or inside content the app rendered aren't grid moves.
    if (key === null) return;
    const action = gridActionFor(event);
    const eventId = target.getAttribute("data-event-id");
    const focused =
      eventId === null ? undefined : timed.find((item) => item.id === eventId);

    if (focused !== undefined && isEditAction(action)) {
      if (!canEdit(focused)) return;
      event.preventDefault();
      refocusId.current = focused.id;
      applyChange(
        focused,
        rescheduleBy(action, focused, timeZone, snapMinutes),
      );
      return;
    }
    if (action === "openFocused") {
      if (focused !== undefined) {
        if (onEventClick === undefined && !popover.opensOnClick) return;
        event.preventDefault();
        openEvent(focused, target);
        return;
      }
      if (onSlotClick === undefined) return;
      event.preventDefault();
      const { day, slot } = parseFocusKey(key);
      clickSlot(day, slot);
      return;
    }
    const next = nextFocus(
      current,
      event.key,
      event.ctrlKey || event.metaKey,
      dayEvents,
      days.length,
      slotMinutes,
    );
    if (next === null) return;
    event.preventDefault();
    // Every slot and event is already rendered; focusing it updates the state through `onFocus`.
    event.currentTarget
      .querySelector<HTMLElement>(
        `[data-focus-key="${attributeValue(focusKey(next))}"]`,
      )
      ?.focus();
  };

  // Where a dragged event would go, or the new event the app is drafting: preview it there.
  const draft =
    draftRange === null ||
    draftRange === undefined ||
    belongsInAllDayLane(draftRange)
      ? null
      : draftRange;
  const ghost = drag.preview ?? draft;
  const ghostSegments =
    ghost === null
      ? []
      : days.flatMap((day, dayIndex) =>
          layoutDay(
            [
              {
                ...ghost,
                id: "ghost",
              },
            ],
            day,
            timeZone,
            sizing.minMinutes,
          ).map((segment) => ({
            dayIndex,
            segment,
          })),
        );

  return (
    <div
      className={rootClassName}
      ref={scrollRef}
    >
      <div
        aria-colcount={days.length + gutters}
        aria-label={labels.grid}
        aria-rowcount={slotCount + 1}
        className={cn(
          "relative grid select-none",
          drag.dragKind === "move" && "cursor-grabbing",
          drag.dragKind === "resize" && "cursor-ns-resize",
          classNames?.grid,
        )}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        onPointerDownCapture={() => {
          drag.resetClick();
          refocusId.current = null;
        }}
        role="grid"
        style={gridStyle(
          days.length,
          headerRem,
          slotMinutes,
          hourHeight,
          gutters,
        )}
        {...drag.gridHandlers}
      >
        <div
          className="contents"
          role="row"
        >
          {/* The header cells sit at explicit positions: the all-day lane overlaps them in row 1, and auto-placement
              would otherwise push them (and every slot after them) out of the cells the lane takes. */}
          {zoneColumns.columns.map((column, index) => (
            <div
              className={cornerClassName}
              key={column.timeZone}
              role="columnheader"
              style={{
                ...stickyLeft(index),
                gridColumn: index + 1,
                gridRow: 1,
              }}
            >
              <TimeZoneName name={column.name} />
            </div>
          ))}
          <div
            className={cornerClassName}
            role="columnheader"
            style={{
              ...mainLeft,
              gridColumn: gutters,
              gridRow: 1,
            }}
          >
            {zoneColumns.mainName !== null && (
              <TimeZoneName name={zoneColumns.mainName} />
            )}
            {collapsible && (
              <AllDayToggle
                className={classNames?.allDayToggle}
                collapsed={collapsed}
                onToggle={() => setCollapsed(!collapsed)}
              />
            )}
          </div>
          {days.map((day, index) => {
            const isToday = index === todayIndex;
            const titles = allDayTitles(index);
            const fullDate = formatters.fullDate(day, context);
            return (
              <div
                aria-current={isToday ? "date" : undefined}
                aria-label={
                  titles.length === 0
                    ? fullDate
                    : `${fullDate}. ${labels.allDayEvents(titles)}`
                }
                className={cn(
                  "sticky top-0 z-20 flex items-start justify-center gap-1.5 border-uc-border border-b border-l bg-uc-background text-sm",
                  classNames?.dayHeader,
                )}
                key={day.toString()}
                role="columnheader"
                style={{
                  gridColumn: index + 1 + gutters,
                  gridRow: 1,
                }}
              >
                <div
                  className="flex items-center gap-1.5"
                  style={{
                    height: `${DAY_HEADER_REM}rem`,
                  }}
                >
                  <span
                    className={cn(
                      "text-uc-muted-foreground",
                      isToday && "font-medium text-uc-foreground",
                      classNames?.weekday,
                    )}
                  >
                    {formatters.weekday(day, context)}
                  </span>
                  <span
                    className={cn(
                      "font-medium",
                      isToday &&
                        "inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-uc-primary px-1.5 text-uc-primary-foreground text-xs",
                      classNames?.dayNumber,
                      isToday && classNames?.today,
                    )}
                  >
                    {formatters.dayNumber(day, context)}
                  </span>
                </div>
              </div>
            );
          })}
          {lanes > 0 && (
            <AllDayLane
              classNames={classNames}
              days={days}
              firstColumn={gutters + 1}
              hiddenByColumn={lane.hiddenByColumn}
              lanes={lanes}
              now={now}
              onExpand={() => setCollapsed(false)}
              onOpen={openEvent}
              popoverProps={popover.triggerProps}
              renderAllDayEvent={renderAllDayEvent}
              segments={lane.shown}
              wrap={wrap}
            />
          )}
        </div>
        {slots.map((slot) => {
          const minute = slot * slotMinutes;
          const onHour = minute % 60 === 0;
          return (
            <div
              className="contents"
              key={slot}
              role="row"
            >
              {zoneColumns.columns.map((column, index) => (
                <div
                  className={secondaryHourClassName}
                  key={column.timeZone}
                  role="rowheader"
                  style={stickyLeft(index)}
                >
                  {onHour ? (
                    <span
                      className={cn("relative block", slot > 0 && "-top-2")}
                    >
                      {column.hours[slot]}
                    </span>
                  ) : (
                    <span className="sr-only">{column.rows[slot]}</span>
                  )}
                </div>
              ))}
              <div
                className={hourClassName}
                role="rowheader"
                style={mainLeft}
              >
                {onHour ? (
                  <span className={cn("relative block", slot > 0 && "-top-2")}>
                    {formatters.hour(minute / 60, context)}
                  </span>
                ) : (
                  <span className="sr-only">{slotLabels.rows[slot]}</span>
                )}
              </div>
              {days.map((day, dayIndex) => {
                const key = focusKey({
                  day: dayIndex,
                  eventId: null,
                  slot,
                });
                const off = offHours[dayIndex]?.[slot] === true;
                return (
                  // biome-ignore lint/a11y/useKeyWithClickEvents: the grid's onKeyDown handles Enter/Space on the focused slot.
                  <div
                    aria-label={slotLabels.cells[dayIndex]?.[slot]}
                    className={
                      onHour
                        ? off
                          ? offHourSlotClassName
                          : hourSlotClassName
                        : off
                          ? offHalfSlotClassName
                          : halfSlotClassName
                    }
                    data-focus-key={key}
                    data-hour-start={onHour || undefined}
                    data-off-hours={off || undefined}
                    key={day.toString()}
                    onClick={() => clickSlot(dayIndex, slot)}
                    onPointerDown={
                      onRangeSelect === undefined ? undefined : drag.startCreate
                    }
                    role="gridcell"
                    tabIndex={key === activeKey ? 0 : -1}
                  >
                    {segmentsBySlot
                      .get(slotKey(dayIndex, slot))
                      ?.map((segment) => (
                        <Fragment key={segment.item.id}>
                          {wrap(
                            <TimeGridEvent
                              ariaKeyShortcuts={eventShortcuts}
                              dayCount={days.length}
                              dayIndex={dayIndex}
                              editable={canEdit(segment.item)}
                              eventClassName={classNames?.event}
                              focusKey={focusKey({
                                day: dayIndex,
                                eventId: segment.item.id,
                                slot,
                              })}
                              isActive={
                                focusKey({
                                  day: dayIndex,
                                  eventId: segment.item.id,
                                  slot,
                                }) === activeKey
                              }
                              isDragged={segment.item.id === drag.draggedId}
                              isSelected={
                                selectedEventId === undefined
                                  ? undefined
                                  : segment.item.id === selectedEventId
                              }
                              keyboardHint={keyboardHint}
                              label={[
                                segment.item.title,
                                eventTimes.get(segment.item.id),
                                segment.item.status === "tentative" &&
                                  labels.tentative,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                              look={eventLook(segment.item, now)}
                              onMovePointerDown={(pointer) =>
                                drag.startMove(pointer, segment.item)
                              }
                              onOpen={(element) =>
                                openEvent(segment.item, element)
                              }
                              onResizePointerDown={(pointer) =>
                                drag.startResize(pointer, segment.item)
                              }
                              popoverProps={popover.triggerProps(segment.item)}
                              refocus={(node) => refocus(node, segment.item.id)}
                              renderEvent={renderEvent}
                              segment={segment}
                              sizing={sizing}
                              time={eventTimes.get(segment.item.id) ?? ""}
                            />,
                            segment.item,
                          )}
                        </Fragment>
                      ))}
                  </div>
                );
              })}
            </div>
          );
        })}
        {ghostSegments.map(({ dayIndex, segment }) => (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute z-[5] rounded-md border-2 border-uc-primary border-dashed bg-uc-primary/10",
              classNames?.ghost,
            )}
            data-uc-ghost=""
            key={dayIndex}
            style={boxStyle(
              dayIndex,
              days.length,
              segment.startMinute,
              Math.max(
                segment.endMinute,
                segment.startMinute + sizing.minMinutes,
              ),
            )}
          />
        ))}
        {todayIndex !== -1 && (
          <CurrentTimeLine
            className={classNames?.currentTime}
            dayCount={days.length}
            dayIndex={todayIndex}
            now={now}
            timeZone={timeZone}
          />
        )}
      </div>
      {popover.popover}
    </div>
  );
}

/** Key of a slot cell in {@link GridLayout}'s `segmentsBySlot`. */
const slotKey = (dayIndex: number, slot: number): string =>
  `${dayIndex}:${slot}`;

/** Everything the grid draws from `events`, computed once per events/days/zone/slot size. */
type GridLayout<TData> = {
  /** Events per day, in reading order, for keyboard focus. */
  dayEvents: DayEvents;
  /** The all-day lane's segments. */
  laneSegments: WeekSegment<CalendarEvent<TData>>[];
  /** Timed segments by the slot cell they start in ({@link slotKey}). */
  segmentsBySlot: Map<string, DaySegment<CalendarEvent<TData>>[]>;
  /** Events drawn in the grid (not in the all-day lane). */
  timed: CalendarEvent<TData>[];
};

const layoutGrid = <TData,>(
  events: readonly CalendarEvent<TData>[],
  days: readonly Temporal.PlainDate[],
  timeZone: string,
  slotMinutes: number,
  minEventMinutes: number,
): GridLayout<TData> => {
  const timed = events.filter((event) => !belongsInAllDayLane(event));
  const segmentsBySlot = new Map<string, DaySegment<CalendarEvent<TData>>[]>();
  const dayEvents = days.map((day, dayIndex) => {
    const segments = layoutDay(timed, day, timeZone, minEventMinutes);
    for (const segment of segments) {
      const key = slotKey(
        dayIndex,
        Math.floor(segment.startMinute / slotMinutes),
      );
      const inSlot = segmentsBySlot.get(key);
      if (inSlot === undefined)
        segmentsBySlot.set(key, [
          segment,
        ]);
      else inSlot.push(segment);
    }
    return segments
      .map((segment) => ({
        column: segment.column,
        id: segment.item.id,
        slot: Math.floor(segment.startMinute / slotMinutes),
        start: segment.startMinute,
      }))
      .sort((a, b) => a.start - b.start || a.column - b.column);
  });
  return {
    dayEvents,
    laneSegments: layoutWeek(
      events.filter(belongsInAllDayLane),
      days,
      timeZone,
    ),
    segmentsBySlot,
    timed,
  };
};

/**
 * Screen-reader labels of the hour gutter (`rows`, one per slot) and of every slot cell (`cells[day][slot]`). They
 * only change with the days, slot size and locale, so they're computed once instead of on every render.
 */
const labelSlots = (
  days: readonly Temporal.PlainDate[],
  slotMinutes: number,
  {
    formatters,
    locale,
    timeFormat,
    timeZone,
  }: Pick<CalendarLocale, "formatters" | "locale" | "timeFormat"> & {
    timeZone: string;
  },
): {
  cells: string[][];
  rows: string[];
} => {
  const context = {
    locale,
    timeFormat,
    timeZone,
  };
  const count = slotsPerDay(slotMinutes);
  // Each slot's end is the next one's start: convert every boundary of a day once (Temporal is the slow part).
  const boundaries = (day: Temporal.PlainDate) =>
    Array.from(
      {
        length: count + 1,
      },
      (_, slot) =>
        wallTime(day, slot * slotMinutes, timeZone)
          .toInstant()
          .toString(),
    );
  const cells = days.map((day) => {
    const date = formatters.fullDate(day, context);
    const at = boundaries(day);
    return Array.from(
      {
        length: count,
      },
      (_, slot) =>
        `${date}, ${formatters.timeRange(at[slot] ?? "", at[slot + 1] ?? "", context)}`,
    );
  });
  const first = days[0];
  const firstBoundaries = first === undefined ? [] : boundaries(first);
  return {
    cells,
    rows: Array.from(
      {
        length: count,
      },
      (_, slot) => {
        const at = firstBoundaries[slot];
        return at === undefined ? "" : formatters.time(at, context);
      },
    ),
  };
};

/** An extra hour column: its header and its labels per slot. */
type TimeZoneColumn = {
  /** Visible labels of the slots that start an hour of the calendar's zone. */
  hours: string[];
  /** Header text. */
  name: string;
  /** Screen-reader labels of the other slots. */
  rows: string[];
  timeZone: string;
};

/**
 * Labels of the `secondaryTimeZones` columns, from the first shown day: each line of the calendar's hours shows the
 * time of that same instant in the other zone. Whole hours use `formatters.hour`, like the calendar's column; zones
 * off by a fraction of an hour use `formatters.time`. Also names the calendar's own zone when there are others.
 * A zone listed twice gets one column.
 */
const labelTimeZones = (
  zones: readonly (readonly [
    string,
    string | null,
  ])[],
  days: readonly Temporal.PlainDate[],
  slotMinutes: number,
  {
    formatters,
    locale,
    timeFormat,
    timeZone,
  }: Pick<CalendarLocale, "formatters" | "locale" | "timeFormat"> & {
    timeZone: string;
  },
): {
  columns: TimeZoneColumn[];
  mainName: string | null;
} => {
  const first = days[0];
  // A zone listed twice would only repeat its column (and its React key).
  const unique = zones.filter(
    ([zone], index) => zones.findIndex(([other]) => other === zone) === index,
  );
  if (first === undefined || unique.length === 0)
    return {
      columns: [],
      mainName: null,
    };
  const context = {
    locale,
    timeFormat,
    timeZone,
  };
  const instants = Array.from(
    {
      length: slotsPerDay(slotMinutes),
    },
    (_, slot) => wallTime(first, slot * slotMinutes, timeZone).toInstant(),
  );
  return {
    columns: unique.map(([zone, label]) => {
      const zoneContext = {
        ...context,
        timeZone: zone,
      };
      const times = instants.map((instant) => instant.toZonedDateTimeISO(zone));
      const rows = times.map((time) =>
        formatters.time(time.toInstant().toString(), zoneContext),
      );
      return {
        hours: times.map((time, slot) =>
          time.minute === 0
            ? formatters.hour(time.hour, zoneContext)
            : (rows[slot] ?? ""),
        ),
        name: label ?? formatters.timeZoneName(first, zoneContext),
        rows,
        timeZone: zone,
      };
    }),
    mainName: formatters.timeZoneName(first, context),
  };
};

/** A time zone's name in the header cell of its hour column. */
function TimeZoneName({ name }: { name: string }) {
  return (
    <div
      className="flex items-end justify-end pr-2 pb-1 text-[0.65rem] text-uc-muted-foreground"
      style={{
        height: `${DAY_HEADER_REM}rem`,
      }}
    >
      {name}
    </div>
  );
}

type TimeGridEventOwnProps<TData> = {
  ariaKeyShortcuts: string;
  dayCount: number;
  dayIndex: number;
  /** Can be dragged and edited from the keyboard. */
  editable: boolean;
  /** The `classNames.event` slot. */
  eventClassName: string | undefined;
  focusKey: string;
  isActive: boolean;
  /** Being moved or resized: faded while the preview shows where it goes. */
  isDragged: boolean;
  /** `undefined` when the app doesn't track a selection. */
  isSelected: boolean | undefined;
  keyboardHint: string;
  label: string;
  look: ReturnType<typeof eventLook>;
  onMovePointerDown: (pointer: PointerEvent<HTMLElement>) => void;
  /** Opens the event (click, or Enter/Space on the focused button). */
  onOpen: (element: HTMLElement) => void;
  onResizePointerDown: (pointer: PointerEvent<HTMLElement>) => void;
  /** Event popover trigger attributes and hover handlers (empty when the popover is off). */
  popoverProps: EventPopoverTriggerProps;
  refocus: (node: HTMLButtonElement | null) => void;
  renderEvent: ((block: EventBlockProps<TData>) => ReactNode) | undefined;
  segment: DaySegment<CalendarEvent<TData>>;
  sizing: EventSizing;
  time: string;
};

/**
 * Own props, plus whatever a `renderEventWrapper` trigger adds when it clones the element (ref, handlers, `aria-*`,
 * `data-*`): they reach the button, merged with its own.
 */
type TimeGridEventProps<TData> = TimeGridEventOwnProps<TData> &
  Omit<
    ComponentPropsWithRef<"button">,
    keyof TimeGridEventOwnProps<TData> | "children"
  >;

/** One timed event in a day column: a button placed by time and lane, holding the event block and resize handle. */
function TimeGridEvent<TData>({
  ariaKeyShortcuts,
  dayCount,
  dayIndex,
  editable,
  eventClassName,
  focusKey: key,
  isActive,
  isDragged,
  isSelected,
  keyboardHint,
  label,
  look,
  onMovePointerDown,
  onOpen,
  onResizePointerDown,
  popoverProps,
  refocus,
  renderEvent,
  segment,
  sizing,
  time,
  ...wrapper
}: TimeGridEventProps<TData>) {
  const {
    column,
    columns,
    continuesAfter,
    continuesBefore,
    endMinute,
    item: event,
    startMinute,
  } = segment;
  const drawnEnd = Math.max(endMinute, startMinute + sizing.minMinutes);
  const block: EventBlockProps<TData> = {
    compact: drawnEnd - startMinute < sizing.compactMinutes,
    continuesAfter,
    continuesBefore,
    event,
    look,
    time,
  };
  return (
    <button
      {...popoverProps}
      {...wrapper}
      aria-description={
        editable && keyboardHint !== ""
          ? keyboardHint
          : wrapper["aria-description"]
      }
      aria-keyshortcuts={
        editable && ariaKeyShortcuts !== ""
          ? ariaKeyShortcuts
          : wrapper["aria-keyshortcuts"]
      }
      aria-label={label}
      aria-pressed={isSelected}
      className={cn(
        "absolute z-[5] m-0 block cursor-pointer rounded-md border-0 bg-transparent p-0 text-left text-inherit outline-none ring-offset-1 ring-offset-uc-background focus-visible:z-[7] focus-visible:ring-2 focus-visible:ring-uc-ring",
        isSelected === true && "z-[6] ring-2 ring-uc-primary",
        isDragged && "opacity-40",
        eventClassName,
        wrapper.className,
      )}
      data-event-id={event.id}
      data-focus-key={key}
      onClick={composeHandlers(wrapper.onClick, (click) => {
        // The slot under the event would start a new one.
        click.stopPropagation();
        onOpen(click.currentTarget);
      })}
      onPointerDown={composeHandlers(
        wrapper.onPointerDown,
        editable
          ? onMovePointerDown
          : (pointer) => {
              // Not draggable, but the slot underneath mustn't start a new event either.
              pointer.stopPropagation();
            },
      )}
      onPointerDownCapture={composeHandlers(
        wrapper.onPointerDownCapture,
        popoverProps.onPointerDownCapture,
      )}
      onPointerEnter={composeHandlers(
        wrapper.onPointerEnter,
        popoverProps.onPointerEnter,
      )}
      onPointerLeave={composeHandlers(
        wrapper.onPointerLeave,
        popoverProps.onPointerLeave,
      )}
      ref={mergeRefs(refocus, wrapper.ref)}
      style={{
        ...wrapper.style,
        ...boxStyle(dayIndex, dayCount, startMinute, drawnEnd, column, columns),
      }}
      tabIndex={isActive ? 0 : -1}
      type="button"
    >
      {renderEvent === undefined ? (
        <EventBlock {...block} />
      ) : (
        renderEvent(block)
      )}
      {/* The end can only be dragged where the event ends; a segment that continues tomorrow has none. */}
      {editable && !continuesAfter && (
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
          data-uc-resize-handle=""
          onPointerDown={onResizePointerDown}
        />
      )}
    </button>
  );
}
