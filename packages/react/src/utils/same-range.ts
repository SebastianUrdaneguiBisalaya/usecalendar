import type { TimeRange } from "@usecalendar/core";

const sameInstant = (a: string, b: string) =>
  a === b || Temporal.Instant.from(a).equals(Temporal.Instant.from(b));

/**
 * Whether two ranges cover the same instants. Compared by time, not as text: `…T15:00:00.000Z`, `…T15:00:00Z` and
 * `…T10:00:00-05:00` are the same instant.
 */
export const sameRange = (a: TimeRange, b: TimeRange) =>
  sameInstant(a.startAt, b.startAt) && sameInstant(a.endAt, b.endAt);
