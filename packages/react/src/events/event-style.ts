import type { CalendarEvent } from "@usecalendar/core";
import type { CSSProperties } from "react";

/** Color for events without their own `color`: the theme's muted foreground. */
export const DEFAULT_EVENT_COLOR = "var(--uc-muted-foreground)";

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
 * Fill and accent for an event tinted with `color`.
 *
 * Everything is mixed with the theme's `--uc-background` and `--uc-muted-foreground`, so it reads the same in
 * light and dark mode: confirmed events are a solid tint, tentative ones a lighter tint with diagonal stripes,
 * and past events lose half their tint and turn their accent grey. Useful to style a custom `renderEvent`
 * like the built-in events.
 *
 * @param strength - Tint percentage of `color` in the fill (0–100).
 * @returns `accent`: the color for dots, borders and stripes; `style`: background styles for the event's surface.
 */
export const eventSurface = (
  color: string,
  { past, tentative }: EventLook,
  strength: number,
): {
  accent: string;
  style: CSSProperties;
} => {
  const tint = past ? Math.round(strength / 2) : strength;
  const accent = past
    ? `color-mix(in oklab, ${color} 40%, var(--uc-muted-foreground))`
    : color;
  const style: CSSProperties = tentative
    ? {
        backgroundColor: `color-mix(in oklab, ${accent} ${Math.round(tint / 2)}%, var(--uc-background))`,
        backgroundImage: `repeating-linear-gradient(135deg, color-mix(in oklab, ${accent} ${tint}%, transparent) 0 0.25rem, transparent 0.25rem 0.5rem)`,
      }
    : {
        backgroundColor: `color-mix(in oklab, ${accent} ${tint}%, var(--uc-background))`,
      };
  return {
    accent,
    style,
  };
};
