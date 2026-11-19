import type { CalendarEvent } from "./event.js";

/** Minutes in a calendar day on the wall clock (`24 * 60`). */
export const MINUTES_PER_DAY = 24 * 60;

/** The fields the day layout needs from an event. Any {@link CalendarEvent} satisfies it. */
export type TimedItem = Pick<CalendarEvent, "endAt" | "id" | "startAt">;

/** Where an item sits in one day column: minutes from midnight (wall clock in the time zone) and its lane. */
export type DaySegment<T extends TimedItem> = {
  /** Lane index (from the left) among the `columns` lanes shared by the items it overlaps with. */
  column: number;
  /** How many lanes its overlap group splits the column into. */
  columns: number;
  /** The item ends on a later day. */
  continuesAfter: boolean;
  /** The item started on an earlier day. */
  continuesBefore: boolean;
  /** Exclusive end minute; {@link MINUTES_PER_DAY} when the item runs past midnight. */
  endMinute: number;
  item: T;
  /** Start minute from midnight; `0` when the item started on an earlier day. */
  startMinute: number;
};

const minuteOfDay = (time: Temporal.ZonedDateTime): number =>
  time.hour * 60 + time.minute;

/**
 * Epoch milliseconds of an ISO 8601 instant, cheaply: `Date.parse` handles the usual forms, and anything it can't
 * read (e.g. more than millisecond precision in some engines) falls back to `Temporal`.
 */
export const instantMs = (iso: string): number => {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? Temporal.Instant.from(iso).epochMilliseconds : ms;
};

/**
 * Lays out the items that overlap `day` in `timeZone`, clipped to the day.
 *
 * Items that overlap in time share the width side by side, like Google Calendar: each group of transitively
 * overlapping items gets as many lanes as it needs at once, and each item takes the first free lane. Earlier
 * items go first; on ties the longer one takes the left lane.
 *
 * @param minMinutes - The shortest height the UI draws an item with, so items that are short in time but drawn
 * taller don't cover the next one.
 */
export const layoutDay = <T extends TimedItem>(
  items: readonly T[],
  day: Temporal.PlainDate,
  timeZone: string,
  minMinutes = 15,
): DaySegment<T>[] => {
  const dayStart = day.toZonedDateTime({
    timeZone,
  });
  const dayEnd = day
    .add({
      days: 1,
    })
    .toZonedDateTime({
      timeZone,
    });

  // Most items aren't on this day: rule them out with plain numbers before the (much slower) Temporal conversions.
  // `Date.parse` drops sub-millisecond digits, so keep a millisecond of slack; the exact check follows.
  const firstMs = dayStart.epochMilliseconds - 1;
  const lastMs = dayEnd.epochMilliseconds + 1;
  const segments = items.flatMap((item) => {
    if (instantMs(item.endAt) < firstMs || instantMs(item.startAt) > lastMs)
      return [];
    const start = Temporal.Instant.from(item.startAt).toZonedDateTimeISO(
      timeZone,
    );
    const end = Temporal.Instant.from(item.endAt).toZonedDateTimeISO(timeZone);
    if (
      Temporal.ZonedDateTime.compare(end, dayStart) <= 0 ||
      Temporal.ZonedDateTime.compare(start, dayEnd) >= 0
    )
      return [];

    const continuesBefore = Temporal.ZonedDateTime.compare(start, dayStart) < 0;
    const continuesAfter = Temporal.ZonedDateTime.compare(end, dayEnd) > 0;
    const startMinute = continuesBefore ? 0 : minuteOfDay(start);
    const endMinute =
      Temporal.ZonedDateTime.compare(end, dayEnd) >= 0
        ? MINUTES_PER_DAY
        : minuteOfDay(end);
    // A wall-clock end can fall before the start across a DST change; keep the item visible.
    return [
      {
        continuesAfter,
        continuesBefore,
        endMinute: Math.max(endMinute, startMinute + 1),
        item,
        startMinute,
      },
    ];
  });

  segments.sort(
    (a, b) =>
      a.startMinute - b.startMinute ||
      b.endMinute - a.endMinute ||
      a.item.id.localeCompare(b.item.id),
  );

  const visibleEnd = (segment: { endMinute: number; startMinute: number }) =>
    Math.min(
      MINUTES_PER_DAY,
      Math.max(segment.endMinute, segment.startMinute + minMinutes),
    );

  const laidOut: DaySegment<T>[] = [];
  let group: DaySegment<T>[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -1;

  const closeGroup = () => {
    for (const segment of group) segment.columns = laneEnds.length;
    laidOut.push(...group);
    group = [];
    laneEnds = [];
  };

  for (const segment of segments) {
    if (segment.startMinute >= groupEnd) closeGroup();
    const end = visibleEnd(segment);
    const free = laneEnds.findIndex(
      (laneEnd) => laneEnd <= segment.startMinute,
    );
    const column = free === -1 ? laneEnds.length : free;
    laneEnds[column] = end;
    groupEnd = Math.max(groupEnd, end);
    group.push({
      ...segment,
      column,
      columns: 0,
    });
  }
  closeGroup();

  return laidOut;
};
