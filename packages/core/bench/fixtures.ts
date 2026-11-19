import type { CalendarEvent } from "../src/index.js";

/** The zone fixtures and benchmarks lay events out in. */
export const TIME_ZONE = "America/Lima";

/** A Wednesday; fixtures fill the weeks around it. */
export const BASE_DATE = Temporal.PlainDate.from("2030-03-13");

/** Seeded pseudo-random numbers in [0, 1) (mulberry32), so every run lays out the same events. */
const random = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Options of {@link makeEvents}. */
export type FixtureOptions = {
  /** Share of all-day events, some of them multi-day. @defaultValue 0.15 */
  allDayShare?: number;
  /** Number of events. */
  count: number;
  /** Days the events are spread over, from `BASE_DATE`'s week start. @defaultValue 7 */
  days?: number;
  /** @defaultValue 1 */
  seed?: number;
};

/**
 * Deterministic events spread over `days` days: timed ones between 07:00 and 20:00 (15 minutes to 3 hours, so many
 * overlap), and all-day ones spanning 1 to 5 days.
 */
export const makeEvents = ({
  allDayShare = 0.15,
  count,
  days = 7,
  seed = 1,
}: FixtureOptions): CalendarEvent[] => {
  const next = random(seed);
  const first = BASE_DATE.subtract({
    days: BASE_DATE.dayOfWeek - 1,
  });
  return Array.from(
    {
      length: count,
    },
    (_, index): CalendarEvent => {
      const day = first.add({
        days: Math.floor(next() * days),
      });
      if (next() < allDayShare) {
        const start = day.toZonedDateTime({
          timeZone: TIME_ZONE,
        });
        return {
          allDay: true,
          endAt: start
            .add({
              days: 1 + Math.floor(next() * 5),
            })
            .toInstant()
            .toString(),
          id: `event-${index}`,
          startAt: start.toInstant().toString(),
          title: `All-day ${index}`,
        };
      }
      const start = day.toZonedDateTime({
        plainTime: Temporal.PlainTime.from({
          hour: 7 + Math.floor(next() * 13),
          minute: 15 * Math.floor(next() * 4),
        }),
        timeZone: TIME_ZONE,
      });
      return {
        endAt: start
          .add({
            minutes: 15 * (1 + Math.floor(next() * 12)),
          })
          .toInstant()
          .toString(),
        id: `event-${index}`,
        startAt: start.toInstant().toString(),
        title: `Event ${index}`,
      };
    },
  );
};

/** The seven days of `BASE_DATE`'s week, Monday first. */
export const weekDays = (): Temporal.PlainDate[] => {
  const monday = BASE_DATE.subtract({
    days: BASE_DATE.dayOfWeek - 1,
  });
  return Array.from(
    {
      length: 7,
    },
    (_, index) =>
      monday.add({
        days: index,
      }),
  );
};
