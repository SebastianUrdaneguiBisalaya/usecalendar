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

/** Seeded pseudo-random numbers in [0, 1) (mulberry32), so stress stories always show the same events. */
const seeded = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Options of {@link stressEvents}. */
export type StressOptions = {
  /** Share of all-day events (1 to 5 days long). @defaultValue 0.15 */
  allDayShare?: number;
  /** Number of events. */
  count: number;
  /** Days to spread them over, starting `firstDay` days from `DEMO_DATE`. @defaultValue 7 */
  days?: number;
  /** Offset of the first day from `DEMO_DATE`. @defaultValue -2 (the Monday of the demo week) */
  firstDay?: number;
  /** Earliest and latest start hours of timed events. @defaultValue [7, 20] */
  hours?: readonly [
    number,
    number,
  ];
  /** @defaultValue 1 */
  seed?: number;
};

/**
 * Many deterministic events for stress stories: timed ones (15 minutes to 3 hours, overlapping a lot) and all-day
 * ones, in every demo color.
 */
export const stressEvents = ({
  allDayShare = 0.15,
  count,
  days = 7,
  firstDay = -2,
  hours = [
    7,
    20,
  ],
  seed = 1,
}: StressOptions): DemoEvent[] => {
  const next = seeded(seed);
  const palette = Object.values(COLORS);
  const [from, to] = hours;
  return Array.from(
    {
      length: count,
    },
    (_, index) => {
      const day = demoDay(firstDay + Math.floor(next() * days));
      const color = palette[index % palette.length] ?? COLORS.indigo;
      if (next() < allDayShare)
        return allDay(
          `stress-${index}`,
          `All-day ${index + 1}`,
          day,
          1 + Math.floor(next() * 5),
          {
            color,
          },
        );
      const hour = from + Math.floor(next() * (to - from));
      const minute = 15 * Math.floor(next() * 4);
      return timed(
        `stress-${index}`,
        `Event ${index + 1}`,
        day,
        `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
        15 * (1 + Math.floor(next() * 12)),
        {
          color,
          ...(next() < 0.1
            ? {
                status: "tentative" as const,
              }
            : {}),
        },
      );
    },
  );
};
