import type { CalendarEvent } from "@usecalendar/core";

/** Payload the demo events carry in `data`, handed back untouched by every callback. */
export type DemoData = {
  /** Who organizes the event, to show `data` round-tripping through callbacks. */
  owner: string;
};

/** A demo event. */
export type DemoEvent = CalendarEvent<DemoData>;

/**
 * The fixed date every story opens on (a Wednesday), so layouts don't depend on today. It's far enough ahead that
 * the demo events don't turn "past" (muted) as time goes by; the past-events story uses the real today instead.
 */
export const DEMO_DATE = Temporal.PlainDate.from("2030-03-13");

/** The time the time-grid stories scroll to, so the demo events are in view. */
export const DEMO_SCROLL_TIME = Temporal.PlainTime.from("07:30");

/** Event colors: any CSS color works. */
export const COLORS = {
  amber: "#f59e0b",
  blue: "#3b82f6",
  emerald: "#10b981",
  indigo: "#6366f1",
  rose: "#f43f5e",
  sky: "#0ea5e9",
  violet: "#8b5cf6",
} as const;

/** The zone demo events are authored in: the browser's, so they land at round local times by default. */
const authorZone = (): string => Temporal.Now.timeZoneId();

/** A day relative to `base` (`DEMO_DATE` by default). */
export const demoDay = (
  offset: number,
  base: Temporal.PlainDate = DEMO_DATE,
): Temporal.PlainDate =>
  base.add({
    days: offset,
  });

const instant = (day: Temporal.PlainDate, time: string): string =>
  day
    .toZonedDateTime({
      plainTime: Temporal.PlainTime.from(time),
      timeZone: authorZone(),
    })
    .toInstant()
    .toString();

type EventExtras = Partial<
  Omit<DemoEvent, "endAt" | "id" | "startAt" | "title">
>;

/**
 * A timed event `minutes` long, starting at `time` (`"HH:MM"`) on `day`, authored in the browser's zone.
 *
 * @example
 * timed("standup", "Standup", demoDay(0), "09:00", 15)
 */
export const timed = (
  id: string,
  title: string,
  day: Temporal.PlainDate,
  time: string,
  minutes: number,
  extras: EventExtras = {},
): DemoEvent => {
  const startAt = instant(day, time);
  return {
    color: COLORS.indigo,
    data: {
      owner: "Ana",
    },
    endAt: Temporal.Instant.from(startAt)
      .add({
        minutes,
      })
      .toString(),
    id,
    startAt,
    title,
    ...extras,
  };
};

/** An all-day event covering `days` days from `day`. */
export const allDay = (
  id: string,
  title: string,
  day: Temporal.PlainDate,
  days = 1,
  extras: EventExtras = {},
): DemoEvent => ({
  allDay: true,
  color: COLORS.emerald,
  data: {
    owner: "Ana",
  },
  endAt: instant(
    day.add({
      days,
    }),
    "00:00",
  ),
  id,
  startAt: instant(day, "00:00"),
  timeZone: authorZone(),
  title,
  ...extras,
});

/** A typical week around `base`: meetings, focus blocks, an all-day event and a trip. */
export const weekEvents = (
  base: Temporal.PlainDate = DEMO_DATE,
): DemoEvent[] => [
  timed("standup-mon", "Standup", demoDay(-2, base), "09:00", 15),
  timed("standup-tue", "Standup", demoDay(-1, base), "09:00", 15),
  timed("standup-wed", "Standup", demoDay(0, base), "09:00", 15),
  timed("standup-thu", "Standup", demoDay(1, base), "09:00", 15),
  timed("design-review", "Design review", demoDay(0, base), "10:00", 90, {
    color: COLORS.violet,
    data: {
      owner: "Luis",
    },
  }),
  timed("lunch", "Lunch with Marta", demoDay(0, base), "13:00", 60, {
    color: COLORS.amber,
  }),
  timed("focus", "Focus time", demoDay(-1, base), "14:00", 120, {
    color: COLORS.sky,
  }),
  timed("1on1", "1:1 with Carla", demoDay(1, base), "11:30", 30, {
    color: COLORS.rose,
  }),
  timed("planning", "Sprint planning", demoDay(2, base), "15:00", 60, {
    status: "tentative",
  }),
  timed("gym", "Gym", demoDay(-2, base), "18:30", 60, {
    color: COLORS.emerald,
  }),
  allDay("holiday", "Company offsite", demoDay(1, base), 1),
  allDay("trip", "Trip to Cusco", demoDay(2, base), 4, {
    color: COLORS.amber,
  }),
];
