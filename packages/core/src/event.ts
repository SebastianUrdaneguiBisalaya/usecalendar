/** Every event status the calendar can draw. */
export const EVENT_STATUSES = [
  "confirmed",
  "tentative",
] as const;

/** `"tentative"` events are drawn with diagonal stripes; `"confirmed"` ones with a solid fill. */
export type EventStatus = (typeof EVENT_STATUSES)[number];

/**
 * An event to show on the calendar.
 *
 * The calendar only draws events: it never creates, stores or expands them. For recurring events, pass
 * each occurrence in the visible range as its own event with a unique `id`
 * (e.g. `` `${seriesId}:${startAt}` ``), and keep whatever you need to identify it in `data`.
 *
 * @typeParam TData - Your own payload, returned untouched in every callback (e.g. your database row).
 *
 * @example
 * const event: CalendarEvent<{ roomId: string }> = {
 *   id: "evt_1",
 *   title: "Design review",
 *   startAt: "2026-11-18T15:00:00Z",
 *   endAt: "2026-11-18T16:00:00Z",
 *   color: "#6366f1",
 *   data: { roomId: "room_42" },
 * };
 */
export type CalendarEvent<TData = unknown> = {
  /**
   * Draws the event in the all-day lane (week/day views) and as a bar (month view) instead of at its times.
   *
   * @defaultValue false
   */
  allDay?: boolean;
  /**
   * Any CSS color (`#6366f1`, `oklch(...)`, `var(--brand)`). The event's fill and accent are tinted from it.
   *
   * @defaultValue the theme's muted foreground color
   */
  color?: string;
  /** Your own payload for this event, handed back untouched in callbacks. */
  data?: TData;
  /** Exclusive end, as an ISO 8601 instant with an offset (`2026-11-18T16:00:00Z`). */
  endAt: string;
  /** Unique among the events passed to the calendar. Used for keys and keyboard focus. */
  id: string;
  /** Inclusive start, as an ISO 8601 instant with an offset (`2026-11-18T15:00:00Z`). */
  startAt: string;
  /** @defaultValue "confirmed" */
  status?: EventStatus;
  /**
   * IANA time zone an all-day event was created in. All-day events are dates, not instants: reading
   * them in this zone keeps them on the same calendar days for viewers in any other zone.
   *
   * @defaultValue the calendar's `timeZone`
   */
  timeZone?: string;
  /** Text shown on the event. */
  title: string;
};
