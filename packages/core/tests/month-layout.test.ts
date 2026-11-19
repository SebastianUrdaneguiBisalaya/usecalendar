import { describe, expect, it } from "vitest";
import {
  belongsInAllDayLane,
  fitWeek,
  itemDays,
  layoutWeek,
  monthWeeks,
  weekNumber,
} from "../src/month-layout.js";

const date = (value: string) => Temporal.PlainDate.from(value);
const LIMA = "America/Lima"; // UTC-5, no DST.

/** A timed item from local Lima date-times, stored in UTC like real events. */
const timed = (id: string, start: string, end: string) => ({
  endAt: Temporal.PlainDateTime.from(end)
    .toZonedDateTime(LIMA)
    .toInstant()
    .toString(),
  id,
  startAt: Temporal.PlainDateTime.from(start)
    .toZonedDateTime(LIMA)
    .toInstant()
    .toString(),
});

/** An all-day item covering `first` to `last` (inclusive), created in `timeZone`. */
const allDay = (id: string, first: string, last: string, timeZone = LIMA) => ({
  allDay: true,
  endAt: date(last)
    .add({
      days: 1,
    })
    .toZonedDateTime({
      timeZone,
    })
    .toInstant()
    .toString(),
  id,
  startAt: date(first)
    .toZonedDateTime({
      timeZone,
    })
    .toInstant()
    .toString(),
  timeZone,
});

describe("monthWeeks", () => {
  it("covers the month with whole weeks from the first weekday", () => {
    const weeks = monthWeeks(date("2026-11-15"), "monday");
    expect(weeks).toHaveLength(6);
    expect(weeks[0]?.[0]?.toString()).toBe("2026-10-26");
    expect(weeks.at(-1)?.at(-1)?.toString()).toBe("2026-12-06");
  });

  it("a month that fits exactly takes four rows", () => {
    const weeks = monthWeeks(date("2026-02-01"), "sunday");
    expect(weeks).toHaveLength(4);
    expect(weeks[0]?.[0]?.toString()).toBe("2026-02-01");
  });

  it("every row has seven consecutive days", () => {
    for (const week of monthWeeks(date("2026-08-20"), "saturday")) {
      expect(week).toHaveLength(7);
      expect(week[0]?.until(week[6] ?? week[0]).days).toBe(6);
    }
  });
});

describe("weekNumber", () => {
  it("Monday weeks use ISO numbering", () => {
    expect(weekNumber(date("2026-11-15"), "monday")).toBe(46);
    // ISO puts January 1, 2027 (a Friday) in the last week of 2026.
    expect(weekNumber(date("2027-01-01"), "monday")).toBe(53);
  });

  it("other week starts count from the week holding January 1", () => {
    expect(weekNumber(date("2027-01-01"), "sunday")).toBe(1);
    expect(weekNumber(date("2026-12-27"), "sunday")).toBe(1);
    expect(weekNumber(date("2026-01-10"), "sunday")).toBe(2);
    expect(weekNumber(date("2026-01-03"), "saturday")).toBe(2);
  });
});

describe("itemDays", () => {
  it("a timed item ending at midnight stays on its day", () => {
    const days = itemDays(
      timed("a", "2026-11-15T22:00", "2026-11-16T00:00"),
      LIMA,
    );
    expect([
      days.first.toString(),
      days.last.toString(),
    ]).toEqual([
      "2026-11-15",
      "2026-11-15",
    ]);
  });

  it("a timed item is read in the viewer time zone", () => {
    const days = itemDays(
      timed("a", "2026-11-15T22:00", "2026-11-15T23:00"),
      "Asia/Tokyo",
    );
    expect(days.first.toString()).toBe("2026-11-16");
  });

  it("an all-day item keeps its dates in any time zone", () => {
    const days = itemDays(
      allDay("a", "2026-11-15", "2026-11-17"),
      "Asia/Tokyo",
    );
    expect([
      days.first.toString(),
      days.last.toString(),
    ]).toEqual([
      "2026-11-15",
      "2026-11-17",
    ]);
  });

  it("an all-day item without its own time zone is read in the viewer's", () => {
    const { timeZone: _, ...withoutZone } = allDay(
      "a",
      "2026-11-15",
      "2026-11-15",
    );
    const days = itemDays(withoutZone, LIMA);
    expect([
      days.first.toString(),
      days.last.toString(),
    ]).toEqual([
      "2026-11-15",
      "2026-11-15",
    ]);
  });

  it("an all-day item across a DST change keeps its days", () => {
    const days = itemDays(
      allDay("a", "2026-03-07", "2026-03-09", "America/New_York"),
      "America/New_York",
    );
    expect([
      days.first.toString(),
      days.last.toString(),
    ]).toEqual([
      "2026-03-07",
      "2026-03-09",
    ]);
  });

  it("accepts instants with any offset", () => {
    const days = itemDays(
      {
        endAt: "2026-11-15T23:30:00-05:00",
        id: "a",
        startAt: "2026-11-15T23:00:00-05:00",
      },
      LIMA,
    );
    expect(days.first.toString()).toBe("2026-11-15");
  });
});

describe("layoutWeek", () => {
  const week = monthWeeks(date("2026-11-15"), "monday")[2] ?? []; // Mon 9 … Sun 15
  const lanes = (segments: ReturnType<typeof layoutWeek>) =>
    Object.fromEntries(
      segments.map((segment) => [
        segment.item.id,
        [
          segment.firstColumn,
          segment.span,
          segment.lane,
        ],
      ]),
    );

  it("multi-day items span their columns and are clipped to the week", () => {
    const [segment] = layoutWeek(
      [
        allDay("trip", "2026-11-07", "2026-11-11"),
      ],
      week,
      LIMA,
    );
    expect(segment).toMatchObject({
      continuesAfter: false,
      continuesBefore: true,
      firstColumn: 0,
      span: 3,
    });
  });

  it("an item running past the week continues after it", () => {
    const [segment] = layoutWeek(
      [
        allDay("trip", "2026-11-14", "2026-11-18"),
      ],
      week,
      LIMA,
    );
    expect(segment).toMatchObject({
      continuesAfter: true,
      continuesBefore: false,
      firstColumn: 5,
      span: 2,
    });
  });

  it("items take the first lane free on every column they cover", () => {
    expect(
      lanes(
        layoutWeek(
          [
            allDay("long", "2026-11-10", "2026-11-13"),
            timed("wed", "2026-11-11T09:00", "2026-11-11T10:00"),
            timed("mon", "2026-11-09T09:00", "2026-11-09T10:00"),
            timed("fri", "2026-11-13T09:00", "2026-11-13T10:00"),
          ],
          week,
          LIMA,
        ),
      ),
    ).toEqual({
      fri: [
        4,
        1,
        1,
      ],
      long: [
        1,
        4,
        0,
      ],
      mon: [
        0,
        1,
        0,
      ],
      wed: [
        2,
        1,
        1,
      ],
    });
  });

  it("all-day items come before timed items of the same span", () => {
    const result = lanes(
      layoutWeek(
        [
          timed("meeting", "2026-11-11T08:00", "2026-11-11T09:00"),
          allDay("holiday", "2026-11-11", "2026-11-11"),
        ],
        week,
        LIMA,
      ),
    );
    expect(result).toEqual({
      holiday: [
        2,
        1,
        0,
      ],
      meeting: [
        2,
        1,
        1,
      ],
    });
  });

  it("orders by start time, not by text, when offsets differ", () => {
    // 13:00Z is earlier than 09:00-05:00 (14:00Z), though its text sorts after it.
    const result = lanes(
      layoutWeek(
        [
          {
            endAt: "2026-11-11T10:00:00-05:00",
            id: "later",
            startAt: "2026-11-11T09:00:00-05:00",
          },
          {
            endAt: "2026-11-11T13:30:00Z",
            id: "earlier",
            startAt: "2026-11-11T13:00:00Z",
          },
        ],
        week,
        LIMA,
      ),
    );
    expect(result).toEqual({
      earlier: [
        2,
        1,
        0,
      ],
      later: [
        2,
        1,
        1,
      ],
    });
  });

  it("items outside the week are left out", () => {
    expect(
      layoutWeek(
        [
          allDay("before", "2026-11-01", "2026-11-08"),
          timed("after", "2026-11-16T09:00", "2026-11-16T10:00"),
        ],
        week,
        LIMA,
      ),
    ).toEqual([]);
  });

  it("hidden weekend days are skipped", () => {
    const weekdays = week.filter((day) => day.dayOfWeek < 6);
    expect(
      layoutWeek(
        [
          allDay("weekend", "2026-11-14", "2026-11-15"),
        ],
        weekdays,
        LIMA,
      ),
    ).toEqual([]);
    expect(
      layoutWeek(
        [
          allDay("long", "2026-11-13", "2026-11-16"),
        ],
        weekdays,
        LIMA,
      )[0],
    ).toMatchObject({
      continuesAfter: true,
      firstColumn: 4,
      span: 1,
    });
  });
});

describe("fitWeek", () => {
  const segment = (
    id: string,
    firstColumn: number,
    span: number,
    lane: number,
  ) => ({
    continuesAfter: false,
    continuesBefore: false,
    firstColumn,
    item: id,
    lane,
    span,
  });

  it("shows everything when it fits", () => {
    const result = fitWeek(
      [
        segment("a", 0, 1, 0),
        segment("b", 0, 1, 1),
      ],
      7,
      2,
    );
    expect(result.shown.map((shown) => shown.item)).toEqual([
      "a",
      "b",
    ]);
    expect(result.hiddenByColumn).toEqual([
      0,
      0,
      0,
      0,
      0,
      0,
      0,
    ]);
  });

  it('a full column keeps its last lane for "+N more"', () => {
    const result = fitWeek(
      [
        segment("a", 0, 1, 0),
        segment("b", 0, 1, 1),
        segment("c", 0, 1, 2),
      ],
      7,
      2,
    );
    expect(result.shown.map((shown) => shown.item)).toEqual([
      "a",
    ]);
    expect(result.hiddenByColumn[0]).toBe(2);
  });

  it("a spanning item in the last lane hides where any of its columns overflows", () => {
    const result = fitWeek(
      [
        segment("a", 0, 1, 0),
        segment("b", 1, 1, 0),
        segment("span", 0, 2, 1),
        segment("c", 1, 1, 2),
      ],
      7,
      2,
    );
    expect(result.shown.map((shown) => shown.item)).toEqual([
      "a",
      "b",
    ]);
    expect(result.hiddenByColumn.slice(0, 2)).toEqual([
      1,
      2,
    ]);
  });

  it("an empty week hides nothing", () => {
    expect(fitWeek([], 5, 3)).toEqual({
      hiddenByColumn: [
        0,
        0,
        0,
        0,
        0,
      ],
      shown: [],
    });
  });
});

describe("belongsInAllDayLane", () => {
  it("all-day items and timed items of a day or more go in the lane", () => {
    expect(belongsInAllDayLane(allDay("a", "2026-11-15", "2026-11-15"))).toBe(
      true,
    );
    expect(
      belongsInAllDayLane(timed("day", "2026-11-15T10:00", "2026-11-16T10:00")),
    ).toBe(true);
    expect(
      belongsInAllDayLane(
        timed("trip", "2026-11-15T10:00", "2026-11-17T18:00"),
      ),
    ).toBe(true);
  });

  it("shorter timed items stay in the time grid, even across midnight", () => {
    expect(
      belongsInAllDayLane(
        timed("night", "2026-11-15T22:00", "2026-11-16T02:00"),
      ),
    ).toBe(false);
    expect(
      belongsInAllDayLane(
        timed("almost", "2026-11-15T10:00", "2026-11-16T09:59"),
      ),
    ).toBe(false);
  });
});

describe("layoutWeek's quick pre-filter", () => {
  it("keeps all-day items from zones a day away from the viewer's", () => {
    // Kiritimati is UTC+14, Pago Pago UTC-11: the all-day item's instants sit about a day before the viewer's dates.
    const zone = "Pacific/Kiritimati";
    const start = Temporal.PlainDate.from("2030-03-11").toZonedDateTime({
      timeZone: zone,
    });
    const week = Array.from(
      {
        length: 7,
      },
      (_, index) =>
        Temporal.PlainDate.from("2030-03-11").add({
          days: index,
        }),
    );
    const segments = layoutWeek(
      [
        {
          allDay: true,
          endAt: start
            .add({
              days: 1,
            })
            .toInstant()
            .toString(),
          id: "far",
          startAt: start.toInstant().toString(),
          timeZone: zone,
        },
      ],
      week,
      "Pacific/Pago_Pago",
    );
    expect(segments).toMatchObject([
      {
        firstColumn: 0,
        span: 1,
      },
    ]);
  });

  it("leaves out items far from the row", () => {
    const week = Array.from(
      {
        length: 7,
      },
      (_, index) =>
        Temporal.PlainDate.from("2030-03-11").add({
          days: index,
        }),
    );
    expect(
      layoutWeek(
        [
          {
            endAt: "2030-01-01T11:00:00Z",
            id: "january",
            startAt: "2030-01-01T10:00:00Z",
          },
        ],
        week,
        "UTC",
      ),
    ).toEqual([]);
  });
});
