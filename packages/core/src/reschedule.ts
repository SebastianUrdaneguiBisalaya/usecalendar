import type { TimeRange } from "./date-range.js";
import { MINUTES_PER_DAY } from "./day-layout.js";

/** Default grid step for dragging and keyboard changes: times land on quarter hours. */
export const SNAP_MINUTES = 15;

// `snapMinutes` must divide 60 evenly (5, 10, 15, 20, 30, 60), as Temporal's minute rounding requires.
const snap = (
  time: Temporal.ZonedDateTime,
  snapMinutes: number,
): Temporal.ZonedDateTime =>
  time.round({
    roundingIncrement: snapMinutes,
    smallestUnit: "minute",
  });

const toRange = (
  start: Temporal.ZonedDateTime,
  end: Temporal.ZonedDateTime,
): TimeRange => ({
  endAt: end.toInstant().toString(),
  startAt: start.toInstant().toString(),
});

/**
 * The wall-clock time `minute` minutes into `day` in `timeZone`. Minutes are rounded and clamped to the day;
 * {@link MINUTES_PER_DAY} is the next midnight.
 *
 * @example
 * wallTime(Temporal.PlainDate.from("2026-03-10"), 9 * 60 + 15, "America/Lima"); // 2026-03-10T09:15-05:00
 */
export const wallTime = (
  day: Temporal.PlainDate,
  minute: number,
  timeZone: string,
): Temporal.ZonedDateTime => {
  const clamped = Math.min(Math.max(Math.round(minute), 0), MINUTES_PER_DAY);
  return day
    .add({
      days: Math.floor(clamped / MINUTES_PER_DAY),
    })
    .toZonedDateTime({
      plainTime: Temporal.PlainTime.from({
        hour: Math.floor((clamped % MINUTES_PER_DAY) / 60),
        minute: clamped % 60,
      }),
      timeZone,
    });
};

/**
 * Shifts a range by whole days (keeping its wall-clock time in `timeZone`, even across DST changes) and by
 * minutes, then snaps the start to the grid. The duration doesn't change. Fractional values (from pointer
 * drags) are rounded. A shift that rounds to zero returns the range as given, unsnapped: dropping an event where
 * it was never moves it.
 *
 * @param snapMinutes - Grid step; must divide 60 evenly. Defaults to {@link SNAP_MINUTES}.
 */
export const moveRange = (
  range: TimeRange,
  by: {
    days: number;
    minutes: number;
  },
  timeZone: string,
  snapMinutes = SNAP_MINUTES,
): TimeRange => {
  if (Math.round(by.days) === 0 && Math.round(by.minutes) === 0)
    return {
      endAt: range.endAt,
      startAt: range.startAt,
    };
  const start = Temporal.Instant.from(range.startAt).toZonedDateTimeISO(
    timeZone,
  );
  const duration = Temporal.Instant.from(range.startAt).until(
    Temporal.Instant.from(range.endAt),
  );
  // Temporal only adds whole units; pointer drags measure fractional minutes.
  const moved = snap(
    start
      .add({
        days: Math.round(by.days),
      })
      .add({
        minutes: Math.round(by.minutes),
      }),
    snapMinutes,
  );
  return toRange(moved, moved.add(duration));
};

/**
 * Sets a new end, snapped to the grid and kept at least one step after the start. The start doesn't change.
 *
 * @param end - The new end, in the time zone the grid is shown in.
 * @param snapMinutes - Grid step; must divide 60 evenly. Defaults to {@link SNAP_MINUTES}.
 */
export const resizeRange = (
  range: TimeRange,
  end: Temporal.ZonedDateTime,
  snapMinutes = SNAP_MINUTES,
): TimeRange => {
  const start = Temporal.Instant.from(range.startAt).toZonedDateTimeISO(
    end.timeZoneId,
  );
  const snapped = snap(end, snapMinutes);
  const shortest = start.add({
    minutes: snapMinutes,
  });
  return toRange(
    start,
    Temporal.ZonedDateTime.compare(snapped, shortest) < 0 ? shortest : snapped,
  );
};

/**
 * The range swept between two minutes of `day` (in either order), widened to whole grid steps and at least
 * one step long. This is what a drag on empty slots proposes for a new event.
 *
 * @param snapMinutes - Grid step; must divide 60 evenly. Defaults to {@link SNAP_MINUTES}.
 */
export const sweepRange = (
  day: Temporal.PlainDate,
  fromMinute: number,
  toMinute: number,
  timeZone: string,
  snapMinutes = SNAP_MINUTES,
): TimeRange => {
  const first =
    Math.floor(Math.min(fromMinute, toMinute) / snapMinutes) * snapMinutes;
  const last =
    Math.ceil(Math.max(fromMinute, toMinute) / snapMinutes) * snapMinutes;
  const start = Math.min(Math.max(first, 0), MINUTES_PER_DAY - snapMinutes);
  return toRange(
    wallTime(day, start, timeZone),
    wallTime(day, Math.max(last, start + snapMinutes), timeZone),
  );
};

/**
 * A range of `durationMinutes` starting `minute` minutes into `day` in `timeZone`: what clicking an empty slot (or
 * Enter on it) proposes for a new event.
 *
 * @example
 * rangeAt(Temporal.PlainDate.from("2026-11-18"), 9 * 60, 60, "UTC"); // 09:00Z – 10:00Z
 */
export const rangeAt = (
  day: Temporal.PlainDate,
  minute: number,
  durationMinutes: number,
  timeZone: string,
): TimeRange => {
  const start = wallTime(day, minute, timeZone);
  return toRange(
    start,
    start.add({
      minutes: Math.max(1, Math.round(durationMinutes)),
    }),
  );
};
