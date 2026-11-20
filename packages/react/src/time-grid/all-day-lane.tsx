import type { CalendarEvent, WeekSegment } from "@usecalendar/core";
import { Fragment, type ReactElement, type ReactNode } from "react";
import { EventChip, type EventChipProps } from "../events/event-chip.js";
import type { EventPopoverTriggerProps } from "../events/event-popover.js";
import { eventLook } from "../events/event-style.js";
import { useCalendarLocale } from "../locale/locale-context.js";
import { cn } from "../utils/cn.js";
import { ALL_DAY_LANE_REM, DAY_HEADER_REM } from "./grid-geometry.js";

type AllDayLaneProps<TData> = {
  classNames:
    | {
        allDayEvent?: string | undefined;
        allDayLane?: string | undefined;
        allDayMore?: string | undefined;
      }
    | undefined;
  days: readonly Temporal.PlainDate[];
  /** Grid column of the first day (1-based), after the hour columns. */
  firstColumn: number;
  hiddenByColumn: readonly number[];
  /** Rows drawn: every lane when expanded, at most two when collapsed. */
  lanes: number;
  /** Epoch ms, to mute past events; null while unknown. */
  now: number | null;
  onExpand: () => void;
  /** Clicking an event: `onEventClick` and the event popover. */
  onOpen: (event: CalendarEvent<TData>, element: HTMLElement) => void;
  /** Event popover trigger attributes and hover handlers for an event. */
  popoverProps: (event: CalendarEvent<TData>) => EventPopoverTriggerProps;
  renderAllDayEvent: ((chip: EventChipProps<TData>) => ReactNode) | undefined;
  segments: readonly WeekSegment<CalendarEvent<TData>>[];
  wrap: (children: ReactElement, event: CalendarEvent<TData>) => ReactNode;
};

/**
 * Bars for all-day and multi-day events, under the day headers. It spans every day column, so an event over three
 * days is one continuous bar. Screen readers get the same events from each day's column header.
 */
export function AllDayLane<TData>({
  classNames,
  days,
  firstColumn,
  hiddenByColumn,
  lanes,
  now,
  onExpand,
  onOpen,
  popoverProps,
  renderAllDayEvent,
  segments,
  wrap,
}: AllDayLaneProps<TData>) {
  const { labels } = useCalendarLocale();
  const percent = (columns: number) => `${(columns / days.length) * 100}%`;
  const top = (lane: number) =>
    `${DAY_HEADER_REM + lane * ALL_DAY_LANE_REM}rem`;
  const height = `${ALL_DAY_LANE_REM - 0.125}rem`;

  return (
    <div
      className={cn(
        "pointer-events-none sticky top-0 z-[21]",
        classNames?.allDayLane,
      )}
      role="presentation"
      style={{
        gridColumn: `${firstColumn} / -1`,
        gridRow: 1,
      }}
    >
      {segments.map((segment) => {
        const chip: EventChipProps<TData> = {
          bar: true,
          continuesAfter: segment.continuesAfter,
          continuesBefore: segment.continuesBefore,
          event: segment.item,
          look: eventLook(segment.item, now),
          span: segment.span,
        };
        return (
          <Fragment key={segment.item.id}>
            {wrap(
              <button
                {...popoverProps(segment.item)}
                className={cn(
                  "pointer-events-auto absolute m-0 cursor-pointer border-0 bg-transparent px-0.5 py-0 text-left text-inherit",
                  classNames?.allDayEvent,
                )}
                onClick={(click) => onOpen(segment.item, click.currentTarget)}
                style={{
                  height,
                  left: percent(segment.firstColumn),
                  top: top(segment.lane),
                  width: percent(segment.span),
                }}
                // Screen readers get these events from the day headers.
                tabIndex={-1}
                type="button"
              >
                {renderAllDayEvent === undefined ? (
                  <EventChip {...chip} />
                ) : (
                  renderAllDayEvent(chip)
                )}
              </button>,
              segment.item,
            )}
          </Fragment>
        );
      })}
      {days.map((day, column) => {
        const hidden = hiddenByColumn[column] ?? 0;
        return hidden > 0 ? (
          <button
            className={cn(
              "pointer-events-auto absolute m-0 cursor-pointer truncate rounded-sm border-0 bg-transparent px-1.5 py-0 text-left font-medium text-[0.7rem] text-uc-muted-foreground hover:bg-uc-accent",
              classNames?.allDayMore,
            )}
            key={day.toString()}
            onClick={onExpand}
            style={{
              height,
              left: percent(column),
              top: top(lanes - 1),
              width: percent(1),
            }}
            tabIndex={-1}
            type="button"
          >
            {labels.moreEvents(hidden)}
          </button>
        ) : null;
      })}
    </div>
  );
}

const Chevron = ({ up }: { up: boolean }) => (
  <svg
    aria-hidden
    className="size-4"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path d={up ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} />
  </svg>
);

/** Collapse/expand button for the all-day lane, in the corner above the hour labels. */
export function AllDayToggle({
  className,
  collapsed,
  onToggle,
}: {
  className: string | undefined;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { labels } = useCalendarLocale();
  const label = collapsed ? labels.expandAllDay : labels.collapseAllDay;
  return (
    <button
      aria-expanded={!collapsed}
      aria-label={label}
      className={cn(
        "absolute right-1 bottom-1 m-0 inline-flex size-6 cursor-pointer items-center justify-center rounded-uc border-0 bg-transparent p-0 text-uc-muted-foreground outline-none hover:bg-uc-accent hover:text-uc-accent-foreground focus-visible:ring-2 focus-visible:ring-uc-ring",
        className,
      )}
      onClick={onToggle}
      title={label}
      type="button"
    >
      <Chevron up={!collapsed} />
    </button>
  );
}
