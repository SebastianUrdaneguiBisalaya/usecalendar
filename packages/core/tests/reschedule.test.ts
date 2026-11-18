import { describe, expect, it } from "vitest";
import {
  moveRange,
  resizeRange,
  sweepRange,
  wallTime,
} from "../src/reschedule.js";

const LIMA = "America/Lima";
const NEW_YORK = "America/New_York";
const day = Temporal.PlainDate.from("2026-03-10");

describe("wallTime", () => {
  it("places minutes on the wall clock and maps the end of the day to the next midnight", () => {
    expect(
      wallTime(day, 9 * 60 + 15, LIMA)
        .toInstant()
        .toString(),
    ).toBe("2026-03-10T14:15:00Z");
    expect(
      wallTime(day, 24 * 60, LIMA)
        .toInstant()
        .toString(),
    ).toBe("2026-03-11T05:00:00Z");
  });

  it("rounds and clamps minutes to the day", () => {
    expect(
      wallTime(day, 9 * 60 + 14.6, LIMA)
        .toInstant()
        .toString(),
    ).toBe("2026-03-10T14:15:00Z");
    expect(wallTime(day, -30, LIMA).toInstant().toString()).toBe(
      "2026-03-10T05:00:00Z",
    );
    expect(
      wallTime(day, 30 * 60, LIMA)
        .toInstant()
        .toString(),
    ).toBe("2026-03-11T05:00:00Z");
  });
});

describe("moveRange", () => {
  const range = {
    endAt: "2026-03-10T15:00:00Z",
    startAt: "2026-03-10T14:00:00Z",
  }; // 9:00–10:00 in Lima

  it("moves by minutes and days, keeping the duration, in UTC", () => {
    expect(
      moveRange(
        range,
        {
          days: 1,
          minutes: 30,
        },
        LIMA,
      ),
    ).toEqual({
      endAt: "2026-03-11T15:30:00Z",
      startAt: "2026-03-11T14:30:00Z",
    });
  });

  it("snaps the start to 15 minutes", () => {
    expect(
      moveRange(
        range,
        {
          days: 0,
          minutes: 22,
        },
        LIMA,
      ).startAt,
    ).toBe("2026-03-10T14:15:00Z");
    expect(
      moveRange(
        {
          endAt: "2026-03-10T15:07:00Z",
          startAt: "2026-03-10T14:07:00Z",
        },
        {
          days: 0,
          minutes: 15,
        },
        LIMA,
      ),
    ).toEqual({
      endAt: "2026-03-10T15:15:00Z",
      startAt: "2026-03-10T14:15:00Z",
    });
  });

  it("snaps to a custom step", () => {
    expect(
      moveRange(
        range,
        {
          days: 0,
          minutes: 22,
        },
        LIMA,
        30,
      ).startAt,
    ).toBe("2026-03-10T14:30:00Z");
    expect(
      moveRange(
        range,
        {
          days: 0,
          minutes: 22,
        },
        LIMA,
        5,
      ).startAt,
    ).toBe("2026-03-10T14:20:00Z");
  });

  it("accepts the fractional minutes a pointer drag produces", () => {
    expect(
      moveRange(
        range,
        {
          days: 0,
          minutes: 22.37,
        },
        LIMA,
      ),
    ).toEqual({
      endAt: "2026-03-10T15:15:00Z",
      startAt: "2026-03-10T14:15:00Z",
    });
    expect(
      moveRange(
        range,
        {
          days: 0,
          minutes: -8.6,
        },
        LIMA,
      ).startAt,
    ).toBe("2026-03-10T13:45:00Z");
  });

  it("keeps the wall-clock time when moving across a DST change", () => {
    // 2026-03-07 9:00 EST → 2026-03-09 9:00 EDT.
    const moved = moveRange(
      {
        endAt: "2026-03-07T15:00:00Z",
        startAt: "2026-03-07T14:00:00Z",
      },
      {
        days: 2,
        minutes: 0,
      },
      NEW_YORK,
    );
    expect(moved).toEqual({
      endAt: "2026-03-09T14:00:00Z",
      startAt: "2026-03-09T13:00:00Z",
    });
  });

  it("accepts ranges with any offset", () => {
    expect(
      moveRange(
        {
          endAt: "2026-03-10T10:00:00-05:00",
          startAt: "2026-03-10T09:00:00-05:00",
        },
        {
          days: 0,
          minutes: 30,
        },
        LIMA,
      ),
    ).toEqual({
      endAt: "2026-03-10T15:30:00Z",
      startAt: "2026-03-10T14:30:00Z",
    });
  });
});

describe("resizeRange", () => {
  const range = {
    endAt: "2026-03-10T15:00:00Z",
    startAt: "2026-03-10T14:00:00Z",
  };

  it("sets the end, snapped to 15 minutes, without moving the start", () => {
    expect(resizeRange(range, wallTime(day, 11 * 60 + 8, LIMA))).toEqual({
      endAt: "2026-03-10T16:15:00Z",
      startAt: range.startAt,
    });
  });

  it("keeps at least one step after the start", () => {
    expect(resizeRange(range, wallTime(day, 8 * 60, LIMA)).endAt).toBe(
      "2026-03-10T14:15:00Z",
    );
    expect(resizeRange(range, wallTime(day, 8 * 60, LIMA), 30).endAt).toBe(
      "2026-03-10T14:30:00Z",
    );
  });

  it("can end on a later day", () => {
    expect(
      resizeRange(
        range,
        wallTime(
          day.add({
            days: 1,
          }),
          60,
          LIMA,
        ),
      ).endAt,
    ).toBe("2026-03-11T06:00:00Z");
  });
});

describe("sweepRange", () => {
  it("covers the swept minutes in whole 15-minute steps, in either direction", () => {
    const expected = {
      endAt: "2026-03-10T15:30:00Z",
      startAt: "2026-03-10T14:00:00Z",
    };
    expect(sweepRange(day, 9 * 60 + 5, 10 * 60 + 20, LIMA)).toEqual(expected);
    expect(sweepRange(day, 10 * 60 + 20, 9 * 60 + 5, LIMA)).toEqual(expected);
  });

  it("is at least one step long and stays inside the day", () => {
    expect(sweepRange(day, 9 * 60, 9 * 60, LIMA)).toEqual({
      endAt: "2026-03-10T14:15:00Z",
      startAt: "2026-03-10T14:00:00Z",
    });
    expect(sweepRange(day, 24 * 60, 24 * 60, LIMA)).toEqual({
      endAt: "2026-03-11T05:00:00Z",
      startAt: "2026-03-11T04:45:00Z",
    });
  });

  it("widens to a custom step", () => {
    expect(sweepRange(day, 9 * 60 + 5, 9 * 60 + 40, LIMA, 30)).toEqual({
      endAt: "2026-03-10T15:00:00Z",
      startAt: "2026-03-10T14:00:00Z",
    });
  });
});
