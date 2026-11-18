/**
 * A half-open span of time between two ISO 8601 instants: `start` is inclusive, `end` is exclusive.
 *
 * Used for the range a view covers, e.g. to fetch the events to show.
 *
 * @example
 * { start: "2026-11-09T05:00:00.000Z", end: "2026-11-16T05:00:00.000Z" }
 */
export type DateRange = {
  /** Exclusive end, as an ISO 8601 instant. */
  end: string;
  /** Inclusive start, as an ISO 8601 instant. */
  start: string;
};

/**
 * The start and end of a single event, as ISO 8601 instants (`endAt` exclusive).
 *
 * This is what the calendar proposes when the user creates, moves or resizes an event.
 */
export type TimeRange = {
  /** Exclusive end, as an ISO 8601 instant. */
  endAt: string;
  /** Inclusive start, as an ISO 8601 instant. */
  startAt: string;
};

/**
 * True when the half-open interval `[startAt, endAt)` intersects `range`.
 *
 * Instants are compared by time, not as text, so any ISO 8601 offset (`Z`, `-05:00`, …) works.
 *
 * @example
 * overlapsRange("2026-11-10T14:00:00Z", "2026-11-10T15:00:00Z", weekRange); // true
 */
export const overlapsRange = (
  startAt: string,
  endAt: string,
  range: DateRange,
): boolean =>
  Date.parse(startAt) < Date.parse(range.end) &&
  Date.parse(endAt) > Date.parse(range.start);
