import { startOfWeek } from "./calendar-view.js";
import { instantMs } from "./day-layout.js";
import type { CalendarEvent } from "./event.js";
import type { WeekStart } from "./options.js";

/** The fields the layout needs from an event. Any {@link CalendarEvent} satisfies it. */
export type DatedItem = Pick<
  CalendarEvent,
  "allDay" | "endAt" | "id" | "startAt" | "timeZone"
>;

/**
 * The whole weeks (from `weekStart`) that cover `date`'s month: 4 to 6 rows of 7 days, including the
 * days of the previous and next months that complete the first and last rows.
 *
 * @example
 * monthWeeks(Temporal.PlainDate.from("2026-11-15"), "monday"); // 6 rows, 2026-10-26 … 2026-12-06
 */
export const monthWeeks = (
  date: Temporal.PlainDate,
  weekStart: WeekStart,
): Temporal.PlainDate[][] => {
  const first = date.with({
    day: 1,
  });
  const last = date.with({
    day: date.daysInMonth,
  });
  const weeks: Temporal.PlainDate[][] = [];
  for (
    let start = startOfWeek(first, weekStart);
    Temporal.PlainDate.compare(start, last) <= 0;
    start = start.add({
      weeks: 1,
    })
  ) {
    weeks.push(
      Array.from(
        {
          length: 7,
        },
        (_, index) =>
          start.add({
            days: index,
          }),
      ),
    );
  }
  return weeks;
};

/**
 * Week number of the week containing `date`.
 *
 * Weeks starting on Monday use ISO 8601 numbering (week 1 holds the year's first Thursday). Other week
 * starts count from the week containing January 1.
 */
export const weekNumber = (
  date: Temporal.PlainDate,
  weekStart: WeekStart,
): number => {
  if (weekStart === "monday") return date.weekOfYear ?? 1;
  const start = startOfWeek(date, weekStart);
  // The week belongs to the year of its last day, so the week holding January 1 is week 1.
  const firstWeek = startOfWeek(
    Temporal.PlainDate.from({
      day: 1,
      month: 1,
      year: start.add({
        days: 6,
      }).year,
    }),
    weekStart,
  );
  return start.since(firstWeek).days / 7 + 1;
};

/**
 * First and last calendar day an item covers when viewed in `timeZone`.
 *
 * The end is exclusive, so an item ending exactly at midnight stops the day before. All-day items are
 * read in their own `timeZone` (falling back to the viewer's), so they never shift a day for viewers
 * in other zones.
 */
export const itemDays = (
  item: DatedItem,
  timeZone: string,
): {
  first: Temporal.PlainDate;
  last: Temporal.PlainDate;
} => {
  const zone = item.allDay === true ? (item.timeZone ?? timeZone) : timeZone;
  const start = Temporal.Instant.from(item.startAt).toZonedDateTimeISO(zone);
  const end = Temporal.Instant.from(item.endAt).toZonedDateTimeISO(zone);
  const endDay = end.toPlainDate();
  const endsAtMidnight =
    end.toPlainTime().equals(Temporal.PlainTime.from("00:00")) &&
    Temporal.ZonedDateTime.compare(end, start) > 0;
  const last = endsAtMidnight
    ? endDay.subtract({
        days: 1,
      })
    : endDay;
  const first = start.toPlainDate();
  return {
    first,
    last: Temporal.PlainDate.compare(last, first) < 0 ? first : last,
  };
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * True for items drawn in the all-day lane above the time grid instead of in it: all-day items, and timed
 * items lasting 24 hours or more.
 */
export const belongsInAllDayLane = (
  item: Pick<DatedItem, "allDay" | "endAt" | "startAt">,
): boolean =>
  item.allDay === true ||
  Date.parse(item.endAt) - Date.parse(item.startAt) >= DAY_MS;

/** An item placed in one week row: the day columns it covers and the lane (row inside the week) it sits in. */
export type WeekSegment<T> = {
  /** The item ends after this row's last shown day. */
  continuesAfter: boolean;
  /** The item started before this row's first shown day. */
  continuesBefore: boolean;
  /** Index of the first shown day column it covers. */
  firstColumn: number;
  item: T;
  /** Lane index from the top, `0` first. */
  lane: number;
  /** Number of shown day columns it covers. */
  span: number;
};

/**
 * Lays out items over one week row of shown `days` (hidden weekends leave gaps in the dates).
 *
 * Items covering several days span their columns, clipped to the row; each item takes the first lane free on
 * all of them. Earlier and longer items get the top lanes, then all-day items, then by start time. Items
 * outside the row are left out.
 */
export const layoutWeek = <T extends DatedItem>(
  items: readonly T[],
  days: readonly Temporal.PlainDate[],
  timeZone: string,
): WeekSegment<T>[] => {
  const rowFirst = days[0];
  const rowLast = days.at(-1);
  if (rowFirst === undefined || rowLast === undefined) return [];
  // Rule out items far from the row with plain numbers before the (much slower) Temporal conversions. All-day items
  // are read in their own zone, up to a day away from `timeZone`, so the window has two days of slack each side.
  const windowFirst = rowFirst
    .subtract({
      days: 2,
    })
    .toZonedDateTime({
      timeZone,
    }).epochMilliseconds;
  const windowLast = rowLast
    .add({
      days: 3,
    })
    .toZonedDateTime({
      timeZone,
    }).epochMilliseconds;
  const placed = items.flatMap((item) => {
    if (
      instantMs(item.endAt) < windowFirst ||
      instantMs(item.startAt) > windowLast
    )
      return [];
    const { first, last } = itemDays(item, timeZone);
    const columns = days.flatMap((day, index) =>
      Temporal.PlainDate.compare(day, first) >= 0 &&
      Temporal.PlainDate.compare(day, last) <= 0
        ? [
            index,
          ]
        : [],
    );
    const firstColumn = columns[0];
    if (firstColumn === undefined) return [];
    const firstDay = days[firstColumn];
    const lastDay = days[firstColumn + columns.length - 1];
    return [
      {
        continuesAfter:
          lastDay !== undefined &&
          Temporal.PlainDate.compare(last, lastDay) > 0,
        continuesBefore:
          firstDay !== undefined &&
          Temporal.PlainDate.compare(first, firstDay) < 0,
        firstColumn,
        item,
        span: columns.length,
      },
    ];
  });

  placed.sort(
    (a, b) =>
      a.firstColumn - b.firstColumn ||
      b.span - a.span ||
      Number(b.item.allDay === true) - Number(a.item.allDay === true) ||
      instantMs(a.item.startAt) - instantMs(b.item.startAt) ||
      a.item.id.localeCompare(b.item.id),
  );

  const lanes: boolean[][] = [];
  return placed.map((segment) => {
    const columns = Array.from(
      {
        length: segment.span,
      },
      (_, index) => segment.firstColumn + index,
    );
    const free = lanes.findIndex((taken) =>
      columns.every((column) => !taken[column]),
    );
    const lane = free === -1 ? lanes.length : free;
    const taken = lanes[lane] ?? [];
    for (const column of columns) taken[column] = true;
    lanes[lane] = taken;
    return {
      ...segment,
      lane,
    };
  });
};

/**
 * Which segments fit in `maxLanes` lanes, and how many are left out per column.
 *
 * When a column needs more lanes than fit, its last lane shows "+N more" instead, so a segment in that
 * lane is only drawn if every column it covers fits.
 */
export const fitWeek = <T>(
  segments: readonly WeekSegment<T>[],
  columnCount: number,
  maxLanes: number,
): {
  hiddenByColumn: number[];
  shown: WeekSegment<T>[];
} => {
  const covers = (segment: WeekSegment<T>, column: number) =>
    column >= segment.firstColumn &&
    column < segment.firstColumn + segment.span;
  const lanesNeeded = Array.from(
    {
      length: columnCount,
    },
    (_, column) =>
      Math.max(
        0,
        ...segments
          .filter((segment) => covers(segment, column))
          .map((segment) => segment.lane + 1),
      ),
  );
  const fits = (segment: WeekSegment<T>) =>
    segment.lane < maxLanes - 1 ||
    (segment.lane === maxLanes - 1 &&
      lanesNeeded
        .slice(segment.firstColumn, segment.firstColumn + segment.span)
        .every((needed) => needed <= maxLanes));

  const shown = segments.filter(fits);
  const hiddenByColumn = Array.from(
    {
      length: columnCount,
    },
    (_, column) =>
      segments.filter((segment) => covers(segment, column) && !fits(segment))
        .length,
  );
  return {
    hiddenByColumn,
    shown,
  };
};
