import type { CalendarEvent } from "@usecalendar/core";
import { cn } from "../utils/cn.js";
import { type EventLook, eventSurfaceProps } from "./event-style.js";

/** Class names for each part of an {@link EventBlock}, merged after the defaults so they win. */
export type EventBlockClassNames = {
  /** The outer element. */
  root?: string | undefined;
  /** The event's time span. */
  time?: string | undefined;
  /** The event title. */
  title?: string | undefined;
};

/** Props of {@link EventBlock}. */
export type EventBlockProps<TData = unknown> = {
  /** Extra classes for the root element, merged after the defaults. */
  className?: string | undefined;
  /** Extra classes per part. */
  classNames?: EventBlockClassNames | undefined;
  /**
   * Overrides the event's color.
   *
   * @defaultValue `event.color`, else the theme's muted foreground
   */
  color?: string | undefined;
  /**
   * The block is too short for two lines: the time goes next to the title instead of under it.
   *
   * @defaultValue false
   */
  compact?: boolean | undefined;
  /**
   * The event continues on the next day: its bottom corners are squared.
   *
   * @defaultValue false
   */
  continuesAfter?: boolean | undefined;
  /**
   * The event started on a previous day: its top corners are squared.
   *
   * @defaultValue false
   */
  continuesBefore?: boolean | undefined;
  /** The event to draw. */
  event: CalendarEvent<TData>;
  /** How the event reads at a glance (past, tentative); see `eventLook`. */
  look: EventLook;
  /** The event's time span, already formatted (e.g. `"9:00 – 10:30 AM"`). */
  time?: string | undefined;
};

/**
 * One timed event in the day and week views, styled like Google Calendar: a tinted block with an accent edge in the
 * event's color, the title and the time span. Tentative events are striped with a dashed edge, past ones muted.
 *
 * It fills its container; `TimeGridView` places it by time. Use it from `renderEvent` to keep the default look.
 * The fill comes from the stylesheet (`--uc-event-block-tint`, `--uc-event-block-past-tint` and the other
 * `--uc-event-*` variables); the root exposes `data-variant="block"`, `data-past` and `data-tentative`.
 *
 * @example
 * renderEvent={(block) => <EventBlock {...block} classNames={{ title: "font-semibold" }} />}
 */
export function EventBlock<TData = unknown>({
  className,
  classNames,
  color,
  compact = false,
  continuesAfter = false,
  continuesBefore = false,
  event,
  look,
  time,
}: EventBlockProps<TData>) {
  return (
    <div
      {...eventSurfaceProps(color ?? event.color, look, "block")}
      className={cn(
        "flex size-full overflow-hidden rounded-md border-l-[3px] px-1.5 py-0.5 text-left text-xs/tight shadow-[0_0_0_1px_var(--uc-background)] data-tentative:border-dashed",
        compact ? "flex-row items-baseline gap-1" : "flex-col",
        look.past ? "text-uc-muted-foreground" : "text-uc-foreground",
        continuesBefore && "rounded-t-none",
        continuesAfter && "rounded-b-none",
        classNames?.root,
        className,
      )}
    >
      <span className={cn("truncate font-medium", classNames?.title)}>
        {event.title}
      </span>
      {time !== undefined && (
        <span
          className={cn("truncate text-uc-muted-foreground", classNames?.time)}
        >
          {time}
        </span>
      )}
    </div>
  );
}
