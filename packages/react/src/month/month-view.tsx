import {
  type CalendarEvent,
  fitWeek,
  isWeekend,
  layoutWeek,
  monthWeeks,
  nextMonthFocus,
  type WeekSegment,
  weekNumber,
} from "@usecalendar/core";
import {
  Fragment,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  useId,
  useState,
} from "react";
import { useCalendarContext } from "../calendar/calendar-context.js";
import { useNow } from "../clock/use-now.js";
import { EventChip, type EventChipProps } from "../events/event-chip.js";
import { eventLook } from "../events/event-style.js";
import type { RenderEventWrapperProps } from "../events/render-event-wrapper.js";
import { useCalendarKeymap } from "../hotkeys/keymap-context.js";
import { useCalendarLocale } from "../locale/locale-context.js";
import { cn } from "../utils/cn.js";
import { useElementHeight } from "../utils/use-element-height.js";

// Pixel sizes: the number of event lanes per week is measured from the rendered row height.
const DAY_LABEL_PX = 28;
const LANE_PX = 22;
/** Below this the rows stop shrinking and the month scrolls; fits two lanes ("+N more" included). */
const MIN_ROW_PX = DAY_LABEL_PX + 2 * LANE_PX + 6;
const WEEK_NUMBER_COLUMN = "2rem";

/** Class names for each part of a {@link MonthView}, merged after the defaults so they win. */
export type MonthViewClassNames = {
  /** The scrolling area holding the week rows. */
  body?: string | undefined;
  /** A day cell. It exposes `data-today` and `data-outside` (days of the previous or next month). */
  cell?: string | undefined;
  /** The day number in a cell. */
  dayNumber?: string | undefined;
  /** The button around each event, in the grid and in the "+N more" popover. */
  event?: string | undefined;
  /** The layer that draws a week's event bars over its day cells. */
  events?: string | undefined;
  /** The row of weekday names. */
  header?: string | undefined;
  /** The "+N more" button of a day with hidden events. */
  more?: string | undefined;
  /** A day cell outside the shown month, added to `cell`. */
  outside?: string | undefined;
  /** The "+N more" popover. */
  popover?: string | undefined;
  /** The list of events in the "+N more" popover. */
  popoverList?: string | undefined;
  /** The date heading of the "+N more" popover. */
  popoverTitle?: string | undefined;
  /** The outer element (the ARIA grid). */
  root?: string | undefined;
  /** A week row. */
  row?: string | undefined;
  /** Today's day number (the filled badge), added to `dayNumber`. */
  today?: string | undefined;
  /** A weekday name in the header. */
  weekday?: string | undefined;
  /** The week number at the start of a row, when `showWeekNumbers` is on. */
  weekNumber?: string | undefined;
  /** The empty header cell above the week numbers. */
  weekNumberHeader?: string | undefined;
};

/** Where an event is drawn: in a week row of the grid, or in a day's "+N more" popover. */
export type MonthEventPlacement = "grid" | "more";

/** Props of `renderMorePopover`. */
export type MonthMorePopoverProps<TData = unknown> = {
  /** The day whose events are listed. */
  day: Temporal.PlainDate;
  /** Every event of the day, in lane order (the hidden ones included). */
  events: CalendarEvent<TData>[];
  /** How many of the day's events don't fit in its cell. */
  hiddenCount: number;
  /** The trigger text, e.g. `"+3 more"` (from `labels.moreEvents`). */
  label: string;
  /** The default list of the day's events (each clickable, rendered with `renderEvent`); reuse it in your popover. */
  list: ReactNode;
  /** The day as a heading, e.g. `"Wednesday, November 18, 2026"` (from `formatters.fullDate`). */
  title: string;
};

/** Props of {@link MonthView}. */
export type MonthViewProps<TData = unknown> = {
  /** Extra classes for the root element, merged after the defaults. */
  className?: string | undefined;
  /** Extra classes per part. */
  classNames?: MonthViewClassNames | undefined;
  /**
   * The events to show. Only those overlapping the visible weeks are drawn; recurring events must already be
   * expanded into occurrences.
   */
  events: readonly CalendarEvent<TData>[];
  /**
   * Called when a day is picked: clicking its cell, or Enter/Space on the focused day.
   *
   * @defaultValue opens that day in the day view (`goToDate(day)` then `setView("day")`)
   */
  onDayClick?: ((day: Temporal.PlainDate) => void) | undefined;
  /** Called when an event is clicked, in the grid or in a "+N more" popover. */
  onEventClick?: ((event: CalendarEvent<TData>) => void) | undefined;
  /**
   * Draws one event, replacing the default `EventChip`. Receives the chip's props (spread them into an
   * `EventChip` to keep the default look) and where it's drawn. The result goes inside a button that handles
   * the click.
   *
   * @example
   * renderEvent={(chip) => <EventChip {...chip} classNames={{ title: "font-semibold" }} />}
   */
  renderEvent?:
    | ((
        chip: EventChipProps<TData>,
        placement: MonthEventPlacement,
      ) => ReactNode)
    | undefined;
  /**
   * Wraps each clickable event, e.g. in a context menu.
   *
   * @example
   * renderEventWrapper={({ children, event }) => (
   *   <ContextMenu>
   *     <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
   *     <ContextMenuContent><EventActions event={event} /></ContextMenuContent>
   *   </ContextMenu>
   * )}
   */
  renderEventWrapper?:
    | ((props: RenderEventWrapperProps<TData>) => ReactNode)
    | undefined;
  /**
   * Replaces the "+N more" button and its popover (the native HTML Popover API by default), e.g. to use your
   * app's own popover component. Whatever it returns is placed in the cell's last event lane.
   */
  renderMorePopover?:
    | ((props: MonthMorePopoverProps<TData>) => ReactNode)
    | undefined;
};

// `useId` returns characters (`:`, `«`) that aren't valid in a CSS `anchor-name`.
const cssIdent = (id: string): string => id.replace(/[^\w-]/g, "");

/**
 * Month view: whole weeks from the calendar's `weekStart`, events in lanes (multi-day ones spanning their days)
 * and "+N more" when a day has more than fits. Rows share the height and stop shrinking at two lanes, where the
 * month starts to scroll.
 *
 * It's an ARIA grid with roving focus over the days: arrows move by day and week, Home/End to the ends of the
 * week (with Ctrl/⌘, of the month), and Enter/Space (the `openFocused` shortcut) picks the focused day. Events
 * are reached with the mouse or through the day.
 *
 * Reads the date, time zone and display options from the nearest `<Calendar>` or `CalendarProvider`.
 *
 * @example
 * <CalendarProvider calendar={useCalendar({ defaultView: "month" })}>
 *   <MonthView events={events} onEventClick={(event) => openEditor(event.data)} />
 * </CalendarProvider>
 */
export function MonthView<TData = unknown>({
  className,
  classNames,
  events,
  onDayClick,
  onEventClick,
  renderEvent,
  renderEventWrapper,
  renderMorePopover,
}: MonthViewProps<TData>) {
  const {
    date,
    goToDate,
    setView,
    showWeekends,
    showWeekNumbers,
    timeZone,
    today,
    weekStart,
  } = useCalendarContext();
  const { formatters, labels, locale, timeFormat } = useCalendarLocale();
  const { gridActionFor } = useCalendarKeymap();
  const { height, ref: bodyRef } = useElementHeight<HTMLDivElement>();
  const [focused, setFocused] = useState<string | null>(null);
  const now = useNow();
  const id = useId();

  const rootClassName = cn(
    "flex h-full min-h-0 flex-col bg-uc-background text-uc-foreground",
    classNames?.root,
    className,
  );
  // Without a controlled date, the day isn't known until the client hydrates.
  if (date === null)
    return (
      <div
        aria-label={labels.grid}
        className={rootClassName}
        role="grid"
      />
    );

  const context = {
    locale,
    timeFormat,
    timeZone,
  };
  const weeks = monthWeeks(date, weekStart).map((week) =>
    showWeekends ? week : week.filter((day) => !isWeekend(day)),
  );
  const columnCount = weeks[0]?.length ?? 7;
  const rowHeight = Math.max(MIN_ROW_PX, height / weeks.length);
  const maxLanes = Math.max(
    1,
    Math.floor((rowHeight - DAY_LABEL_PX - 4) / LANE_PX),
  );
  const columns = `${showWeekNumbers ? `${WEEK_NUMBER_COLUMN} ` : ""}repeat(${columnCount}, minmax(0, 1fr))`;

  const allDays = weeks.flat();
  // Until the user moves focus, the tab stop is today when it's in this month, else the anchor date.
  const fallback = (
    today !== null &&
    today.month === date.month &&
    today.year === date.year &&
    allDays.some((day) => day.equals(today))
      ? today
      : date
  ).toString();
  const activeDay =
    focused !== null && allDays.some((day) => day.toString() === focused)
      ? focused
      : fallback;

  const pickDay = (day: Temporal.PlainDate) => {
    if (onDayClick !== undefined) {
      onDayClick(day);
      return;
    }
    goToDate(day);
    setView("day");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Keys pressed inside a "+N more" popover bubble through the cell, but they aren't grid moves.
    if (
      !(event.target instanceof HTMLElement) ||
      event.target.getAttribute("role") !== "gridcell"
    )
      return;
    const key = event.target.getAttribute("data-day");
    const row = weeks.findIndex((week) =>
      week.some((day) => day.toString() === key),
    );
    const column = weeks[row]?.findIndex((day) => day.toString() === key) ?? -1;
    const day = weeks[row]?.[column];
    if (day === undefined) return;
    if (gridActionFor(event) === "openFocused") {
      event.preventDefault();
      pickDay(day);
      return;
    }
    const next = nextMonthFocus(
      {
        column,
        row,
      },
      event.key,
      event.ctrlKey || event.metaKey,
      weeks.length,
      columnCount,
    );
    const target = next === null ? undefined : weeks[next.row]?.[next.column];
    if (target === undefined) return;
    event.preventDefault();
    event.currentTarget
      .querySelector<HTMLElement>(`[data-day="${target.toString()}"]`)
      ?.focus();
  };

  const chipProps = (
    segment: WeekSegment<CalendarEvent<TData>>,
  ): EventChipProps<TData> => ({
    continuesAfter: segment.continuesAfter,
    continuesBefore: segment.continuesBefore,
    event: segment.item,
    look: eventLook(segment.item, now),
    span: segment.span,
    time: formatters.time(segment.item.startAt, context),
  });
  const drawEvent = (
    chip: EventChipProps<TData>,
    placement: MonthEventPlacement,
  ): ReactNode =>
    renderEvent === undefined ? (
      <EventChip {...chip} />
    ) : (
      renderEvent(chip, placement)
    );
  const wrap = (children: ReactElement, event: CalendarEvent<TData>) =>
    renderEventWrapper === undefined
      ? children
      : renderEventWrapper({
          children,
          event,
        });

  return (
    <div
      aria-label={labels.grid}
      className={rootClassName}
      onFocus={(event) => {
        const day =
          event.target instanceof HTMLElement
            ? event.target.getAttribute("data-day")
            : null;
        if (day !== null) setFocused(day);
      }}
      onKeyDown={onKeyDown}
      role="grid"
    >
      <div
        className={cn(
          "grid shrink-0 border-uc-border border-b",
          classNames?.header,
        )}
        role="row"
        style={{
          gridTemplateColumns: columns,
        }}
      >
        {showWeekNumbers && (
          <div
            className={cn(
              "py-1.5 text-center text-[0.7rem] text-uc-muted-foreground",
              classNames?.weekNumberHeader,
            )}
            role="columnheader"
          >
            <span className="sr-only">{labels.weekNumberHeader}</span>
          </div>
        )}
        {(weeks[0] ?? []).map((day) => (
          <div
            className={cn(
              "py-1.5 text-center text-uc-muted-foreground text-xs",
              classNames?.weekday,
            )}
            key={day.dayOfWeek}
            role="columnheader"
          >
            {formatters.weekday(day, context)}
          </div>
        ))}
      </div>
      <div
        className={cn("grid min-h-0 flex-1 overflow-y-auto", classNames?.body)}
        ref={bodyRef}
        role="rowgroup"
        style={{
          gridTemplateRows: `repeat(${weeks.length}, minmax(${MIN_ROW_PX}px, 1fr))`,
        }}
      >
        {weeks.map((week) => {
          const segments = layoutWeek(events, week, timeZone);
          const { hiddenByColumn, shown } = fitWeek(
            segments,
            week.length,
            maxLanes,
          );
          const weekKey = week[0]?.toString() ?? "";
          const number = week[0] && weekNumber(week[0], weekStart);
          return (
            <div
              className={cn(
                "relative grid border-uc-border border-b last:border-b-0",
                classNames?.row,
              )}
              key={weekKey}
              role="row"
              style={{
                gridTemplateColumns: columns,
              }}
            >
              {showWeekNumbers && number !== undefined && (
                <div
                  className={cn(
                    "pt-1.5 text-center text-[0.7rem] text-uc-muted-foreground",
                    classNames?.weekNumber,
                  )}
                  role="rowheader"
                >
                  <span aria-hidden>{number}</span>
                  <span className="sr-only">{labels.weekNumber(number)}</span>
                </div>
              )}
              {week.map((day, column) => {
                const key = day.toString();
                const isToday = today !== null && day.equals(today);
                const isOutside = day.month !== date.month;
                const daySegments = segments.filter(
                  (segment) =>
                    column >= segment.firstColumn &&
                    column < segment.firstColumn + segment.span,
                );
                const hidden = hiddenByColumn[column] ?? 0;
                const title = formatters.fullDate(day, context);
                return (
                  // biome-ignore lint/a11y/useKeyWithClickEvents: the grid's onKeyDown handles Enter/Space on the focused day.
                  <div
                    aria-current={isToday ? "date" : undefined}
                    aria-label={[
                      title,
                      ...daySegments.map((segment) => segment.item.title),
                    ].join(". ")}
                    className={cn(
                      "relative min-w-0 cursor-pointer border-uc-border border-l outline-none first:border-l-0 focus-visible:bg-uc-accent",
                      isOutside && "bg-uc-muted/40 text-uc-muted-foreground",
                      classNames?.cell,
                      isOutside && classNames?.outside,
                    )}
                    data-day={key}
                    data-outside={isOutside || undefined}
                    data-today={isToday || undefined}
                    key={key}
                    onClick={() => pickDay(day)}
                    role="gridcell"
                    tabIndex={key === activeDay ? 0 : -1}
                  >
                    <div
                      className="flex justify-center pt-1"
                      style={{
                        height: DAY_LABEL_PX,
                      }}
                    >
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full text-xs",
                          isToday &&
                            "bg-uc-primary font-medium text-uc-primary-foreground",
                          classNames?.dayNumber,
                          isToday && classNames?.today,
                        )}
                      >
                        {formatters.dayNumber(day, context)}
                      </span>
                    </div>
                    {hidden > 0 && (
                      // Clicks inside the "+N more" area never pick the day underneath.
                      // biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: only stops propagation.
                      <div
                        className="absolute inset-x-0.5"
                        onClick={(event) => event.stopPropagation()}
                        style={{
                          height: LANE_PX - 2,
                          top: DAY_LABEL_PX + (maxLanes - 1) * LANE_PX,
                        }}
                      >
                        <MorePopover
                          classNames={classNames}
                          day={day}
                          events={daySegments.map((segment) => segment.item)}
                          hiddenCount={hidden}
                          id={`${cssIdent(id)}-more-${key}`}
                          label={labels.moreEvents(hidden)}
                          list={
                            <ul
                              className={cn(
                                "m-0 flex list-none flex-col gap-0.5 p-0",
                                classNames?.popoverList,
                              )}
                            >
                              {daySegments.map((segment) => (
                                <li
                                  key={segment.item.id}
                                  style={{
                                    height: LANE_PX - 2,
                                  }}
                                >
                                  {wrap(
                                    <button
                                      className={cn(
                                        "m-0 block size-full cursor-pointer rounded-sm border-0 bg-transparent p-0 text-left text-inherit hover:bg-uc-accent",
                                        classNames?.event,
                                      )}
                                      onClick={() =>
                                        onEventClick?.(segment.item)
                                      }
                                      type="button"
                                    >
                                      {drawEvent(
                                        {
                                          ...chipProps(segment),
                                          continuesAfter: false,
                                          continuesBefore: false,
                                          span: 1,
                                        },
                                        "more",
                                      )}
                                    </button>,
                                    segment.item,
                                  )}
                                </li>
                              ))}
                            </ul>
                          }
                          renderMorePopover={renderMorePopover}
                          title={title}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Event bars sit over the day cells so multi-day events can span them; a bar opens its event, the gaps pick the day. */}
              <div
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-y-0 right-0",
                  classNames?.events,
                )}
                style={{
                  left: showWeekNumbers ? WEEK_NUMBER_COLUMN : "0px",
                }}
              >
                {shown.map((segment) => (
                  <Fragment key={segment.item.id}>
                    {wrap(
                      <button
                        className={cn(
                          "pointer-events-auto absolute m-0 cursor-pointer border-0 bg-transparent px-0.5 py-0 text-left text-inherit",
                          classNames?.event,
                        )}
                        onClick={(event) => {
                          event.stopPropagation();
                          onEventClick?.(segment.item);
                        }}
                        style={{
                          height: LANE_PX - 2,
                          left: `${(segment.firstColumn / week.length) * 100}%`,
                          top: DAY_LABEL_PX + segment.lane * LANE_PX,
                          width: `${(segment.span / week.length) * 100}%`,
                        }}
                        // Keyboard users reach events through the day: Enter picks it.
                        tabIndex={-1}
                        type="button"
                      >
                        {drawEvent(chipProps(segment), "grid")}
                      </button>,
                      segment.item,
                    )}
                  </Fragment>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type MorePopoverProps<TData> = MonthMorePopoverProps<TData> & {
  classNames: MonthViewClassNames | undefined;
  /** Unique, CSS-ident-safe id for the popover and its anchor. */
  id: string;
  renderMorePopover: MonthViewProps<TData>["renderMorePopover"];
};

/** "+N more" button and popover, built on the native HTML Popover API and anchored with CSS anchor positioning. */
function MorePopover<TData>({
  classNames,
  id,
  renderMorePopover,
  ...props
}: MorePopoverProps<TData>) {
  if (renderMorePopover !== undefined) return renderMorePopover(props);
  const { label, list, title } = props;
  const anchor = `--${id}`;
  return (
    <>
      <button
        className={cn(
          "m-0 block size-full cursor-pointer truncate rounded-sm border-0 bg-transparent px-1 py-0 text-left font-medium text-[0.7rem] text-uc-muted-foreground hover:bg-uc-accent",
          classNames?.more,
        )}
        popoverTarget={id}
        style={{
          anchorName: anchor,
        }}
        tabIndex={-1}
        type="button"
      >
        {label}
      </button>
      <div
        aria-labelledby={`${id}-title`}
        className={cn(
          "w-64 flex-col gap-2 rounded-uc border border-uc-border bg-uc-popover p-2.5 text-uc-popover-foreground text-xs shadow-md open:flex",
          classNames?.popover,
        )}
        data-uc-popover=""
        id={id}
        popover="auto"
        role="dialog"
        style={{
          positionAnchor: anchor,
        }}
      >
        <div
          className={cn("font-medium text-sm", classNames?.popoverTitle)}
          id={`${id}-title`}
        >
          {title}
        </div>
        {list}
      </div>
    </>
  );
}
