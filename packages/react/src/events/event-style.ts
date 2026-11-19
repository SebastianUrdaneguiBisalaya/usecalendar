import type { CalendarEvent } from "@usecalendar/core";
import type { CSSProperties } from "react";

/** How an event reads at a glance: tentative ones are striped, past ones are muted. */
export type EventLook = {
  /** The event has already ended. */
  past: boolean;
  /** The event's status is `"tentative"`. */
  tentative: boolean;
};

/** True once the event has ended. Always false while `now` is unknown (`null`, e.g. during SSR). */
export const isPast = (
  event: Pick<CalendarEvent, "endAt">,
  now: number | null,
): boolean => now !== null && Date.parse(event.endAt) <= now;

/**
 * The {@link EventLook} of an event at `now` (epoch milliseconds, or `null` while unknown).
 *
 * @example
 * eventLook(event, Date.now()); // { past: false, tentative: true }
 */
export const eventLook = (
  event: Pick<CalendarEvent, "endAt" | "status">,
  now: number | null,
): EventLook => ({
  past: isPast(event, now),
  tentative: event.status === "tentative",
});

/**
 * How an event surface is drawn: a filled `"bar"` (month view, all-day lane), a `"dot"` next to the time and title
 * (month view), or a `"block"` placed by time in the day and week views (a lighter fill with an accent edge).
 */
export type EventVariant = "bar" | "block" | "dot";

/** Attributes that give an element the built-in event look; see {@link eventSurfaceProps}. */
export type EventSurfaceProps = {
  /** Present once the event has ended. */
  "data-past"?: true;
  /** Present for tentative events. */
  "data-tentative"?: true;
  /** Marks the element for the stylesheet's event rules. */
  "data-uc-event": "";
  /** How the surface is drawn. */
  "data-variant": EventVariant;
  /** Sets `--uc-event-color` when the event has a color; nothing else. */
  style: CSSProperties;
};

/**
 * Attributes that give any element the built-in event look, so a custom `renderEvent` matches the default
 * events and follows the same `--uc-event-*` variables (tint, past tint, stripes) and light/dark theme.
 *
 * The look itself lives in the stylesheet: a `"bar"` element gets the tinted fill (striped when tentative,
 * muted when past); a `"block"` element the same with a lighter tint and its left border in the event color (give
 * it a width, e.g. `border-l-[3px]`); inside a `"dot"` element, add `data-uc-event-dot` to the dot.
 *
 * @param color - Any CSS color; omit it to use the theme's muted foreground.
 *
 * @example
 * <div {...eventSurfaceProps(event.color, eventLook(event, now), "bar")} className="rounded px-2">
 *   {event.title}
 * </div>
 */
export const eventSurfaceProps = (
  color: string | undefined,
  look: EventLook,
  variant: EventVariant,
): EventSurfaceProps => ({
  ...(look.past
    ? {
        "data-past": true,
      }
    : {}),
  ...(look.tentative
    ? {
        "data-tentative": true,
      }
    : {}),
  "data-uc-event": "",
  "data-variant": variant,
  style: (color === undefined
    ? {}
    : {
        "--uc-event-color": color,
      }) as CSSProperties,
});
