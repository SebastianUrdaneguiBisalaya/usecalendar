import { describe, expect, it } from "vitest";
import { instantMs, layoutDay, MINUTES_PER_DAY } from "../src/day-layout.js";

const day = Temporal.PlainDate.from("2026-11-15");
const LIMA = "America/Lima"; // UTC-5, no DST.

/** An item from local Lima times on 2026-11-15, stored in UTC like real events. */
const item = (
  id: string,
  start: string,
  end: string,
  endDay = "2026-11-15",
  startDay = "2026-11-15",
) => ({
  endAt: Temporal.PlainDateTime.from(`${endDay}T${end}`)
    .toZonedDateTime(LIMA)
    .toInstant()
    .toString(),
  id,
  startAt: Temporal.PlainDateTime.from(`${startDay}T${start}`)
    .toZonedDateTime(LIMA)
    .toInstant()
    .toString(),
});

const lanes = (segments: ReturnType<typeof layoutDay>) =>
  Object.fromEntries(
    segments.map((segment) => [
      segment.item.id,
      [
        segment.column,
        segment.columns,
      ],
    ]),
  );

describe("layoutDay", () => {
  it("places UTC instants at the local wall-clock time", () => {
    const [segment] = layoutDay(
      [
        {
          endAt: "2026-11-15T16:30:00.000Z",
          id: "a",
          startAt: "2026-11-15T15:00:00.000Z",
        },
      ],
      day,
      LIMA,
    );
    expect(segment).toMatchObject({
      endMinute: 11 * 60 + 30,
      startMinute: 10 * 60,
    });
  });

  it("the same instant lands at another hour in another time zone", () => {
    const [segment] = layoutDay(
      [
        {
          endAt: "2026-11-15T01:00:00.000Z",
          id: "a",
          startAt: "2026-11-15T00:00:00.000Z",
        },
      ],
      day,
      "Asia/Tokyo",
    );
    expect(segment?.startMinute).toBe(9 * 60);
  });

  it("accepts instants with any offset", () => {
    const [segment] = layoutDay(
      [
        {
          endAt: "2026-11-15T11:00:00-05:00",
          id: "a",
          startAt: "2026-11-15T10:00:00-05:00",
        },
      ],
      day,
      LIMA,
    );
    expect(segment).toMatchObject({
      endMinute: 11 * 60,
      startMinute: 10 * 60,
    });
  });

  it("skips items outside the day", () => {
    expect(
      layoutDay(
        [
          item("before", "08:00", "09:00", "2026-11-14", "2026-11-14"),
          item("after", "08:00", "09:00", "2026-11-16", "2026-11-16"),
        ],
        day,
        LIMA,
      ),
    ).toEqual([]);
  });

  it("an item ending exactly at midnight belongs only to the earlier day", () => {
    expect(
      layoutDay(
        [
          item("a", "23:00", "00:00", "2026-11-15", "2026-11-14"),
        ],
        day,
        LIMA,
      ),
    ).toEqual([]);
  });

  it("clips items that run across midnight", () => {
    const [segment] = layoutDay(
      [
        item("a", "22:00", "02:00", "2026-11-16"),
      ],
      day,
      LIMA,
    );
    expect(segment).toMatchObject({
      continuesAfter: true,
      continuesBefore: false,
      endMinute: MINUTES_PER_DAY,
      startMinute: 22 * 60,
    });
    const [next] = layoutDay(
      [
        item("a", "22:00", "02:00", "2026-11-16"),
      ],
      day.add({
        days: 1,
      }),
      LIMA,
    );
    expect(next).toMatchObject({
      continuesAfter: false,
      continuesBefore: true,
      endMinute: 2 * 60,
      startMinute: 0,
    });
  });

  it("keeps an item visible when DST makes its wall-clock end fall before its start", () => {
    // 2026-11-01 01:30 EDT → 01:10 EST (40 minutes later, but earlier on the wall clock).
    const [segment] = layoutDay(
      [
        {
          endAt: "2026-11-01T06:10:00Z",
          id: "a",
          startAt: "2026-11-01T05:30:00Z",
        },
      ],
      Temporal.PlainDate.from("2026-11-01"),
      "America/New_York",
    );
    expect(segment).toMatchObject({
      endMinute: 91,
      startMinute: 90,
    });
  });

  it("items that do not overlap each take the full width", () => {
    expect(
      lanes(
        layoutDay(
          [
            item("a", "09:00", "10:00"),
            item("b", "10:00", "11:00"),
          ],
          day,
          LIMA,
        ),
      ),
    ).toEqual({
      a: [
        0,
        1,
      ],
      b: [
        0,
        1,
      ],
    });
  });

  it("overlapping items sit side by side", () => {
    expect(
      lanes(
        layoutDay(
          [
            item("a", "09:00", "11:00"),
            item("b", "10:00", "12:00"),
            item("c", "10:30", "11:30"),
          ],
          day,
          LIMA,
        ),
      ),
    ).toEqual({
      a: [
        0,
        3,
      ],
      b: [
        1,
        3,
      ],
      c: [
        2,
        3,
      ],
    });
  });

  it("a lane is reused once its item has ended, within the same group", () => {
    // a overlaps b, b overlaps c, but a ends before c starts: c takes a's lane and the group keeps 2 lanes.
    expect(
      lanes(
        layoutDay(
          [
            item("a", "09:00", "10:00"),
            item("b", "09:30", "11:00"),
            item("c", "10:00", "10:30"),
          ],
          day,
          LIMA,
        ),
      ),
    ).toEqual({
      a: [
        0,
        2,
      ],
      b: [
        1,
        2,
      ],
      c: [
        0,
        2,
      ],
    });
  });

  it("very short items are spaced by their drawn height", () => {
    // 5-minute items drawn 15 minutes tall would cover each other if laid out by their real duration.
    expect(
      lanes(
        layoutDay(
          [
            item("a", "09:00", "09:05"),
            item("b", "09:05", "09:10"),
          ],
          day,
          LIMA,
        ),
      ),
    ).toEqual({
      a: [
        0,
        2,
      ],
      b: [
        1,
        2,
      ],
    });
    // With no minimum height they fit one after the other.
    expect(
      lanes(
        layoutDay(
          [
            item("a", "09:00", "09:05"),
            item("b", "09:05", "09:10"),
          ],
          day,
          LIMA,
          0,
        ),
      ),
    ).toEqual({
      a: [
        0,
        1,
      ],
      b: [
        0,
        1,
      ],
    });
  });

  it("on ties the longer item takes the left lane", () => {
    expect(
      lanes(
        layoutDay(
          [
            item("short", "09:00", "09:30"),
            item("long", "09:00", "11:00"),
          ],
          day,
          LIMA,
        ),
      ),
    ).toEqual({
      long: [
        0,
        2,
      ],
      short: [
        1,
        2,
      ],
    });
  });
});

describe("layoutDay's quick pre-filter", () => {
  it("keeps instants with more than millisecond precision and items touching the day by less than a millisecond", () => {
    const segments = layoutDay(
      [
        {
          endAt: "2026-11-15T05:00:00.000000001Z", // 00:00 in Lima plus one nanosecond
          id: "edge",
          startAt: "2026-11-14T20:00:00.5Z",
        },
        {
          endAt: "2026-11-15T15:30:00.123456789Z",
          id: "precise",
          startAt: "2026-11-15T15:00:00.123456789Z",
        },
      ],
      day,
      LIMA,
    );
    expect(segments.map((segment) => segment.item.id).sort()).toEqual([
      "edge",
      "precise",
    ]);
  });

  it("still leaves out items that end exactly when the day starts", () => {
    expect(
      layoutDay(
        [
          {
            endAt: "2026-11-15T05:00:00Z",
            id: "yesterday",
            startAt: "2026-11-15T03:00:00Z",
          },
        ],
        day,
        LIMA,
      ),
    ).toEqual([]);
  });
});

describe("instantMs", () => {
  it("reads ISO instants with any offset or precision", () => {
    expect(instantMs("2026-11-15T10:00:00Z")).toBe(Date.UTC(2026, 10, 15, 10));
    expect(instantMs("2026-11-15T05:00:00-05:00")).toBe(
      Date.UTC(2026, 10, 15, 10),
    );
    expect(instantMs("2026-11-15T10:00:00.123456789Z")).toBe(
      Date.UTC(2026, 10, 15, 10, 0, 0, 123),
    );
  });
});
