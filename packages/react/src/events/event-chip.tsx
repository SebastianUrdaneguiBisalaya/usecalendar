import type { CalendarEvent } from "@usecalendar/core";
import { cn } from "../utils/cn.js";
import {
  DEFAULT_EVENT_COLOR,
  type EventLook,
  eventSurface,
} from "./event-style.js";

/** Class names for each part of an {@link EventChip}, merged after the defaults so they win. */
export type EventChipClassNames = {
  /** The colored dot of a timed event (not drawn for bars). */
  dot?: string;
  /** The outer element. */
  root?: string;
  /** The start time of a timed event (not drawn for bars). */
  time?: string;
  /** The event title. */
  title?: string;
};

/** Props of {@link EventChip}. */
export type EventChipProps<TData = unknown> = {
  /**
   * Draws a filled bar even for a timed event that fits in one day (e.g. in the all-day lane).
   *
   * @defaultValue false
   */
  bar?: boolean;
  /** Extra classes for the root element, merged after the defaults. */
  className?: string;
  /** Extra classes per part. */
  classNames?: EventChipClassNames;
  /**
   * Overrides the event's color.
   *
   * @defaultValue `event.color`, else the theme's muted foreground
   */
  color?: string;
  /**
   * The event continues in the next row/day: its right corners are squared.
   *
   * @defaultValue false
   */
  continuesAfter?: boolean;
  /**
   * The event started in a previous row/day: its left corners are squared.
   *
   * @defaultValue false
   */
  continuesBefore?: boolean;
  event: CalendarEvent<TData>;
  /** How the event reads at a glance (past, tentative); see `eventLook`. */
  look: EventLook;
  /**
   * Number of day columns the chip covers; anything over 1 is drawn as a bar.
   *
   * @defaultValue 1
   */
  span?: number;
  /** Start time of a timed event, already formatted (e.g. `"9:30 AM"`). Hidden on small screens. */
  time?: string;
};

/**
 * One event in a day cell (month view, all-day lane), styled like Google Calendar.
 *
 * All-day and multi-day events are filled bars spanning their days; timed events that fit in one day are a
 * colored dot, the start time and the title. Tentative events are striped (a ring instead of a dot), past
 * events are muted.
 *
 * The root element exposes its state as data attributes for styling: `data-variant` (`"bar"` | `"dot"`),
 * `data-past`, `data-tentative`, `data-continues-before`, `data-continues-after`.
 *
 * @example
 * <EventChip event={event} look={eventLook(event, Date.now())} time="9:30 AM" classNames={{ title: "font-semibold" }} />
 */
export function EventChip<TData = unknown>({
  bar = false,
  className,
  classNames,
  color,
  continuesAfter = false,
  continuesBefore = false,
  event,
  look,
  span = 1,
  time,
}: EventChipProps<TData>) {
  const tint = color ?? event.color ?? DEFAULT_EVENT_COLOR;
  const isBar =
    bar ||
    event.allDay === true ||
    span > 1 ||
    continuesBefore ||
    continuesAfter;
  const state = {
    "data-continues-after": continuesAfter || undefined,
    "data-continues-before": continuesBefore || undefined,
    "data-past": look.past || undefined,
    "data-tentative": look.tentative || undefined,
    "data-variant": isBar ? "bar" : "dot",
  };

  if (isBar) {
    return (
      <div
        {...state}
        className={cn(
          "flex h-full items-center truncate rounded-sm px-1.5 font-medium text-[0.7rem]",
          look.past ? "text-uc-muted-foreground" : "text-uc-foreground",
          continuesBefore && "rounded-l-none",
          continuesAfter && "rounded-r-none",
          classNames?.root,
          className,
        )}
        style={eventSurface(tint, look, 30).style}
      >
        <span className={cn("truncate", classNames?.title)}>{event.title}</span>
      </div>
    );
  }

  const { accent } = eventSurface(tint, look, 100);
  return (
    <div
      {...state}
      className={cn(
        "flex h-full items-center gap-1 truncate rounded-sm px-1 text-[0.7rem] text-uc-foreground",
        look.past && "text-uc-muted-foreground",
        classNames?.root,
        className,
      )}
    >
      {/* Too small to stripe: a tentative event's dot is a ring. */}
      <span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full border", classNames?.dot)}
        style={{
          backgroundColor: look.tentative ? "transparent" : accent,
          borderColor: accent,
        }}
      />
      {time !== undefined && (
        <span
          className={cn(
            "hidden shrink-0 text-uc-muted-foreground sm:inline",
            classNames?.time,
          )}
        >
          {time}
        </span>
      )}
      <span className={cn("truncate font-medium", classNames?.title)}>
        {event.title}
      </span>
    </div>
  );
}
